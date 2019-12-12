import { Action, Location, History } from 'history';
import { ActionMap, createMsg } from 'action-typed';
import { Middleware } from 'redux';

import { HistoryEvent } from './AsyncRouter';
import { createRuntimeDebug } from '../utils/runtimeDebug';

const debug = createRuntimeDebug('AsyncRouter:register');

export interface RouterState {
    location: Location;
    action: Action | null;
    resolving: boolean;
}

export const initialState: RouterState = {
    resolving: false,
    action: null,
    location: {
        pathname: '',
        search: '',
        state: undefined,
        hash: '',
    },
};

type Messages = {
    ['AsyncRouter.CHANGE']: HistoryEvent;
    ['AsyncRouter.@@INTERNAL']: { method: string; args: any[] };
    ['AsyncRouter.Resolved']: undefined;
};

export const LOCATION_CHANGE = 'AsyncRouter.CHANGE';
export const LOCATION_CHANGE_INTERNAL = 'AsyncRouter.@@INTERNAL';

export function asyncRouter(state = initialState, action: Actions): RouterState {
    switch (action.type) {
        case 'AsyncRouter.CHANGE': {
            return {
                ...state,
                ...action.payload,
                resolving: true,
            };
        }
        case 'AsyncRouter.Resolved': {
            return {
                ...state,
                resolving: false,
            };
        }
        default:
            return state;
    }
}

export function push(path: string, state?: any) {
    return RouterMsg('AsyncRouter.@@INTERNAL', {
        method: 'push',
        args: [path, state],
    });
}

export const Msg = createMsg<Messages>();
export const RouterMsg = Msg;
export type TypeMap = ActionMap<Messages>;
export type Actions = TypeMap[keyof TypeMap];

export function routerRegister() {
    return {
        epics: [],
        name: 'router',
        reducers: {
            router: asyncRouter,
        },
    };
}

export function routerMiddleware(history: History): Middleware {
    return function(_store) {
        return function(next) {
            return function(action) {
                if (action.type !== LOCATION_CHANGE_INTERNAL) {
                    return next(action);
                }

                const _action$payload = action.payload,
                    method = _action$payload.method,
                    args = _action$payload.args;
                debug(action.type, method, args);
                history[method](...args);
            };
        };
    };
}
