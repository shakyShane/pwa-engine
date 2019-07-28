import { EMPTY, scheduled, asyncScheduler } from 'rxjs';
import { filter, mergeMap, pluck, take } from 'rxjs/operators';
import debugPkg from 'debug';

import { RuntimeEnv, RuntimeActions, RuntimeMsg, RuntimeState } from '../runtime.register';

const debug = debugPkg('jh-runtime:appEnvEpic');

export function appEnvEpic(_actions, state, deps: { env: Partial<RuntimeEnv> }) {
    const env = cheapClone(deps.env);

    if (env === undefined) {
        return EMPTY;
    }

    /**
     * Try to access a previously set ENV
     */
    const prevEnv$ = state.pipe(pluck('runtime', 'env'));

    return prevEnv$.pipe(
        /**
         * We only care about this value once
         */
        take(1),

        /**
         * runtime.env will be an empty object if it hasn't been set initially,
         * so to determine if it has/hasn't been set we look for the presence
         * of NODE_ENV;
         */
        filter((maybeEnv: RuntimeState['env']) => !Boolean(maybeEnv.NODE_ENV)),

        /**
         * If we get here, it means the ENV was NOT set, so we set it
         */
        mergeMap(() => {
            debug('new env incoming', JSON.stringify(env, null, 2));
            return scheduled([RuntimeMsg(RuntimeActions.SetEnv, env)], asyncScheduler);
        }),
    );
}

export function cheapClone<T>(input: T): T | undefined {
    try {
        return JSON.parse(JSON.stringify(input));
    } catch (e) {
        console.error(e);
        return undefined;
    }
}
