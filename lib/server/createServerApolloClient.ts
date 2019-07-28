import ApolloClient from 'apollo-client';
import { createHttpLink } from 'apollo-link-http';
import { defaultDataIdFromObject, InMemoryCache } from 'apollo-cache-inmemory';
import { ErrorResponse, onError } from 'apollo-link-error';
import { ApolloLink, Operation } from 'apollo-link';

import { UrlQueryInput, UrlQueryResult } from '../types';
import { createRuntimeDebug } from '../utils/runtimeDebug';

const debug = createRuntimeDebug('createServerApolloClient');

export enum GqlError {
    NotFound = 'NotFound',
    GqlError = 'GqlError',
    Network = 'Network',
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
      };

export function createServerApolloClient(
    backend: string,
    links: ApolloLink[],
    req,
): [ApolloClient<any>, () => GqlErrors[]] {
    const errors: GqlErrors[] = [];

    const urlResolverError = new ApolloLink((operation, forward) => {
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

    const networkErrors = onError(({ graphQLErrors, networkError, operation }) => {
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

    const httpLink = createHttpLink({
        uri: `${backend}/graphql`,
        credentials: 'same-origin',
        headers: {
            cookie: req.header('Cookie'),
        },
    });

    return [
        new ApolloClient({
            ssrMode: true,
            // Remember that this is the interface the SSR server will use to connect to the
            // API server, so we need to ensure it isn't firewalled, etc
            link: ApolloLink.from([...links, urlResolverError, networkErrors, httpLink]),
            cache: new InMemoryCache({
                dataIdFromObject: (object: any) => {
                    if (object.__typename === 'EntityUrl') {
                        return `${object.type}-${object.id}`; // use `type + id` as the primary key
                    }
                    return defaultDataIdFromObject(object); // fall back to default handling
                },
            }),
        }),
        () => errors,
    ];
}
