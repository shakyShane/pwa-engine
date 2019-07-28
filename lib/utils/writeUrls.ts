import { ApolloClient } from 'apollo-client';

import {UrlQueryInput, UrlQueryResult} from "../types";

export interface UrlEntry extends UrlQueryResult {
    urlKey: string;
}

export function createWriter(apolloClient: ApolloClient<any>, query: any) {
    return function writeUrls(urlEntries: UrlEntry[]) {
        /**
         * Try to pre-populate urls for navigation items
         */
        urlEntries.forEach(urlEntry => {
            apolloClient.writeQuery<{urlResolver: UrlQueryResult & {__typename: string}}, UrlQueryInput>({
                query,
                data: {
                    urlResolver: {
                        __typename: 'EntityUrl',
                        id: urlEntry.id,
                        type: urlEntry.type,
                        canonical_url: urlEntry.canonical_url,
                        redirect_type: urlEntry.redirect_type,
                        redirect_url: urlEntry.redirect_url,
                        relative_url: urlEntry.relative_url,
                    },
                },
                variables: {
                    urlKey: urlEntry.urlKey,
                },
            });
        });
    };
}
