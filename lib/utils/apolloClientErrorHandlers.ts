import { ApolloLink } from 'apollo-link';
import { UrlQueryInput, UrlQueryResult } from '../types';
import { onError } from 'apollo-link-error';
import { ErrorResponse } from 'apollo-link-error';
import { Operation } from 'apollo-link';

export enum GqlError {
    NotFound = 'NotFound',
    GqlError = 'GqlError',
    Network = 'Network',
    Redirect = 'Redirect',
}

export type GqlErrors =
    | {
          type: GqlError.NotFound;
          payload: { pathname: string };
      }
    | {
          type: GqlError.GqlError;
          payload: { message: string; locations: string; path: string; operation: Operation };
      }
    | {
          type: GqlError.Network;
          payload: {
              networkError: ErrorResponse['networkError'];
              operation: Operation;
          };
      }
    | RedirectError;

export type RedirectError = {
    type: GqlError.Redirect;
    payload: {
        status: number;
        url: string;
    };
};

export function getUrlResolverError(errors: GqlErrors[], debug: any) {
    return new ApolloLink((operation, forward) => {
        if (!forward) {
            return null;
        }
        return forward(operation).map(data => {
            switch (operation.operationName) {
                case 'resolveUrl': {
                    const vars = operation.variables as UrlQueryInput;
                    const response = data.data as { urlResolver: UrlQueryResult };
                    if (response.urlResolver === null) {
                        errors.push({
                            type: GqlError.NotFound,
                            payload: {
                                pathname: vars.urlKey!,
                            },
                        });
                    } else if (response.urlResolver.type === 'REDIRECT') {
                        errors.push({
                            type: GqlError.Redirect,
                            payload: {
                                status: response.urlResolver.redirect_type!,
                                url: response.urlResolver.redirect_url!,
                            },
                        });
                    } else {
                        debug(vars.urlKey, response.urlResolver.type);
                    }
                    break;
                }
                case 'productDetail': {
                    debug(operation.variables);
                    break;
                }
                default:
                    return data;
            }
            return data;
        });
    });
}

export function getNetworkErrors(errors: GqlErrors[]) {
    return onError(({ graphQLErrors, networkError, operation }) => {
        if (graphQLErrors) {
            graphQLErrors.map(({ message, locations, path }) => {
                console.log(`[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`);
                errors.push({
                    type: GqlError.GqlError,
                    payload: { message, locations, path, operation },
                });
            });
        }

        if (networkError) {
            errors.push({
                type: GqlError.Network,
                payload: {
                    networkError,
                    operation,
                },
            });
        }
    });
}
