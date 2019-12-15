import React from 'react';
import { GetSsrAppParams, SrrParams } from './ssrMiddleware';
import { initialState, runtimeReducer } from '../runtime';
import { configureStore } from '../store';
import { createRuntimeDebug } from '../utils/runtimeDebug';
import { compose } from 'redux';
import { Provider as ReduxProvider } from 'react-redux';
import { StaticRouter } from 'react-router';
import { ApolloProvider } from 'react-apollo';
import { RegisterContextProvider } from '../components';

const debug = createRuntimeDebug('getSSRMiddleware');

type CombinedParams = GetSsrAppParams & SrrParams;

export function getSsrInit(params: CombinedParams) {
    const { client, resolvedUrl, domain, version, rawPath, reducers, state, resolveSync } = params;
    debug('rendering for %s', rawPath);

    const deps = {
        client: client as any,
        storage: {
            get(_: string): any {
                return null;
            },
            remove(_: string): void {
                return undefined;
            },
            set(): void {
                return undefined;
            },
        },
    };
    const [pathname, search] = rawPath.split(/\?/);
    const [store, register] = configureStore({
        initialReducers: {
            runtime: runtimeReducer,
            router: (s = {}) => s,
            ...reducers,
        },
        epics: [],
        deps,
        compose,
        initialState: {
            router: {
                location: { pathname, search: search ? '?' + search : '' },
            },
            runtime: {
                ...initialState,
                // resolving: true,
                env: {
                    VERSION: version,
                    DOMAIN: domain,
                    NODE_ENV: 'production',
                },
            },
            ...state,
        },
    });
    const context = {};
    const Cmp = resolveSync(resolvedUrl.componentName);
    const Inner = React.memo(() => {
        return (
            <div className="opacity-1" data-test-id="SSR">
                <Cmp id={resolvedUrl.id} key={pathname} pathname={pathname} />
            </div>
        );
    });

    const App = React.memo(props => (
        <ApolloProvider client={client as any}>
            <RegisterContextProvider
                register={register}
                epicDeps={deps}
                registerEpic={() => {
                    /* noop */
                }}
            >
                <ReduxProvider store={store}>
                    <StaticRouter location={pathname} context={context}>
                        {props.children}
                    </StaticRouter>
                </ReduxProvider>
            </RegisterContextProvider>
        </ApolloProvider>
    ));
    return { App, Inner };
}
