import React from 'react';
import { Observable, Subject } from 'rxjs';
import { Action } from 'redux';
import { ApolloClient } from 'apollo-client';
import { cheapClone, minDelay, appendReferrer, extractReferrer } from './utils/general';

export type EpicReturn = Observable<Action>;

export interface EpicDeps<AppEnv = {}> {
    document$: Observable<Document>;
    window$: Observable<Window>;
    storage: {
        get(key: string): any;
        set(key: string, value: any, duration?: number): void;
        remove(key: string): void;
    };
    cookieStorage: {
        get(key: string): any;
        set(key: string, value: any, duration?: number): void;
        remove(key: string): void;
    };
    apiUrl(operationId: string): (path: string, args?: { [name: string]: any }, fields?: string[]) => string;
    postJSON(url: string, body?: any, options?: object): Observable<any>;
    postJSON(url: string, body?: any, options?: object): Observable<any>;
    putJSON(url: string, body?: any, options?: object): Observable<any>;
    deleteJSON(url: string, body?: any, options?: object): Observable<any>;
    getJSON(url: string, options?: object): Observable<any>;
    restHeaders(baseOptions: object): object;
    client?: ApolloClient<any>;
    env: AppEnv;
    historyEvents$: Observable<unknown>;
    error$: Subject<{ error: Error; info: React.ErrorInfo }>;
    LOCATION_CHANGE: string;
    cheapClone: typeof cheapClone;
    minDelay: typeof minDelay;
    appendReferrer: typeof appendReferrer;
    extractReferrer: typeof extractReferrer;
    push(path: string, state?: any): Action;
    replace(path: string, state?: any): Action;
}

export interface RegisterItem {
    name: string;
    epics: ((...args: any[]) => EpicReturn)[];
    reducers: { [index: string]: (...args: any[]) => any };
}

export interface UrlQueryResult {
    type: string;
    id: number | null;
    canonical_url?: string | null;
    redirect_type?: number | null;
    redirect_url?: string | null;
    relative_url?: string | null;
}

export interface UrlQueryInput {
    urlKey?: string | null;
}

export enum DataStatus {
    Idle = 'Idle',
    Pending = 'Pending',
    Success = 'Success',
    Error = 'Error',
}

export type Message = {
    type: MessageType;
    text: string;
};

export enum MessageType {
    Info = 'Info',
    Success = 'Success',
    Error = 'Error',
    Warning = 'Warning',
}
