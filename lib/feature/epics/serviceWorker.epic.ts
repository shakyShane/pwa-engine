import { ofType } from 'redux-observable';
import { filter, ignoreElements, pluck, withLatestFrom, catchError, switchMap } from 'rxjs/operators';
import { EMPTY, Observable, merge, of } from 'rxjs';
import { Action } from 'redux';

import {
    createStreamOfSWMessages,
    handleVersionUpdates,
    pollForServiceWorkerUpdates,
    registerKillSwitchServiceWorker,
    registerServiceWorker,
} from '../effects/serviceWorkers';
import { RuntimeActions, RuntimeEnv, RuntimeState } from '../runtime.register';
import { assertUnreachable } from '../../utils/general';

export function serviceWorkerEpic(action$, state$, deps): Observable<Action> {
    const env$: Observable<Partial<RuntimeEnv>> = state$.pipe(pluck('runtime', 'env'));

    return action$.pipe(
        ofType(RuntimeActions.SetEnv),
        withLatestFrom(env$, deps.window$),
        /**
         * Only progress if service worker is supported
         */
        filter(([, , window]) => 'serviceWorker' in window.navigator),
        /**
         * If we get here, service worker was enabled & supported by the browser
         */
        switchMap(([, env]: [any, RuntimeState['env'], Window]) => {
            switch (Boolean(env.SERVICE_WORKER)) {
                /**
                 * If the service worker is enabled, just go ahead
                 * and register as normal
                 */
                case true:
                    const sw$ = registerServiceWorker(env.VERSION);
                    /**
                     * Message stream coming out of the service worker
                     */
                    const message$ = sw$.pipe(switchMap(createStreamOfSWMessages));
                    /**
                     * Message handlers, even though there's only 1 for now.
                     */
                    const msgHandlers$ = merge(handleVersionUpdates(message$, of(env.VERSION!)));
                    /**
                     * Poll for service worker update once the current SW is registered
                     */
                    const updates = sw$.pipe(
                        switchMap(pollForServiceWorkerUpdates(action$)),
                        ignoreElements(),
                    );
                    return merge(msgHandlers$, updates);
                case false:
                    return registerKillSwitchServiceWorker();
                default:
                    return assertUnreachable();
            }
        }),
        catchError(e => {
            // SW is an enhancement, so we're going to 'ignore' any error
            console.error('serviceWorkerEpic Error', e);
            return EMPTY;
        }),
    );
}
