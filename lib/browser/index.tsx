import React from 'react';
import { initialState as initialRuntimeState } from '../runtime';
import { getRuntimeState, resolve, resolveWeak } from '../utils/resolve';
import { concat, of, Subject } from 'rxjs';
import { createBrowserHistory, History } from 'history';
import { share } from 'rxjs/operators';
import { createBrowserStore } from '../store';
import { registerRuntime, RuntimeEnv } from '../runtime';
import { ApolloProvider } from '@apollo/react-hooks';
import { RegisterContextProvider } from '../components';
import { Provider as ReduxProvider } from 'react-redux';
import { Router } from 'react-router-dom';
import { storageRegister } from '../storage';
import {
    AsyncLoader,
    AsyncRouter,
    historyAsObs,
    routerMiddleware,
    routerRegister,
    initialState as initialRouterState,
} from '../router';
import { readJson } from '../utils/readJson';
import { getBrowserApolloClient } from '../utils/getBrowserApolloClient';
import { cheapClone } from '../utils/general';

export function init({
    loaderFn,
    resolveWeakLoader,
    features,
    links,
    initialState,
    components,
    deps,
    urlResolver,
    knownRoutes,
    apiUrl,
}) {
    const [apolloClient, errors] = getBrowserApolloClient(links, readJson('apollo-client-state'));

    const resolveLocal = resolve(
        {
            loaderFn,
            components: components,
            knownRoutes: knownRoutes,
            urlQuery: urlResolver,
        },
        apolloClient,
        errors,
    );

    const resolveWeakLocal = resolveWeak(
        {
            knownRoutes: knownRoutes,
            urlQuery: urlResolver,
        },
        apolloClient,
    );

    /**
     * Try to load a component from SSR
     */
    const initial = resolveWeakLocal(window.location.pathname, resolveWeakLoader);

    const appEnv: Partial<RuntimeEnv> = readJson('app-env');
    const error$ = new Subject<{ error: Error; info: React.ErrorInfo }>();

    const history = createBrowserHistory();
    const historyEvents$ = historyAsObs(history).pipe(share());

    /**
     * Create the redux store
     */
    const { store, register, registerEpic, epicDeps } = createBrowserStore({
        createMiddleware: mw => [routerMiddleware(history), ...mw] as any,
        registrations: [registerRuntime(), routerRegister(), storageRegister(), ...features],
        deps: {
            client: apolloClient as any,
            apiUrl: (_operationId: string) => {
                return apiUrl;
            },
            error$,
            history,
            historyEvents$,
            ...deps,
        },
        initialState: {
            router: {
                ...initialRouterState,
                location: {
                    ...initialRouterState.location,
                    pathname: window.location.pathname,
                    search: window.location.search,
                },
            },
            runtime: {
                ...initialRuntimeState,
                env: {
                    ...appEnv,
                    NODE_ENV: process.env.NODE_ENV,
                    SERVICE_WORKER: process.env.SERVICE_WORKER,
                },
            },
            ...initialState,
        },
    });

    const onlineOutdated$ = getRuntimeState(store, window.navigator.onLine, false);

    const nav$ = initial.Cmp
        ? historyEvents$
        : concat(
              of(
                  {
                      location: { pathname: 'PAGE_LOAD', hash: '', search: '', key: '', state: {} },
                      action: history.action,
                  },
                  { location: history.location, action: history.action },
              ),
              historyEvents$,
          );

    const complete$ = new Subject();

    return () => {
        const App: React.FC = React.memo(props => {
            return (
                <ApolloProvider client={apolloClient}>
                    <RegisterContextProvider register={register} registerEpic={registerEpic} epicDeps={epicDeps}>
                        <ReduxProvider store={store}>
                            <Router history={history}>
                                <AsyncRouter history={history as History} complete$={complete$}>
                                    {props.children}
                                </AsyncRouter>
                            </Router>
                        </ReduxProvider>
                    </RegisterContextProvider>
                </ApolloProvider>
            );
        });
        const Async = (
            <AsyncLoader
                nav$={nav$}
                resolveLocal={resolveLocal}
                complete$={complete$}
                initial={(initial.Cmp && initial) || null}
                initialLocation={cheapClone(history.location)!}
                initialAction={history.action}
                onlineOutdated$={onlineOutdated$}
            />
        );
        return { App, Async };
    };
}
