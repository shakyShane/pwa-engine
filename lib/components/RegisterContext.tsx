import React from 'react';

import { EpicDeps, RegisterItem } from '../types';

export const RegisterContext = React.createContext({
    register: (_: RegisterItem | RegisterItem[]) => {
        /*noop*/
    },
    epicDeps: {},
});

type RegisterContextProviderProps = {
    register(item: RegisterItem | RegisterItem[]);
    epicDeps?: Partial<EpicDeps>;
};

export class RegisterContextProvider extends React.Component<RegisterContextProviderProps> {
    register = (output: RegisterItem | RegisterItem[]) => {
        this.props.register(output);
    };
    render() {
        const { children } = this.props;

        return (
            <RegisterContext.Provider
                value={{
                    register: this.register,
                    epicDeps: this.props.epicDeps || {},
                }}
            >
                {children}
            </RegisterContext.Provider>
        );
    }
}
