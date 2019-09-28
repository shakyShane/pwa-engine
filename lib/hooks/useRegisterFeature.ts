import { useContext, useEffect, useRef, useState } from 'react';

import { RegisterContext } from '../components/RegisterContext';
import { from, Observable, Subject } from 'rxjs';
import { mergeMap, takeUntil } from 'rxjs/operators';
import { EpicReturn } from '../types';

export function useRegisterFeature(fn) {
    const [ready, setReady] = useState(false);
    const ctx = useContext(RegisterContext);
    ctx.register(fn());

    useEffect(() => {
        setReady(true);
    }, [ready]);

    return ready;
}

export function useLazyRegister(fn, condition: boolean, ctxName = 'unknown') {
    const [ready, setReady] = useState(false);
    const ctx = useContext(RegisterContext);
    const sub$ = useRef(new Subject<'unmount'>());

    useEffect(() => {
        if (condition) {
            const epics: ((...args: any[]) => EpicReturn)[] = array(fn()).reduce((acc, item) => {
                return acc.concat(item.epics);
            }, []);
            const outgoing = (action$: Observable<any>, state$: Observable<any>, deps) => {
                return from(epics).pipe(
                    mergeMap(epic => epic(action$, state$, deps)),
                    takeUntil(sub$.current),
                );
            };
            const items = fn().map(item => {
                const { epics, ...rest } = item;
                return { ...rest, epics: [] };
            });
            ctx.register(items);
            ctx.registerEpic(outgoing, ctxName);
        }
        setReady(true);
        return () => {
            sub$.current.next('unmount');
            sub$.current.unsubscribe();
        };
    }, []);

    return ready;
}

function array<T>(input: T | T[]): T[] {
    return [].concat(input as any).filter(Boolean);
}
