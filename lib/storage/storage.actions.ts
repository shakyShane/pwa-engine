import { ActionMap, createMsg } from 'action-typed';

export enum StorageActions {
    Set = 'Storage/Set',
    Delete = 'Storage/Delete',

    SetCookie = 'Storage/SetCookie',
    DeleteCookie = 'Storage/DeleteCookie',
}

export type Messages = {
    [StorageActions.Set]: { key: string; value: any; expiry: number };
    [StorageActions.Delete]: string;

    [StorageActions.SetCookie]: { key: string; value: any; expiry?: number };
    [StorageActions.DeleteCookie]: string;
};

export const Msg = createMsg<Messages>();
export const StorageMsg = Msg;
export type TypeMap = ActionMap<Messages>;
export type Actions = TypeMap[keyof TypeMap];
