import { ignoreElements, tap, withLatestFrom } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { ofType } from 'redux-observable';
import { Action } from 'redux';

import { scrollToTopEffect } from '../effects/windowScrollTop';
import { Actions, RuntimeActions, TypeMap } from '../runtime.register';
import { EpicDeps } from '../../types';

export function scrollTopEpic(action$: Observable<any>, _state, deps: EpicDeps): Observable<Action> {
    return action$.pipe(
        ofType<Actions, TypeMap[RuntimeActions.ScrollTop]>(RuntimeActions.ScrollTop),
        withLatestFrom(deps.window$),
        tap(([{ payload }, window]) => {
            if (payload.duration > 0) {
                scrollToTopEffect(payload.duration, payload.selector);
            } else {
                window.scrollTo(0, 0);
            }
        }),
        ignoreElements(),
    );
}
