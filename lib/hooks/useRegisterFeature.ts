import { useContext, useEffect, useState } from 'react';

import { RegisterContext } from '../components/RegisterContext';

export function useRegisterFeature(fn) {
    const [ready, setReady] = useState(false);
    const ctx = useContext(RegisterContext);
    ctx.register(fn());

    useEffect(() => {
        setReady(true);
    }, [ready]);

    return ready;
}
