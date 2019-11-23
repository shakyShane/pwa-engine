import { Observable, of, concat, merge, timer, zip } from 'rxjs';
import { ofType, StateObservable } from 'redux-observable';
import { LOCATION_CHANGE, LocationChangeAction, RouterState } from 'connected-react-router';
import { filter, pluck, pairwise, startWith, withLatestFrom, map, switchMap, tap, share } from 'rxjs/operators';
import { Location } from 'history';
import { Action } from 'redux';

import { ResolvedComponent, ResolveFn } from '../../utils/resolve';
import { RuntimeActions, RuntimeMsg, RuntimeState } from '../runtime.register';
import { SameBaseResolver, EpicDeps } from '../../types';

import { createRuntimeDebug } from '../../utils/runtimeDebug';
const debug = createRuntimeDebug('handleNavigation.ts');

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
        const resolveName$: Observable<string> = state$.pipe(pluck('runtime', 'resolve', 'componentName'));
        const online$: Observable<boolean> = state$.pipe(pluck('runtime', 'online'));
        const outdated$: Observable<boolean> = state$.pipe(pluck('runtime', 'outdated'));

        /**
         * Push events are the general navigation
         */
        const push$ = action$.pipe(
            ofType(LOCATION_CHANGE),
            filter(({ payload }) => payload.action === 'PUSH' || payload.action === 'REPLACE'),
            tap(x => debug('actions PUSH|REPLACE ->', x)),
            share(),
        );
        /**
         * POP happens on the back button + on first render,
         * so we check for that
         */
        const pop$ = action$.pipe(
            ofType(LOCATION_CHANGE),
            filter(({ payload }) => payload.action === 'POP'),
            tap(x => debug('actions POP ->', x)),
            filter(({ payload }) => payload.isFirstRendering === false),
            share(),
        );
        /**
         * Merged stream of push/pop
         */
        const location$ = merge(push$, pop$).pipe(
            pluck<LocationChangeAction, Location>('payload', 'location'),
            startWith(state$.value.router.location),
            pairwise(),
            share(),
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
                withLatestFrom(deps.window$),
                switchMap(
                    ([[, location]]): Observable<Action> => {
                        return concat(
                            of(
                                RuntimeMsg(RuntimeActions.SetResolving, true),
                                RuntimeMsg(RuntimeActions.ScrollTop, { duration: 0, selector: 'body' }),
                            ),
                            zip(timer(500), resolveFn(location.pathname, online$, outdated$)).pipe(
                                map(([, output]: [number, ResolvedComponent]) => {
                                    return RuntimeMsg(RuntimeActions.SetResolve, output);
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
                        of(RuntimeMsg(RuntimeActions.ScrollTop, { duration: 0, selector: scrollTo })),
                        resolveFn(location.pathname, online$, outdated$).pipe(
                            withLatestFrom(resolveName$),
                            filter(
                                ([output, prevName]: [ResolvedComponent, string]) => output.componentName !== prevName,
                            ),
                            map(([output]: [ResolvedComponent, any]) => {
                                return RuntimeMsg(RuntimeActions.SetResolve, output);
                            }),
                        ),
                    );
                }),
            ),
        );
    };
}
