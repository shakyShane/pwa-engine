export function urlEntityToComponentName(urlEntity: string): string {
    return urlEntity
        .toLowerCase()
        .split('_')
        .map(name => name[0].toUpperCase() + name.slice(1))
        .join('');
}
