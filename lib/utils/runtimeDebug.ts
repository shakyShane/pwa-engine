import debugPkg from 'debug';

export function createDebug(name: string) {
    return debugPkg(`pwa-engine:${name}`);
}
