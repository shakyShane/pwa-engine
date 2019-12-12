import { useEffect, useState } from 'react';

export function useDelay(ms = 0): boolean {
    const [ready, setReady] = useState(false);

    useEffect(() => {
        const i = setTimeout(() => setReady(true), ms);
        return () => clearTimeout(i);
    }, [ms, setReady]);

    return ready;
}
