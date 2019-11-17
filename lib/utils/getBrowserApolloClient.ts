import { ApolloClient } from 'apollo-client';
import { ApolloLink } from 'apollo-link';
import { defaultDataIdFromObject, InMemoryCache } from 'apollo-cache-inmemory';
import { createRuntimeDebug } from './runtimeDebug';
import { getUrlResolverError, getNetworkErrors, GqlErrors } from './apolloClientErrorHandlers';

const debug = createRuntimeDebug('getBrowserApolloClient');

/**
 * @param apiBase
 * @param links
 * @param initialState
 */
export function getBrowserApolloClient(
    links: ApolloLink[],
    initialState?: any,
): [ApolloClient<any>, () => GqlErrors[]] {
    const errors: GqlErrors[] = [];

    const urlResolverError = getUrlResolverError(errors, debug);
    const networkErrors = getNetworkErrors(errors);

    return [
        new ApolloClient({
            link: ApolloLink.from([urlResolverError, networkErrors, ...links]),
            cache: new InMemoryCache({
                dataIdFromObject: (object: any) => {
                    switch (object.__typename) {
                        case 'EntityUrl':
                            return `${object.type}-${object.id}`; // use `type + id` as the primary key
                        default:
                            return defaultDataIdFromObject(object); // fall back to default handling
                    }
                },
            }).restore(initialState),
        }),
        () => errors,
    ];
}
