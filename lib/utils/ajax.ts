import { Observable } from 'rxjs';
import { ajax } from 'rxjs/ajax';
import { pluck } from 'rxjs/operators';

import { createRuntimeDebug } from './runtimeDebug';
const debug = createRuntimeDebug('ajax.ts');

export function getJSON<T>(url, headers = {}): Observable<T> {
    debug('GET', url, headers);
    const defaults = {
        url,
        method: 'GET',
        responseType: 'json',
        crossDomain: true,
    };

    const outgoingOptions = {
        ...defaults,
        headers: {
            ...headers,
        },
    };

    return ajax(outgoingOptions).pipe(pluck('response'));
}

export function baseAjax(method: 'POST' | 'PUT' | 'DELETE') {
    return function(url, body?, headers = {}) {
        debug(method, url, body, headers);
        return ajax({
            url,
            body,
            method,
            headers: {
                ...headers,
                'Content-Type': 'application/json',
            },
        }).pipe(pluck('response'));
    };
}

export function postJSON(url, body?, options = {}) {
    return baseAjax('POST')(url, body, options);
}

export function putJSON(url, body?, options = {}) {
    return baseAjax('PUT')(url, body, options);
}

export function deleteJSON(url, body = null, options = {}) {
    return baseAjax('DELETE')(url, body, options);
}
