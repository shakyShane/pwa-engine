import { ApolloLink } from 'apollo-link';
import { GetSsrAppParams, RouteData } from '..';
import { getSSRMiddleware } from './ssrMiddleware';

export * from './ssrMiddleware';
export { getSsrInit } from './ssrSetup';
export { getSSRMiddleware };
export interface SSRServerSetup<EnvVars = {}> {
    getSsrApp(params: GetSsrAppParams): [JSX.Element];
    links: ApolloLink[];
    routes: RouteData[];
    urlQuery: { [index: string]: any };
    getSSRMiddleware: typeof getSSRMiddleware;
    errorHtml<E extends Error>(params: { error?: E; displayError?: boolean }): string;
    afterBodyStart(vars: EnvVars): string;
    beforeBodyEnd(vars: EnvVars): string;
}
