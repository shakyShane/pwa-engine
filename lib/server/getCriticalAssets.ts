import { readFileSync } from 'fs';
import { join } from 'path';

import dlv from 'dlv';

export type Stats = {
    [chunkName: string]: {
        chunks: number[];
        assets: string[];
        children: {};
        childAssets: {};
    };
};

export type CriticalAssets = {
    js: string;
    css: string;
};

export function getCriticalAssets(stats: Stats, base: string): CriticalAssets {
    const css = dlv(stats, ['client', 'assets'], []).filter(x => x.match(/\.css$/));
    const js = dlv(stats, ['client', 'assets'], []).filter(x => x.match(/runtime~client-(.+?)\.js$/));

    const output = {
        css: css.map(x => readFileSync(join(base, x))).join('\n'),
        js: js.map(js => readFileSync(join(base, js))).join('\n'),
    };

    return output;
}

export function getJsEntryPointFilePaths(stats: Stats): string[] {
    const entries = dlv(stats, ['client', 'assets'], []);
    return entries.filter(x => x.match(/\.js$/)).filter(x => !x.match(/runtime~client/));
}

export function getAssetsForType(componentNames: string[], stats: Stats): { css: string[]; js: string[] } {
    if (!componentNames.length) {
        return { js: [], css: [] };
    }
    const typeName = componentNames[0];
    const asRootName = `${typeName}_root`;

    const firstMatch: string[] = Object.keys(stats)
        .filter(x => x === asRootName)
        .map(x => stats[x].assets)[0];

    if (!firstMatch) {
        return { js: [], css: [] };
    }

    const js = firstMatch.filter(x => Boolean(x.match(/\.js$/)));
    const css = firstMatch.filter(x => Boolean(x.match(/\.css$/)));

    return {
        js,
        css,
    };
}
