// import { createRuntimeDebug } from './runtimeDebug';
import { GqlErrors } from './apolloClientErrorHandlers';
import { Client, createClient } from 'urql';

// const debug = createRuntimeDebug('getBrowserApolloClient');

/**
 * @param apiBase
 * @param links
 * @param initialState
 */
export function getBrowserUrqlClient(
    // @ts-ignore
    links: any[],
    // @ts-ignore
    initialState?: any,
): [Client, () => GqlErrors[]] {
    const errors: GqlErrors[] = [];

    // const urlResolverError = getUrlResolverError(errors, debug);
    // const networkErrors = getNetworkErrors(errors);

    const client = createClient({
        url: '/graphql',
    });

    return [client, () => errors];
}
