import { defer, Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ApolloClient } from 'apollo-client';

import { urlEntityToComponentName } from './urlEntityToComponentName';
import { NOTFOUND_CMP, ResolvedUrl } from './resolve';
import { getKnownRoute, RouteData } from './getKnownRoute';
import { UrlQueryInput, UrlQueryResult } from '../types';
import { createDebug } from './runtimeDebug';

const debug = createDebug('fetchFromKnownOrNetwork');

export interface FetchedData {
    data: { urlResolver: UrlQueryResult };
    urlKey: string;
}

export function fetchFromKnownOrNetwork(
    urlKey: string,
    client: ApolloClient<any>,
    knownRoutes: RouteData[],
    query: any,
): Observable<FetchedData> {
    /**
     * First try to lookup a known route to avoid hitting
     * the network at all. This is useful for routes that are not
     * covered by the urlResolver backend, but are known to the frontend
     * such as /customer/*
     */
    const known = getKnownRoute(urlKey, knownRoutes);
    if (known) {
        debug('returned known route', known, 'for', urlKey);
        return of({ data: { urlResolver: known }, urlKey });
    }

    /**
     * Otherwise we try to resolve this pathname with the urlResolver
     * query
     */
    return defer(() => {
        return client.query<{ urlResolver: UrlQueryResult }, UrlQueryInput>({
            query,
            variables: {
                urlKey,
            },
        });
    }).pipe(
        map(result => {
            return { data: result.data, urlKey };
        }),
        catchError(e => {
            console.error('error from gql urlResolver', e);
            return throwError(e);
        }),
    );
}

/**
 * Once gql  has returned some data, try to extract
 * @param data
 * @param urlKey
 */
export function convertDataToResolved({ data, urlKey }: FetchedData): Observable<ResolvedUrl> {
    if (typeof data.urlResolver === 'undefined') {
        debug("typeof data.urlResolver === 'undefined'");
        return throwError(new Error(`typeof data.urlResolver === 'undefined'`));
    }
    if (data.urlResolver && typeof data.urlResolver.type === 'string') {
        debug('data.urlResolver.types exists', data.urlResolver.type);
        const componentName = urlEntityToComponentName(data.urlResolver.type);
        return of({ urlKey, componentName, id: data.urlResolver.id });
    }
    /**
     * Handles null or missing case
     */
    debug('urlResolver.type was not undefined or a string');
    return of({ urlKey, componentName: NOTFOUND_CMP, id: null });
}
