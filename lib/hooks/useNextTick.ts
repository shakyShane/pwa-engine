import { useEffect, useState } from 'react';

/**
 * Prevent an element from being rendered synchronously
 *
 * This is useful for preventing something from being Server Side Rendered
 *
 */
export function useNextTick(): boolean {
    const [ready, setReady] = useState(false);

    useEffect(() => {
        setReady(true);
    }, []);

    return ready;
}
