import { EMPTY, Observable, of } from 'rxjs';
import { ignoreElements, share, tap, mergeMap, withLatestFrom } from 'rxjs/operators';
import { Action } from 'redux';

import { RuntimeActions, RuntimeMsg } from '../runtime.register';
import { createDebug } from '../../utils/runtimeDebug';

const debug = createDebug(`serviceWorkers.ts`);

/**
 * How often should we check for SW updates?
 * 30 mins seems ok since it be be polled on page navigations anyway
 */
// const SW_POLL_UPDATE_INTERVAL = 1000 * 60 * 30;

export function registerServiceWorker(
    version: string = '__development__',
    path = '/sw.js',
): Observable<ServiceWorkerRegistration> {
    debug('Trying to register ', path);
    debug('Version', version);

    return Observable.create(observer => {
        navigator.serviceWorker
            .register(path)
            .then(registration => {
                debug('SW registered: ', registration);
                observer.next(registration);
                observer.complete();
            })
            .catch(registrationError => {
                debug('SW registration failed: ', registrationError);
                observer.error(registrationError);
            });
    }).pipe(share());
}

/**
 * Just a wrapper around navigator.serviceWorker.addEventListener to
 * make it into an observable stream
 */
export function createStreamOfSWMessages(): Observable<ServiceWorkerMessageEvent> {
    return Observable.create(observer => {
        function messageHandler(payload) {
            observer.next(payload);
        }
        navigator.serviceWorker.addEventListener('message', messageHandler);
        return () => {
            navigator.serviceWorker.removeEventListener('message', messageHandler);
        };
    }).pipe(share());
}

/**
 * Poll for updates on an interval + on page changes
 * @param historyObs$
 */
export function pollForServiceWorkerUpdates(historyObs$: Observable<unknown>) {
    return (registration: ServiceWorkerRegistration): Observable<unknown> => {
        debug('setting up listener to check for sw updates on every navigation');

        return historyObs$.pipe(
            tap(() => {
                if (registration && typeof (registration as any).update === 'function') {
                    debug('Checking for SW updates via registration.update()');
                    (registration as any).update();
                }
            }),
            ignoreElements(),
        );
    };
}

/**
 * Handling an incoming Service Worker message 'VERSION_CHECK'
 *
 * if it's outdated we set a property on the app so that it can be handled
 * in various ways, such as in routing etc
 *
 * @param message$
 * @param version$
 */
export function handleVersionUpdates(
    message$: Observable<ServiceWorkerMessageEvent>,
    version$: Observable<string>,
): Observable<Action> {
    return message$.pipe(
        withLatestFrom(version$),
        mergeMap(([{ data }, version]) => {
            if (data && data.type === 'VERSION_CHECK') {
                if (data.version !== version) {
                    debug('should refresh here because versions are incompatible');
                    return of(RuntimeMsg(RuntimeActions.SetOutdated));
                }
            }

            // not currently handling any more events
            return EMPTY;
        }),
    );
}

/**
 * Register the killswitch
 * @param path
 */
export function registerKillSwitchServiceWorker(path = '/sw-killswitch.js') {
    debug('Trying to register killswitch ', path);
    navigator.serviceWorker
        .register(path)
        .then(() => {
            debug('SW Killswitch registered');
        })
        .catch(registrationError => {
            debug('SW Killswitch registration failed: ', registrationError);
        });

    return EMPTY;
}
