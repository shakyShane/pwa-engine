import { defer, EMPTY, Observable, of } from 'rxjs';
import { catchError, map, mergeMap, tap, withLatestFrom } from 'rxjs/operators';
import ApolloClient from 'apollo-client';
import { JSXElementConstructor } from 'react';
import debugPkg from 'debug';

import { CreateRunTimeParams } from '../runtime';

import { convertDataToResolved, FetchedData, fetchFromKnownOrNetwork } from './fetchFromKnownOrNetwork';
import { getKnownRoute } from './getKnownRoute';
import {UrlQueryInput, UrlQueryResult} from "../types";

const debug = debugPkg(`jh-runtime:resolve`);

export const NOTFOUND_CMP = 'NotFound';
export const ERROR_CMP = 'Error';
export const ERROR_TYPE = 'ERROR';
export const OUTDATED_TYPE = 'OUTDATED';

export interface RootComponentProps {
    id: number | null;
    pathname: string;
}

export interface ResolvedUrl {
    urlKey: string;
    componentName: string;
    id: null | number;
}

export interface ResolvedComponent extends ResolvedUrl {
    Cmp: JSXElementConstructor<RootComponentProps | any> | null;
}

export type ResolveFn = (
    pathname: string,
    online$: Observable<boolean>,
    outdated$: Observable<boolean>,
) => Observable<ResolvedComponent>;

export function resolve(params: CreateRunTimeParams, client: ApolloClient<any>) {
    /**
     * Using the current pathname, try to resolve into a known component
     *
     * @param pathname
     * @param outdated$
     */
    function createInputStream(pathname: string, outdated$: Observable<boolean>): Observable<FetchedData> {
        return of(pathname).pipe(
            tap(() => debug('props->pathname +++', pathname)),
            withLatestFrom(outdated$),
            mergeMap(([urlKey, outdated]: [string, boolean]) => {
                if (outdated) {
                    debug('the current codebase is outdated');
                    return of(fetchedDataStub(urlKey, OUTDATED_TYPE));
                }
                return fetchFromKnownOrNetwork(urlKey, client, params.knownRoutes, params.urlQuery);
            }),
            catchError(e => {
                debug('fetchFromKnownOrNetwork gave an error', e);
                return of(fetchedDataStub(pathname, ERROR_TYPE));
            }),
        );
    }

    /**
     *
     * @param componentName
     * @param online
     */
    function getComponent(componentName: string, online: boolean): Observable<JSXElementConstructor<any>> {
        switch (componentName) {
            case ERROR_CMP: {
                if (online) {
                    debug('ERROR_CMP + online');
                    return of(params.components.ErrorComponent);
                }
                if (!online) {
                    debug('ERROR_CMP + offline');
                    return of(params.components.OfflineComponent);
                }
                return EMPTY;
            }
            case NOTFOUND_CMP: {
                return of(params.components.NotFoundComponent);
            }
            default: {
                return defer(() => params.loaderFn(componentName)).pipe(
                    map(mod => (mod as any).default),
                    catchError(e => {
                        console.error('failed to load a chunk', e);
                        return of(params.components.ErrorComponent);
                    }),
                );
            }
        }
    }

    /**
     * This is the function that gets used
     */
    return function resolveInner(
        pathname: string,
        online$: Observable<boolean>,
        outdated$: Observable<boolean>,
    ): Observable<ResolvedComponent> {
        /**
         * A stream of FetchedData events
         */
        const input$ = createInputStream(pathname, outdated$);

        return input$.pipe(
            /**
             * Convert the gql Response into a Component Name
             */
            mergeMap(resp => convertDataToResolved(resp)),
            tap(resp => debug(resp)),
            withLatestFrom(online$),
            mergeMap(([resolved, online]: [ResolvedUrl, boolean]) => {
                return getComponent(resolved.componentName, online).pipe(
                    map(component => {
                        return {
                            ...resolved,
                            Cmp: component,
                        };
                    }),
                );
            }),
            catchError(e => {
                console.error('an unknown error during resolve', e);
                return EMPTY;
            }),
        );
    };
}

export function resolveWeak(params: CreateRunTimeParams, client: ApolloClient<any>) {
    return function resolveWeakInner(urlKey: string, resolveFn: (componentName: string) => any): ResolvedComponent {
        const knownData = getKnownRoute(urlKey, params.knownRoutes) || syncReadFromApolloClient(client, urlKey, params.urlQuery);
        const [resolvedData, error] = syncObs(
            convertDataToResolved({ data: { urlResolver: knownData || null }, urlKey }),
        );
        if (resolvedData && !error) {
            const resolvedModule = resolveWeakWebpack(resolvedData, resolveFn);
            if (resolvedModule) {
                return resolvedModule;
            } else {
                debug('could not resolve');
            }
        }
        return {
            urlKey: urlKey,
            id: 0,
            Cmp: null,
            componentName: '',
        };
    };
}

declare const __webpack_modules__: any;
declare const __webpack_require__: any;

function resolveWeakWebpack(
    resolved: ResolvedUrl,
    resolveFn: (componentName: string) => any,
): ResolvedComponent | undefined {
    const { componentName, urlKey, id } = resolved;
    const maybeModule = resolveFn(componentName);
    if (maybeModule && __webpack_modules__[maybeModule]) {
        const mod = __webpack_require__(maybeModule);
        if (mod) {
            return {
                urlKey,
                componentName,
                id,
                Cmp: mod.default,
            };
        }
    }
    return undefined;
}

function syncObs<T>(obs$: Observable<T>): [T | undefined, Error | undefined] {
    let output: T | undefined = undefined,
        error = undefined;
    obs$.subscribe({
        next: res => (output = res),
        error: e => {
            error = e;
        },
    });
    return [output, error];
}

function syncReadFromApolloClient(client: ApolloClient<any>, urlKey: string, query: any): UrlQueryResult | undefined {
    try {
        const match = client.readQuery<{urlResolver: UrlQueryResult}, UrlQueryInput>({
            query,
            variables: {
                urlKey,
            },
        });
        if (match && match.urlResolver) {
            return match.urlResolver;
        } else {
            debug('no match in Apollo client');
        }
    } catch (e) {
        debug('`syncReadFromApolloClient`', e);
        return undefined;
    }
}

export function fetchedDataStub(urlKey: string, type: string): FetchedData {
    return {
        data: {
            urlResolver: {
                type: type,
                id: 0,
                __typename: 'EntityUrl',
            },
        },
        urlKey,
    } as FetchedData;
}
