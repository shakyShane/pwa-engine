import { ActionMap, createMsg } from 'action-typed';

import { ResolvedComponent } from '../utils/resolve';
import { UrlEntry } from '../utils/writeUrls';

import { scrollTopEpic } from './epics/windowScrollTop.epic';
import { serviceWorkerEpic } from './epics/serviceWorker.epic';
import { appEnvEpic } from './epics/appEnv.epic';
import { onlineOffLineEpic } from './epics/onlineOffline.epic';
import { reloadEpic } from './epics/reload.epic';

export enum RuntimeActions {
    SetResolving = 'Runtime/SetResolving',
    SetResolve = 'Runtime/SetResolve',
    WriteUrls = 'Runtime/WriteUrls',
    Log = 'Runtime/Log',
    SetOutdated = 'Runtime/SetOutdated',
    SetOnline = 'Runtime/SetOnline',
    Reload = 'Runtime/Reload',
    ScrollTop = 'Runtime/ScrollTop',
    SetEnv = 'Runtime/SetEnv',
}

export type RuntimeEnv = {
    NODE_ENV: 'production' | 'development' | 'storybook';
    // Blank the service worker file name to stop the app from
    // attempting to register a service worker in index.js.
    // Only register a service worker when in production or in the
    // special case of debugging the service worker itself.
    SERVICE_WORKER: boolean;
    VERSION: string;
    DOMAIN: string;
};

export type RuntimeState = {
    online: boolean;
    outdated: boolean;
    env: Partial<RuntimeEnv>;
};

export const initialState: RuntimeState = {
    online: true,
    outdated: false,
    env: {},
};

export type Messages = {
    [RuntimeActions.SetResolving]: boolean;
    [RuntimeActions.SetResolve]: ResolvedComponent;
    [RuntimeActions.WriteUrls]: UrlEntry[];
    [RuntimeActions.Log]: any[];
    [RuntimeActions.SetOutdated]: undefined;
    [RuntimeActions.SetOnline]: boolean;
    [RuntimeActions.Reload]: undefined;
    [RuntimeActions.ScrollTop]: { duration: number; selector: string };
    [RuntimeActions.SetEnv]: Partial<RuntimeEnv>;
};

export const RuntimeMsg = createMsg<Messages>();
export type TypeMap = ActionMap<Messages>;
export type Handler = TypeMap[keyof TypeMap];
export type Actions = Handler;

export function runtimeReducer(state = initialState, action: Handler): RuntimeState {
    switch (action.type) {
        case RuntimeActions.SetOutdated: {
            return {
                ...state,
                outdated: true,
            };
        }
        case RuntimeActions.SetOnline: {
            return {
                ...state,
                online: action.payload,
            };
        }
        case RuntimeActions.SetEnv: {
            return {
                ...state,
                env: {
                    ...state.env,
                    ...action.payload,
                },
            };
        }
        default:
            return state;
    }
}

export function registerRuntime() {
    return {
        epics: [scrollTopEpic, serviceWorkerEpic, appEnvEpic, onlineOffLineEpic, reloadEpic],
        reducers: {
            runtime: runtimeReducer,
        },
        name: 'runtime',
    };
}
