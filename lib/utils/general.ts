import { Observable, timer, zip } from 'rxjs';
import { map } from 'rxjs/operators';

export function cheapClone<T>(input: T): T | undefined {
    try {
        return JSON.parse(JSON.stringify(input));
    } catch (e) {
        console.error(e);
        return undefined;
    }
}

export function assertUnreachable(msg = "Didn't expect to get here"): never {
    throw new Error(msg);
}

/**
 * Cause a stream to be delayed by a minimum amount of time.
 * This is useful to ensure spinners/loading texts have time to show/animate
 * @param input$
 * @param delay
 */
export function minDelay<T>(input$: Observable<T>, delay = 500): Observable<T> {
    return zip(timer(delay), input$).pipe(map(([, res]) => res));
}

export function appendReferrer(targetPath: string, referrer: string): string {
    return [targetPath, `referrer=${encodeURIComponent(referrer)}`].join('?');
}

export function extractReferrer(url: string): string {
    const [, search] = url.split('?');
    return new URLSearchParams(search || '').get('referrer') || '';
}
