import { useContext, useEffect } from 'react';
import { AsyncRouterContext } from './AsyncRouter';

export function useSetResolved(fn?: () => boolean) {
    const { complete } = useContext(AsyncRouterContext);
    useEffect(() => {
        if (!fn || (fn && fn())) {
            complete(true);
        }
    }, [complete, fn]);
}
