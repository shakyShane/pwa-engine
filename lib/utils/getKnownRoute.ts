interface TestFn {
    (pathname: string): boolean;
}

export type RouteData = {
    test: string | TestFn;
    value: {
        type: string;
        id: number;
        __typename: string;
        [index: string]: any;
    };
};

export function getKnownRoute(pathname: string, knownRoutes: RouteData[]): any | undefined {
    return knownRoutes
        .filter(route => {
            if (typeof route.test === 'string') {
                return pathname.indexOf(route.test) === 0;
            }
            if (typeof route.test === 'function') {
                return route.test(pathname);
            }
            return false;
        })
        .map(route => route.value)[0];
}
