import { useEffect, useRef } from 'react';
import { Subject } from 'rxjs';
import { createDebug } from '../utils/runtimeDebug';

const debug = createDebug('useSubject');

export function useSubject<T extends any>({ name }: { name?: string }): Subject<T> {
    const subject$ = useRef(new Subject<T>());

    useEffect(() => {
        const ref = subject$.current;
        debug('setup', name);
        return () => {
            if (ref) {
                debug('teardown', name);
                ref.unsubscribe();
            }
        };
    }, [name, subject$]);

    return subject$.current;
}
