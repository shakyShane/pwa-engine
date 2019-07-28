declare module '*.svg';
declare module '*.graphql';

interface Window {
    __REDUX_DEVTOOLS_EXTENSION_COMPOSE__?: any;
    __REDUX_STATE__?: any;
    __APOLLO_STATE__?: any;
    store: any;
    Cypress: any;
}
