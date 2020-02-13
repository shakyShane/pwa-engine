import { compose } from 'redux';
import { EMPTY, of, Subject } from 'rxjs';

import { createStorage, createCookieStorage } from '../storage/effects/createStorage.effect';
import { EpicDeps, RegisterItem } from '../types';
import { deleteJSON, getJSON, postJSON, putJSON } from '../utils/ajax';
import { createDebug } from '../utils/runtimeDebug';

import { configureStore } from './store';
import { appendReferrer, cheapClone, extractReferrer, minDelay } from '../utils/general';
import { LOCATION_CHANGE, push, replace } from '../router';

const debug = createDebug('browser-store.ts');

type BrowserStoreParams<StoreState> = {
    deps?: Partial<EpicDeps>;
    initialState?: Partial<StoreState>;
    initialReducers?: { [index: string]: (...args: any[]) => any };
    registrations?: RegisterItem[];
    epics?: [];
    createMiddleware?<T extends Function[]>(middlewares: T[]): T[];
};

export function createBrowserStore<T extends { [index: string]: any }>(parameters: BrowserStoreParams<T> = {}) {
    let { deps = {}, initialState = {}, registrations = [], epics = [], createMiddleware } = parameters;

    const storage = createStorage();
    const cookieStorage = createCookieStorage();

    const epicDeps: EpicDeps = {
        window$: of(window),
        document$: of(document),
        storage,
        cookieStorage,
        getJSON,
        postJSON,
        putJSON,
        deleteJSON,
        restHeaders: (incoming = {}) => {
            const token = store.getState().user.token;
            const outgoing = {
                Authorization: token ? `Bearer ${token}` : '',
                ...incoming,
            };
            debug('restHeaders', outgoing);
            return outgoing;
        },
        apiUrl: (operationId: string) => (path, args) => {
            console.error(`apiUrl not implemented for ${operationId}`, path, args);
            return 'unknown';
        },
        env: process.env as any, // from webpack
        historyEvents$: EMPTY,
        error$: new Subject(),
        cheapClone: cheapClone,
        minDelay: minDelay,
        appendReferrer: appendReferrer,
        extractReferrer: extractReferrer,
        LOCATION_CHANGE: LOCATION_CHANGE,
        push,
        replace,
        ...deps,
    };

    const composeEnhancers = (() => {
        if (process.env.REDUX_STORE_TOOLS) {
            if (window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__) {
                return window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__;
            }
        }
        return compose;
    })();

    const initialReducerTree = registrations.reduce((acc, item) => {
        if (item.reducers) {
            const keys = Object.keys(item.reducers);
            if (keys.length > 0) {
                keys.forEach(k => (acc[k] = item.reducers[k]));
            }
        }
        return acc;
    }, {});

    const [store, register, registerEpic] = configureStore({
        epics: epics as any,
        deps: epicDeps,
        compose: composeEnhancers,
        initialState,
        initialReducers: initialReducerTree,
        createMiddleware,
    });

    if (window.Cypress) {
        window.store = store;
    }

    registrations.forEach(function(item) {
        register(item);
    });

    return {
        storage,
        store,
        register,
        registerEpic,
        epicDeps,
    };
}
