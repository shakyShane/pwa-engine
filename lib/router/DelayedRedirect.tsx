import React from 'react';
import { Redirect } from 'react-router-dom';
import { useDelay } from '../hooks/useDelay';

type DelayedRedirectProps = {
    to: string;
    delay?: number;
};

export const DelayedRedirect: React.FC<DelayedRedirectProps> = props => {
    const ready = useDelay(props.delay ?? 2000);
    if (ready) {
        return <Redirect to={props.to} />;
    }
    return <p>Redirecting, please wait...</p>;
};
