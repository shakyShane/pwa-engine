import { join } from 'path';

import { renderToStringWithData } from '@apollo/react-ssr';
import { ApolloLink } from 'apollo-link';
import { Helmet } from 'react-helmet';
import { defer, of } from 'rxjs';
import { take, mergeMap, tap } from 'rxjs/operators';
import { ApolloClient } from 'apollo-client';

import { convertDataToResolved, fetchFromKnownOrNetwork } from '../utils/fetchFromKnownOrNetwork';
import { ResolvedUrl } from '../utils/resolve';
import { RouteData } from '../';

import { renderShell } from './renderShell';
import {
    CriticalAssets,
    getAssetsForType,
    getCriticalAssets,
    getJsEntryPointFilePaths,
    Stats,
} from './getCriticalAssets';
import { createServerApolloClient } from './createServerApolloClient';
import { getStatusFromErrors } from './getStatusFromErrors';
import { createRuntimeDebug } from '../utils/runtimeDebug';
import { RedirectError, GqlError } from '../utils/apolloClientErrorHandlers';

const debug = createRuntimeDebug('getSSRMiddleware');

export interface GetSsrAppParams {
    client: ApolloClient<any>;
    resolvedUrl: ResolvedUrl;
    domain: string;
    version: string;
    rawPath: string;
}

export function getSSRMiddleware(parameters: {
    stats: Stats;
    legacyStats: Stats;
    assetPrefix: string;
    legacyAssetPrefix: string;
    distDir: string;
    backend: string;
    domain: string;
    version: string;
    afterBodyStart: string;
    beforeBodyEnd: string;
    getSsrApp(params: GetSsrAppParams): [JSX.Element];
    knownRoutes: RouteData[];
    links: ApolloLink[];
    urlQuery: any;
    errorHtml(params: { criticalAssets: CriticalAssets; error: Error }): string;
}) {
    let {
        stats,
        legacyStats,
        backend,
        domain,
        distDir,
        version,
        afterBodyStart,
        beforeBodyEnd,
        getSsrApp,
        knownRoutes,
        links,
        urlQuery,
        assetPrefix,
        legacyAssetPrefix,
        errorHtml,
    } = parameters;
    const criticalAssets = getCriticalAssets(stats, distDir);
    const noneCriticalJs = getJsEntryPointFilePaths(stats);

    const legacyNoneCriticalJs = getJsEntryPointFilePaths(legacyStats);

    return function(req, res, next) {
        /**
         * Parse the user-agent to decide whether or not to support the
         * modern loading of JS
         */
        const match = req.url.match(/^\/(?:(.*)\.html)?/);
        const isAsset = req.url.match(/\.(map|ico)$/);
        if (!match || isAsset) {
            return next();
        }

        const [pathname] = req.url.split('?');

        debug('Node is handling a request for', req.url);

        const [client, getErrors] = createServerApolloClient(backend, links, req);

        fetchFromKnownOrNetwork(pathname, client, knownRoutes, urlQuery)
            .pipe(
                mergeMap(resp => convertDataToResolved(resp)),
                tap(x => debug('convertDataToResolved(resp)', x)),
                mergeMap(resolvedUrl => {
                    const errors = getErrors();
                    if (errors.length) {
                        const redirect = errors.find(x => x.type === GqlError.Redirect) as RedirectError;
                        if (redirect) {
                            return of({ html: '', status: redirect.payload.status, redirect: redirect.payload.url });
                        }
                    }

                    const [App] = getSsrApp({ client, resolvedUrl, domain, version, rawPath: req.url });
                    return defer(() => renderToStringWithData(App)).pipe(
                        mergeMap(content => {
                            const errors = getErrors();
                            const status = getStatusFromErrors(errors);

                            const initialState = client.extract();
                            const helmet = Helmet.renderStatic();
                            const assetsForType = getAssetsForType([resolvedUrl.componentName], stats);

                            debug(`assetsForType=${resolvedUrl.componentName}`, assetsForType);

                            const legacyAssetsForType = getAssetsForType([resolvedUrl.componentName], legacyStats);

                            const html = renderShell({
                                content: content,
                                state: initialState,
                                criticalCss: criticalAssets.css,
                                css: assetsForType.css.map(x => join(assetPrefix, x)),
                                js: assetsForType.js.concat(noneCriticalJs).map(x => join(assetPrefix, x)),
                                legacyJs: legacyNoneCriticalJs
                                    .concat(legacyAssetsForType.js)
                                    .map(x => join(legacyAssetPrefix, x)),
                                title: helmet.title.toString(),
                                link: helmet.link.toString(),
                                meta: helmet.meta.toString(),
                                beforeBodyEnd,
                                afterBodyStart,
                                domain,
                                version,
                            });
                            return of({ html, status, redirect: false });
                        }),
                    );
                }),
                take(1),
            )
            .subscribe({
                next: ({ html, status, redirect }) => {
                    if (redirect) {
                        res.status(status)
                            .redirect(redirect)
                            .send();
                    } else {
                        res.status(status);
                        res.send(`<!doctype html>\n${html}`);
                    }
                },
                complete: () => {
                    res.end();
                },
                error: e => {
                    console.error('A failure occurred during SSR for req.url: ', req.url);
                    console.error(e, typeof e);

                    res.status(500);
                    res.send(errorHtml({ criticalAssets, error: e }));
                },
            });
    };
}
