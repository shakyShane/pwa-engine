import { useContext } from 'react';
import { RegisterContext } from '../components/RegisterContext';
import { EpicDeps } from '../types';

export function useEpicDeps(): EpicDeps {
    const { epicDeps } = useContext(RegisterContext);
    return epicDeps as EpicDeps;
}
