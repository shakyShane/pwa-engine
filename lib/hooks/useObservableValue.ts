import { useState, useEffect, useRef, useCallback } from 'react';
import { Observable, Subject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { createDebug } from '../utils/runtimeDebug';

const debug = createDebug('useObservableValue');

export function useObservableValue<Input, Output>(
    cb: (values$: Observable<Input>) => Observable<Output>,
    initial: Output,
    name = 'unknown',
): [Output, (value: Input) => void] {
    const ref = useRef<any>(null);
    const [state, setState] = useState(initial);
    const setter = useCallback(
        val => {
            ref.current && ref.current.next(val);
        },
        [ref],
    );

    useEffect(() => {
        ref.current = new Subject<Input>();
        const sub$ = cb(ref.current)
            .pipe(tap(x => debug(name, 'next', x)))
            .subscribe(x => setState(x));

        return () => {
            debug(name, 'teardown');
            sub$.unsubscribe();
            ref.current.complete();
        };
    }, [cb, name, ref]);

    return [state, setter];
}

export const useObs = useObservableValue;
