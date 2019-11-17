import ApolloClient from 'apollo-client';
import { createHttpLink } from 'apollo-link-http';
import { defaultDataIdFromObject, InMemoryCache } from 'apollo-cache-inmemory';
import { ApolloLink, Operation } from 'apollo-link';

import { createRuntimeDebug } from '../utils/runtimeDebug';
import { getUrlResolverError, getNetworkErrors, GqlErrors } from '../utils/apolloClientErrorHandlers';
import { ErrorResponse } from 'apollo-link-error';

const debug = createRuntimeDebug('createServerApolloClient');

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

export function createServerApolloClient(
    backend: string,
    links: ApolloLink[],
    req,
): [ApolloClient<any>, () => GqlErrors[]] {
    const errors: GqlErrors[] = [];

    const urlResolverError = getUrlResolverError(errors, debug);
    const networkErrors = getNetworkErrors(errors);

    const httpLink = createHttpLink({
        uri: `${backend}/graphql`,
        credentials: 'same-origin',
        useGETForQueries: true,
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
