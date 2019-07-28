import { createBrowserHistory } from 'history';
import { compose } from 'redux';
import { EMPTY, of } from 'rxjs';

import { createStorage, createCookieStorage } from '../storage/effects/createStorage.effect';
import { EpicDeps, RegisterItem } from '../types';
import { deleteJSON, getJSON, postJSON, putJSON } from '../utils/ajax';
import { createRuntimeDebug } from '../utils/runtimeDebug';

import { configureStore } from './store';

const debug = createRuntimeDebug('browser-store.ts');

type BrowserStoreParams<StoreState> = {
    history?: History;
    deps?: Partial<EpicDeps>;
    initialState?: Partial<StoreState>;
    initialReducers?: { [index: string]: (...args: any[]) => any };
    registrations?: RegisterItem[];
    epics?: [];
};

export function createBrowserStore<T extends { [index: string]: any }>(parameters: BrowserStoreParams<T> = {}) {
    let { history = createBrowserHistory(), deps = {}, initialState = {}, registrations = [], epics = [] } = parameters;

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
        apiOptions: (incoming = {}) => {
            const token = store.getState().user.token;
            const outgoing = {
                Authorization: token ? `Bearer ${token}` : '',
                ...incoming,
            };
            debug('apiOptions', outgoing);
            return outgoing;
        },
        apiUrl: (operationId: string) => (path, args) => {
            console.error(`apiUrl not implemented for ${operationId}`, path, args);
            return 'unknown';
        },
        env: process.env as any, // from webpack
        resolve: (...args) => {
            console.error(`resolve not implemented`, args);
            return EMPTY;
        },
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

    const [store, register] = configureStore({
        history,
        epics: epics as any,
        deps: epicDeps,
        compose: composeEnhancers,
        initialState,
        initialReducers: initialReducerTree,
    });

    if (window.Cypress) {
        window.store = store;
    }

    registrations.forEach(function(item) {
        register(item);
    });

    return {
        history,
        storage,
        store,
        register,
        epicDeps,
    };
}
