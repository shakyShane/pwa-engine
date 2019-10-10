import { JSXElementConstructor } from 'react';
import { ApolloLink } from 'apollo-link';

import { getBrowserApolloClient } from './utils/getBrowserApolloClient';
import { resolve, resolveWeak } from './utils/resolve';
import { registerRuntime } from './feature/runtime.register';
import { createWriter } from './utils/writeUrls';
import { RouteData } from './utils/getKnownRoute';

export interface CreateRunTimeParams {
    links: ApolloLink[];
    components: {
        OfflineComponent: JSXElementConstructor<any>;
        ErrorComponent: JSXElementConstructor<any>;
        OutdatedComponent: JSXElementConstructor<any>;
        NotFoundComponent: JSXElementConstructor<any>;
    };
    loaderFn(componentName): Promise<any>;
    knownRoutes: RouteData[];
    urlQuery: any;
    initialState?: any;
}

export function createRuntime(params: CreateRunTimeParams) {
    const apolloClient = getBrowserApolloClient(params.links, params.initialState);
    const resolveFn = resolve(params, apolloClient);
    const urlWriter = createWriter(apolloClient, params.urlQuery);

    return {
        apolloClient,
        resolveWeak: resolveWeak(params, apolloClient),
        resolve: resolve(params, apolloClient),
        registerRuntime: registerRuntime(resolveFn, urlWriter),
        writeUrls: urlWriter,
    };
}
