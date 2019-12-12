import React, { useEffect, useMemo } from 'react';
import { DispatchProp, shallowEqual, useDispatch, useSelector } from 'react-redux';
import { Action } from 'redux';
import { useLazyRegister } from '..';
import { RegisterItem } from '../types';

type Gfn = (...args: any[]) => any;

export const LazyRegister = props => {
    const ready = useLazyRegister(props.register, true, 'LazyRegister');
    if (ready && props.children) return props.children;
    return null;
};

type ReduxProps<Fn extends Gfn, P extends { [index: string]: any }> = {
    selector: Fn;
    initial?: Action;
    unmount?: Action;
    initialProps: P;
    Component: React.FC<ReturnType<Fn> & P & DispatchProp>;
};

const EMPTY_OBJ = {};

export function Redux<Fn extends Gfn, P extends { [index: string]: any }>(props: ReduxProps<Fn, P>) {
    const state = useSelector(props.selector, shallowEqual);
    const dispatch = useDispatch();
    const memoProps = useMemo(() => {
        return {
            ...state,
            ...(props.initialProps || EMPTY_OBJ),
            dispatch,
        };
    }, [state, props.initialProps, dispatch]);
    useEffect(() => {
        if (props.initial) {
            dispatch(props.initial);
        }
        return () => {
            if (props.unmount) {
                dispatch(props.unmount);
            }
        };
    }, [dispatch, props.initial, props.unmount]);
    return React.createElement(props.Component, memoProps);
}

type LazyReduxProps<Fn extends Gfn, P extends { [index: string]: any }> = {
    register: () => RegisterItem;
    selector: Fn;
    initial?: Action;
    unmount?: Action;
    initialProps: P;
    Component: React.FC<ReturnType<Fn> & P & DispatchProp>;
};

export function LazyRedux<Fn extends Gfn, P extends { [index: string]: any }>(props: LazyReduxProps<Fn, P>) {
    return (
        <LazyRegister register={props.register}>
            <Redux {...props} />
        </LazyRegister>
    );
}
