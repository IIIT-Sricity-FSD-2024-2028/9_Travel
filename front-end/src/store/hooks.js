import { useDispatch, useSelector } from 'react-redux';

/** App-wide aliases so components import Redux hooks from one place. */
export const useAppDispatch = useDispatch;
export const useAppSelector = useSelector;
