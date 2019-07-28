import { ignoreElements, withLatestFrom, tap } from 'rxjs/operators';
import { ofType } from 'redux-observable';
import { Observable } from 'rxjs';
import { Action } from 'redux';

import { RuntimeActions } from '../runtime.register';

/**
 *
 * Handle showing alerts to the user
 *
 * @param action$
 * @param _state$
 * @param deps
 */
export function reloadEpic(action$, _state$, deps: { window$: Observable<Window> }): Observable<Action> {
    return action$.pipe(
        ofType(RuntimeActions.Reload),
        withLatestFrom(deps.window$),
        tap(([, window]) => {
            window.location.reload(true);
        }),
        ignoreElements(),
    );
}
