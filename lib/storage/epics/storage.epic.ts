import { ignoreElements, tap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { ofType } from 'redux-observable';

import { Actions, StorageActions, TypeMap } from '../storage.actions';
import { EpicDeps, EpicReturn } from '../../types';

export function storageSetEpic(action$: Observable<any>, _state$, { storage }: EpicDeps): EpicReturn {
    return action$.pipe(
        ofType<Actions, TypeMap[StorageActions.Set]>(StorageActions.Set),
        tap(({ payload }) => {
            const { key, value, expiry } = payload;
            storage.set(key, value, expiry);
        }),
        ignoreElements(),
    );
}

export function storageDeleteEpic(action$: Observable<any>, _state$, { storage }: EpicDeps): EpicReturn {
    return action$.pipe(
        ofType<Actions, TypeMap[StorageActions.Delete]>(StorageActions.Delete),
        tap(({ payload }) => {
            storage.remove(payload);
        }),
        ignoreElements(),
    );
}

export function storageSetCookieEpic(action$: Observable<any>, _state$, { cookieStorage }: EpicDeps): EpicReturn {
    return action$.pipe(
        ofType<Actions, TypeMap[StorageActions.SetCookie]>(StorageActions.SetCookie),
        tap(({ payload }) => {
            const { key, value, expiry } = payload;
            cookieStorage.set(key, value, expiry);
        }),
        ignoreElements(),
    );
}

export function storageDeleteCookieEpic(action$: Observable<any>, _state$, { cookieStorage }: EpicDeps): EpicReturn {
    return action$.pipe(
        ofType<Actions, TypeMap[StorageActions.DeleteCookie]>(StorageActions.DeleteCookie),
        tap(({ payload }) => {
            cookieStorage.remove(payload);
        }),
        ignoreElements(),
    );
}
