import { storageDeleteEpic, storageSetEpic, storageSetCookieEpic, storageDeleteCookieEpic } from './epics/storage.epic';

export function storageRegister() {
    return {
        epics: [storageSetEpic, storageDeleteEpic, storageSetCookieEpic, storageDeleteCookieEpic],
        reducers: {},
        name: 'storage',
    };
}
