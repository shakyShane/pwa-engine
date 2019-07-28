import { ApolloClient } from 'apollo-client';
import { ApolloLink } from 'apollo-link';
import { defaultDataIdFromObject, InMemoryCache } from 'apollo-cache-inmemory';
import { createHttpLink } from 'apollo-link-http';

/**
 * @param apiBase
 * @param links
 * @param initialState
 */
export function getBrowserApolloClient(apiBase: string, links: ApolloLink[], initialState?: any): ApolloClient<any> {
    const httpLink = createHttpLink({
        uri: apiBase,
    });

    const apolloClient = new ApolloClient({
        link: ApolloLink.from([...links, httpLink]),
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
    });

    return apolloClient;
}
