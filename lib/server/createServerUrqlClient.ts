import { createRuntimeDebug } from '../utils/runtimeDebug';
import { getUrlResolverError, getNetworkErrors, GqlErrors } from '../utils/apolloClientErrorHandlers';
import { Client, dedupExchange, cacheExchange, fetchExchange, Exchange } from 'urql';

const debug = createRuntimeDebug('createServerApolloClient');

export function createServerUrqlClient(backend: string, links: Exchange[]): [Client, () => GqlErrors[]] {
    const errors: GqlErrors[] = [];

    // @ts-ignore
    const _urlResolverError = getUrlResolverError(errors, debug);
    // @ts-ignore
    const _networkErrors = getNetworkErrors(errors);

    const client = new Client({
        url: `${backend}/graphql`,
        exchanges: [dedupExchange, cacheExchange].concat(links).concat(fetchExchange),
        // ...
        suspense: !(process as any).browser,
    });

    return [client, () => errors];
}
