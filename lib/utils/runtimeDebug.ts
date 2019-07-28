import debugPkg from 'debug';

export function createRuntimeDebug(name: string) {
    return debugPkg(`pwa-engine:${name}`);
}
