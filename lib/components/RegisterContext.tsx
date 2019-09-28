import React from 'react';

import { EpicDeps, RegisterItem } from '../types';
import { RegisterEpicApi } from '../store/store';

export const RegisterContext = React.createContext({
    register: (_: RegisterItem | RegisterItem[]) => {
        /*noop*/
    },
    registerEpic: (_fn, ..._args: any[]) => {
        /*noop*/
    },
    epicDeps: {},
});

type RegisterContextProviderProps = {
    register(item: RegisterItem | RegisterItem[]);
    registerEpic: RegisterEpicApi;
    epicDeps?: Partial<EpicDeps>;
};

export class RegisterContextProvider extends React.Component<RegisterContextProviderProps> {
    register = (output: RegisterItem | RegisterItem[]) => {
        this.props.register(output);
    };
    registerEpic = (fn, ...rest) => {
        this.props.registerEpic(fn, ...rest);
    };
    render() {
        const { children } = this.props;

        return (
            <RegisterContext.Provider
                value={{
                    register: this.register,
                    registerEpic: this.registerEpic,
                    epicDeps: this.props.epicDeps || {},
                }}
            >
                {children}
            </RegisterContext.Provider>
        );
    }
}
