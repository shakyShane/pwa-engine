import ApolloClient from 'apollo-client';
import { createHttpLink } from 'apollo-link-http';
import { defaultDataIdFromObject, InMemoryCache } from 'apollo-cache-inmemory';
import { ApolloLink } from 'apollo-link';

import { createRuntimeDebug } from '../utils/runtimeDebug';
import { getUrlResolverError, getNetworkErrors, GqlErrors } from '../utils/apolloClientErrorHandlers';

const debug = createRuntimeDebug('createServerApolloClient');

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
