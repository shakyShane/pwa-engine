import { createStore, applyMiddleware, combineReducers } from 'redux';
import { combineEpics, createEpicMiddleware } from 'redux-observable';
import { BehaviorSubject, Observable } from 'rxjs';
import { filter, mergeMap, pluck, withLatestFrom } from 'rxjs/operators';

import { RegisterItem } from '../types';
import { createRuntimeDebug } from '../utils/runtimeDebug';
const debug = createRuntimeDebug('store.ts');

type ConfigureStoreParams<State, EpicDeps> = {
    epics: any[];
    deps: Partial<EpicDeps>;
    compose: any;
    initialState?: Partial<State>;
    initialReducers?: { [index: string]: (...args: any[]) => any };
};

export type RegisterEpicFn = (action$: Observable<any>, state$?: Observable<any>, deps?: any) => Observable<any>;
export type RegisterEpicApi = (fn: RegisterEpicFn, ctxName?: string) => void;

export function configureStore<StoreState, EpicDeps>(
    parameters: ConfigureStoreParams<StoreState, EpicDeps>,
): [any, (item: RegisterItem | RegisterItem[]) => void, RegisterEpicApi] {
    let { epics = [], deps = {}, compose, initialState = {}, initialReducers = {} } = parameters;
    const registered: string[] = [];
    const dependencies: Partial<EpicDeps> = {
        ...deps,
    };

    const epicMiddleware = createEpicMiddleware({
        dependencies,
    });

    const epic$ = new BehaviorSubject(combineEpics(...[...epics]));
    const rootEpic = (action$, state$, deps) => {
        const env$: Observable<any> = state$.pipe(pluck('runtime', 'env'));
        return epic$.pipe(
            withLatestFrom(env$),
            filter(([epic, env]) => {
                if (!env || !env.NODE_ENV) {
                    return true;
                }
                if (epic.epicMeta && epic.epicMeta.skipEnv) {
                    const matchesEnv = epic.epicMeta.skipEnv.indexOf(env.NODE_ENV) > -1;
                    debug(
                        `skipping this epic '${epic.epicMeta.displayName}', because it matched the current env '%s'`,
                        env.NODE_ENV,
                    );
                    return !matchesEnv;
                }
                return true;
            }),
            mergeMap(([epic]) => epic(action$, state$, deps)),
        );
    };

    const staticReducers = {
        ...initialReducers,
    };

    /**
     * Logs all actions and states after they are dispatched.
     */
    const logger = store => next => action => {
        if (window.location.search.indexOf('debug') > -1) {
            console.group(action.type);
            console.info('dispatching', action);
        }
        let result = next(action);
        if (window.location.search.indexOf('debug') > -1) {
            console.log('next state', store.getState());
            console.groupEnd();
        }
        return result;
    };

    const middleware = applyMiddleware(logger, epicMiddleware);

    const store: any = createStore(createReducer(), initialState, compose(middleware));
    store.asyncReducers = {};
    store.injectReducer = (key, asyncReducer) => {
        store.asyncReducers[key] = asyncReducer;
        store.replaceReducer(createReducer(store.asyncReducers));
    };

    function createReducer(asyncReducers?: any) {
        return combineReducers({
            ...staticReducers,
            ...asyncReducers,
        });
    }

    epicMiddleware.run(rootEpic as any);

    function registerEpic(fn: RegisterEpicFn, ctxName?: string) {
        debug('registerEpic -> fn', ctxName || fn.name || 'unknown');
        epic$.next(fn);
    }

    function register(items: RegisterItem | RegisterItem[]): void {
        []
            .concat(items as any)
            .filter(Boolean)
            .forEach((item: RegisterItem) => {
                if (registered.indexOf(item.name) === -1) {
                    Object.keys(item.reducers).forEach(key => {
                        debug('registering reducer [%s] for', key, item.name);
                        store.injectReducer(key, item.reducers[key]);
                    });

                    debug('registering %s epics for', item.epics.length, item.name);
                    item.epics.forEach(e => epic$.next(e));

                    registered.push(item.name);
                } else {
                    // console.log('already registered');
                }
            });
    }

    return [store, register, registerEpic];
}
