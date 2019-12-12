import React, { useContext, useEffect } from 'react';
import { Switch } from 'react-router';

import { AsyncRouterContext } from './AsyncRouter';

type SwitchProps = {
    base: string;
    children: any;
};

export const AsyncSwitch: React.FC<SwitchProps> = props => {
    const { registerBase } = useContext(AsyncRouterContext);

    useEffect(() => registerBase(props.base.slice(1)), [props.base, registerBase]);

    return <Switch>{props.children}</Switch>;
};
