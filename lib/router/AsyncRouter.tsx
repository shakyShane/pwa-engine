import React, { useCallback, useEffect, useRef } from 'react';
import { Action, History, Location } from 'history';
import { BehaviorSubject, noop, Observable, Subject } from 'rxjs';
import { scan, share } from 'rxjs/operators';
import { createRuntimeDebug } from '../utils/runtimeDebug';

const debug = createRuntimeDebug('AsyncRouter');

interface AsyncContext {
    pathname: string | null;
    ready();
    complete(v: any);
    registerBase(path: string);
    base$: React.MutableRefObject<BehaviorSubject<Set<string>>> | null;
}
export const AsyncRouterContext = React.createContext<AsyncContext>({
    pathname: null,
    ready: noop,
    complete: _v => {},
    registerBase: _v => {},
    base$: null,
});

interface AsyncRouterProps {
    history: History;
    complete$: Subject<any>;
}

export const AsyncRouter: React.FC<AsyncRouterProps> = props => {
    const base$ = useRef(new BehaviorSubject(new Set<string>([])));
    const input$ = useRef(new Subject<string>());
    const complete = useCallback(
        v => {
            props.complete$.next(v);
        },
        [props.complete$],
    );
    const registerBase = useCallback(
        v => {
            debug('incoming input$');
            input$.current.next(v);
        },
        [input$],
    );

    useEffect(() => {
        const sub = input$.current
            .pipe(
                scan((acc, item) => {
                    acc.add(item);
                    return acc;
                }, new Set<string>([])),
                share(),
            )
            .subscribe(base$.current);
        return () => sub.unsubscribe();
    }, [input$]);

    return (
        <AsyncRouterContext.Provider
            value={{
                pathname: '/',
                ready: () => {},
                complete,
                registerBase,
                base$,
            }}
        >
            {props.children}
        </AsyncRouterContext.Provider>
    );
};

export interface HistoryEvent {
    location: Location;
    action: Action;
}

/**
 * Wrap events from the history obj as an observable
 *
 * @param history
 */
export function historyAsObs(history: History): Observable<HistoryEvent> {
    return new Observable(obs => {
        debug('history listener added');
        const handler = (location, action) => {
            obs.next({
                location,
                action,
            });
        };
        const unlisten = history.listen(handler);
        return () => {
            if (typeof unlisten === 'function') {
                debug('history listener teardown');
                unlisten();
            } else {
                console.error('Could not tear down the history component');
            }
        };
    });
}
