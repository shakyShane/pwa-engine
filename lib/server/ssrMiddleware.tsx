import { join } from 'path';

import { renderToStringWithData } from 'react-apollo';
import { ApolloLink } from 'apollo-link';
import { Helmet } from 'react-helmet';
import { defer, of } from 'rxjs';
import { take, mergeMap, tap } from 'rxjs/operators';
import debugPkg from 'debug';
import { ApolloClient } from 'apollo-client';

import { convertDataToResolved, fetchFromKnownOrNetwork } from '../utils/fetchFromKnownOrNetwork';
import { ResolvedUrl } from '../utils/resolve';
import { RouteData } from '../';

import { renderShell } from './renderShell';
import { getAssetsForType, getCriticalAssets, getJsEntryPointFilePaths, Stats } from './getCriticalAssets';
import { createServerApolloClient } from './createServerApolloClient';
import { getStatusFromErrors } from './getStatusFromErrors';

const debug = debugPkg('jh-runtime:getSSRMiddleware');

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
    baseDir: string;
    distDir: string;
    legacyDir: string;
    backend: string;
    domain: string;
    version: string;
    afterBodyStart: string;
    beforeBodyEnd: string;
    getSsrApp(params: GetSsrAppParams): [JSX.Element];
    knownRoutes: RouteData[];
    links: ApolloLink[];
    urlQuery: any;
}) {
    let {
        stats,
        legacyStats,
        baseDir,
        backend,
        domain,
        distDir,
        legacyDir,
        version,
        afterBodyStart,
        beforeBodyEnd,
        getSsrApp,
        knownRoutes,
        links,
        urlQuery,
    } = parameters;
    const criticalAssets = getCriticalAssets(stats, join(baseDir, distDir));
    const noneCriticalJs = getJsEntryPointFilePaths(stats);

    // const legacyCriticalAssets = getCriticalAssets(legacyStats, join(baseDir, distDir + '-ie'));
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
                    const [App] = getSsrApp({ client, resolvedUrl, domain, version, rawPath: req.url });
                    return defer(() => renderToStringWithData(App)).pipe(
                        mergeMap(content => {
                            const initialState = client.extract();
                            const helmet = Helmet.renderStatic();
                            const assetsForType = getAssetsForType([resolvedUrl.componentName], stats);

                            debug(`assetsForType=${resolvedUrl.componentName}`, assetsForType);

                            const legacyAssetsForType = getAssetsForType([resolvedUrl.componentName], legacyStats);
                            const errors = getErrors();

                            const status = getStatusFromErrors(errors);

                            const html = renderShell({
                                content: content,
                                state: initialState,
                                criticalCss: criticalAssets.css,
                                css: assetsForType.css.map(x => join(distDir, x)),
                                js: assetsForType.js.concat(noneCriticalJs).map(x => join(distDir, x)),
                                legacyJs: legacyNoneCriticalJs
                                    .concat(legacyAssetsForType.js)
                                    .map(x => join(legacyDir, x)),
                                title: helmet.title.toString(),
                                link: helmet.link.toString(),
                                meta: helmet.meta.toString(),
                                beforeBodyEnd,
                                afterBodyStart,
                                domain,
                                version,
                            });
                            return of({ html, status });
                        }),
                    );
                }),
                take(1),
            )
            .subscribe({
                next: ({ html, status }) => {
                    res.status(status);
                    res.send(`<!doctype html>\n${html}`);
                },
                complete: () => {
                    res.end();
                },
                error: e => {
                    console.error('A failure occurred during SSR for req.url: ', req.url);
                    console.error(e);

                    res.status(500);
                    res.send(`<html>
                <head>
                    <title>An error occurred</title>
                    <style>
                        ${criticalAssets.css}
                    </style>
                </head>
<body>
<div class="well">
    <div class="container">
        <h1>An error occurred</h1>
        <p>
            Please try again later
        </p>
    </div>
</div>
<div class="wrapper">
    <div class="container">
<details>
    <summary>Show error</summary>
    <pre><code>${e}</code></pre>
    <pre><code>${e.stack}</code></pre>
</details>
</div>
</div>
</body>
</html>`);
                },
            });
    };
}
