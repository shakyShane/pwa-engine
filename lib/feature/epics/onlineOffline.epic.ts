import { map, mapTo, mergeMap } from 'rxjs/operators';
import { asyncScheduler, defer, fromEvent, merge, Observable, of } from 'rxjs';
import { Action } from 'redux';

import { RuntimeActions, RuntimeMsg } from '../runtime.register';

export function onlineOffLineEpic(_actions, _state, deps: { window$: Observable<Window> }): Observable<Action> {
    return deps.window$.pipe(
        mergeMap((win: Window) => {
            const online = fromEvent(win, 'online').pipe(mapTo(true));
            const offline = fromEvent(win, 'offline').pipe(mapTo(false));
            const first = defer(() => of(win.navigator.onLine, asyncScheduler));

            return merge(online, offline, first).pipe(map(online => RuntimeMsg(RuntimeActions.SetOnline, online)));
        }),
    );
}
