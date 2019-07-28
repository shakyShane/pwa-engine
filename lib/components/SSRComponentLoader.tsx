import React from 'react';
import classnames from 'classnames';

import { ResolvedComponent } from '../utils/resolve';

type AltComponentLoaderProps = {
    resolve: ResolvedComponent;
};

export const SSRComponentLoader: React.FunctionComponent<AltComponentLoaderProps> = props => {
    return (
        <div
            className={classnames({
                ['opacity-1']: true,
            })}
        >
            {props.resolve.Cmp && (
                <props.resolve.Cmp id={props.resolve.id} key={props.resolve.urlKey} pathname={props.resolve.urlKey} />
            )}
        </div>
    );
};
