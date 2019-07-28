import React from 'react';
import classnames from 'classnames';
import { connect } from 'react-redux';

import { ResolvedComponent } from '../utils/resolve';
import { RuntimeState } from '../feature/runtime.register';

type AltComponentLoaderProps = {
    resolving: boolean;
    resolve: ResolvedComponent;
};

export const AsyncComponentLoader: React.FunctionComponent<AltComponentLoaderProps> = props => {
    return (
        <div
            className={classnames({
                ['opacity-0']: props.resolving,
                ['opacity-1']: !props.resolving,
            })}
        >
            {props.resolve.Cmp && (
                <props.resolve.Cmp id={props.resolve.id} key={props.resolve.urlKey} pathname={props.resolve.urlKey} />
            )}
        </div>
    );
};

export const AsyncComponentLoaderConnected = connect((state: { runtime: RuntimeState }) => {
    return {
        resolve: state.runtime.resolve,
        resolving: state.runtime.resolving,
    };
})(AsyncComponentLoader);
