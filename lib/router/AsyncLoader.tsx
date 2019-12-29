import React, { useContext, useEffect, useRef, useState } from 'react';
import classnames from 'classnames';
import { filter, map, pairwise, pluck, share, startWith, switchMap, tap, withLatestFrom } from 'rxjs/operators';
import { BehaviorSubject, merge, Observable, Subject, timer, zip } from 'rxjs';
import { Action, Location } from 'history';
import { useDispatch } from 'react-redux';

import { AsyncRouterContext, HistoryEvent } from './AsyncRouter';
import { Msg } from './router.register';
import { ResolvedComponent } from '../utils/resolve';
import { createDebug } from '../utils/runtimeDebug';

const debug = createDebug('AsyncRouter:AsyncLoader');

interface AsyncLoaderProps {
    nav$: Observable<HistoryEvent>;
    complete$: Subject<any>;
    initial: ResolvedComponent | null;
    initialLocation: Location;
    initialAction: Action;
    onlineOutdated$: Observable<{ online: boolean; outdated: boolean }>;
    resolveLocal(
        pathname: string,
        online$: Observable<boolean>,
        outdated$: Observable<boolean>,
    ): Observable<ResolvedComponent>;
}

export const AsyncLoader: React.FC<AsyncLoaderProps> = React.memo(props => {
    const [resolved, setComponent] = useState<ResolvedComponent | null>(props.initial);
    const [loading, setLoading] = useState(false);
    const { resolveLocal } = props;
    const dispatch = useDispatch();
    const { base$ } = useContext(AsyncRouterContext);

    const initialHistoryEvent = useRef<HistoryEvent>({
        location: props.initialLocation,
        action: props.initialAction,
    });

    useEffect(() => {
        const input = props.nav$.pipe(
            tap(x => debug('incoming history event', x.action, x.location.pathname)),
            tap(x => dispatch(Msg('AsyncRouter.CHANGE', x))),
            startWith(initialHistoryEvent.current),
            pairwise(),
            withLatestFrom(base$?.current || (new BehaviorSubject<Set<string>>(new Set([])) as any)),
            share(),
        );

        const differentBase = input.pipe(
            filter(x => baseFilter(x)),
            tap(() => setLoading(true)),
            switchMap(([[, { location }]]) => {
                return zip(
                    resolveLocal(
                        location.pathname,
                        props.onlineOutdated$.pipe(pluck('online')),
                        props.onlineOutdated$.pipe(pluck('outdated')),
                    ),
                    timer(500),
                ).pipe(map(([m]) => m));
            }),
            tap(x => debug('resolved component', x)),
            tap(c => setComponent(c)),
            tap(() => window.scrollTo(0, 0)),
        );

        const sameBase = input.pipe(
            filter(x => !baseFilter(x)),
            tap(() => window.scrollTo(0, 0)),
        );

        const allSubs = merge(differentBase, sameBase)
            .pipe(tap(() => dispatch(Msg('AsyncRouter.Resolved'))))
            .subscribe();

        /**
         * Catchall to ensure 'complete' events are respected.
         */
        const cmp = props.complete$.pipe(tap(() => debug('component complete msg'))).subscribe(() => setLoading(false));

        return () => {
            allSubs.unsubscribe();
            cmp.unsubscribe();
        };
    }, [
        props.complete$,
        props.initial,
        props.nav$,
        initialHistoryEvent,
        setComponent,
        dispatch,
        resolveLocal,
        base$,
        props.onlineOutdated$,
    ]);

    return (
        <div
            className={classnames({
                ['opacity-0']: loading,
                ['opacity-1']: !loading,
            })}
        >
            {resolved && resolved.Cmp && (
                <resolved.Cmp id={resolved.id} key={resolved.urlKey} pathname={resolved.urlKey} />
            )}
        </div>
    );
});

function baseFilter([[prev, next], excludeSet]) {
    const p1 = prev.location.pathname;
    const p2 = next.location.pathname;
    const [seg1] = p1.slice(1).split('/');
    if (isSameBase([prev, next]) && (excludeSet as Set<string>).has(seg1)) {
        debug('BAILING (BASE) since bases are the same');
        return false;
    }
    if (p1 === p2) {
        debug('BAILING since paths match');
        return false;
    }
    return true;
}

function isSameBase([prev, next]: [HistoryEvent, HistoryEvent]): boolean {
    const p1 = prev.location.pathname;
    const p2 = next.location.pathname;
    const [seg1] = p1.slice(1).split('/');
    const [seg2] = p2.slice(1).split('/');
    return seg1 === seg2;
}
