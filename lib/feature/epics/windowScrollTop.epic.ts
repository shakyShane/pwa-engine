import { ignoreElements, tap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { ofType } from 'redux-observable';
import { Action } from 'redux';

import { scrollToTopEffect } from '../effects/windowScrollTop';
import { Actions, RuntimeActions, TypeMap } from '../runtime.register';

export function scrollTopEpic(action$: Observable<any>): Observable<Action> {
    return action$.pipe(
        ofType<Actions, TypeMap[RuntimeActions.ScrollTop]>(RuntimeActions.ScrollTop),
        tap(({ payload }) => scrollToTopEffect(payload.duration, payload.selector)),
        ignoreElements(),
    );
}
