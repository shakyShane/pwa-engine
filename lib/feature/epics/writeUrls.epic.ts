import {
    catchError,
    ignoreElements,
    subscribeOn,
    tap,
} from 'rxjs/operators';
import {asyncScheduler, of} from 'rxjs';
import { ofType } from 'redux-observable';

import { Actions, RuntimeActions, RuntimeMsg, TypeMap } from '../runtime.register';
import { UrlEntry } from '../../utils/writeUrls';

export function createWriteUrlsEpic(writer: (urlEntries: UrlEntry[]) => void) {
    return function writeUrlsEpic(action$) {
        return action$.pipe(
            /**
             * Accept an action containing UrlEntry[]
             */
            ofType<Actions, TypeMap[RuntimeActions.WriteUrls]>(RuntimeActions.WriteUrls),
            subscribeOn(asyncScheduler),
            /**
             * Now write an entry into the cache, this prevent
             * urlResolver lookups in the future
             */
            tap((entries: UrlEntry[]) => writer(entries)),
            /**
             * We don't want to produce any actions from this, so just ignore everything from this point
             */
            ignoreElements(),
            /**
             * Generic error handler to catch bugs with any 'logic' above.
             */
            catchError(err => {
                console.error(err);
                return of(
                    RuntimeMsg(RuntimeActions.Log, ['An error occurred trying to write urls to the local cache', err]),
                );
            }),
        );
    }
}
