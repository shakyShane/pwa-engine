import { Observable, of, concat, merge, asyncScheduler } from 'rxjs';
import { ofType, StateObservable } from 'redux-observable';
import { LOCATION_CHANGE, LocationChangeAction, RouterState } from 'connected-react-router';
import {
    delay,
    filter,
    pluck,
    mergeMap,
    subscribeOn,
    pairwise,
    startWith,
    withLatestFrom,
    map,
    switchMap,
} from 'rxjs/operators';
import { Location } from 'history';
import { Action } from 'redux';

import { ResolvedComponent, ResolveFn } from '../../utils/resolve';
import { RuntimeActions, RuntimeMsg, RuntimeState } from '../runtime.register';
import { SameBaseResolver, EpicDeps } from '../../types';

/**
 * To prevent navigations within the same route component,
 * we can just check if the first segment of the URL matches the previous one
 */
const isSameBase: SameBaseResolver = ([prev, next]: [Location, Location]) => {
    const prevStripped = prev.pathname.replace(/^\//, '');
    const nextStripped = next.pathname.replace(/^\//, '');
    const [prevBase] = prevStripped.split('/');
    const [nextBase] = nextStripped.split('/');
    return prevBase === nextBase;
};

export function getNavigationHandler(resolveFn: ResolveFn) {
    return function handleNavigation(
        action$: Observable<any>,
        state$: StateObservable<{ runtime: RuntimeState; router: RouterState }>,
        deps: EpicDeps,
    ): Observable<Action> {
        const online$: Observable<boolean> = state$.pipe(pluck('runtime', 'online'));
        const outdated$: Observable<boolean> = state$.pipe(pluck('runtime', 'outdated'));

        /**
         * Push events are the general navigation
         */
        const push$ = action$.pipe(
            ofType(LOCATION_CHANGE),
            filter(({ payload }) => payload.action === 'PUSH'),
        );
        /**
         * POP happens on the back button + on first render,
         * so we check for that
         */
        const pop$ = action$.pipe(
            ofType(LOCATION_CHANGE),
            filter(({ payload }) => payload.action === 'POP'),
            filter(({ payload }) => payload.isFirstRendering === false),
        );
        /**
         * Merged stream of push/pop
         */
        const location$ = merge(push$, pop$).pipe(
            pluck<LocationChangeAction, Location>('payload', 'location'),
            startWith(state$.value.router.location),
            pairwise(),
            startWith([state$.value.router.location, state$.value.router.location]),
        ) as Observable<[Location, Location]>;

        /**
         * Same-base resolvers give a way to skip
         */
        const fns = deps.sameBaseResolvers || [isSameBase];

        /**
         * Now split the stream based on whether or not we're
         * rendering the same root component, or a different one.
         *
         * The difference is that when rendering a NEW component type,
         * we want to go through the fade-out/fade-in cycle
         */
        const isSameBase$ = location$.pipe(filter(x => fns.every(fn => fn(x))));
        const notSameBase$ = location$.pipe(filter(x => fns.some(fn => !fn(x))));

        /**
         * Outdated nav actions just trigger a reload
         */
        const outdatedNavs$ = location$.pipe(
            withLatestFrom(outdated$),
            filter(([, outdated]) => outdated),
        );

        return merge(
            outdatedNavs$.pipe(
                map(() => {
                    return RuntimeMsg(RuntimeActions.Reload);
                }),
            ),
            notSameBase$.pipe(
                switchMap(
                    ([, location]): Observable<Action> => {
                        const scrollTo = location.state && location.state.scrollTo ? location.state.scrollTo : 'body';

                        return concat(
                            of(RuntimeMsg(RuntimeActions.SetResolving, true)),
                            of(RuntimeMsg(RuntimeActions.ScrollTop, { duration: 300, selector: scrollTo })).pipe(
                                delay(300),
                            ),
                            resolveFn(location.pathname, online$, outdated$).pipe(
                                mergeMap((output: ResolvedComponent) => {
                                    return concat(
                                        of(RuntimeMsg(RuntimeActions.SetResolve, output)).pipe(delay(300)),
                                        of(RuntimeMsg(RuntimeActions.SetResolving, false)).pipe(
                                            subscribeOn(asyncScheduler),
                                        ),
                                    );
                                }),
                            ),
                        );
                    },
                ),
            ),
            isSameBase$.pipe(
                switchMap(([, location]) => {
                    const scrollTo = location.state && location.state.scrollTo ? location.state.scrollTo : 'body';

                    return concat(
                        of(RuntimeMsg(RuntimeActions.ScrollTop, { duration: 300, selector: scrollTo })),
                        resolveFn(location.pathname, online$, outdated$).pipe(
                            mergeMap((output: ResolvedComponent) => {
                                return concat(
                                    of(RuntimeMsg(RuntimeActions.SetResolve, output)),
                                    of(RuntimeMsg(RuntimeActions.SetResolving, false)),
                                );
                            }),
                        ),
                    );
                }),
            ),
        );
    };
}
