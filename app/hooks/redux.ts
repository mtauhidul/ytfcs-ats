// app/hooks/redux.ts
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "~/store";

// Use throughout your app instead of plain `useDispatch` and `useSelector`
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector = <T>(selector: (state: RootState) => T) =>
  useSelector(selector);
