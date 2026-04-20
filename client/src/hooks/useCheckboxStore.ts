import { useRef } from "react";

type Listener = () => void;

export type CheckboxStore = ReturnType<typeof useCheckboxStore>;

export const useCheckboxStore = () => {
  const data = useRef<Map<number, number>>(new Map());
  const owners = useRef<Map<number, string>>(new Map());
  const listeners = useRef<Map<number, Set<Listener>>>(new Map());

  const subscribe = (id: number, listener: Listener) => {
    if (!listeners.current.has(id)) {
      listeners.current.set(id, new Set());
    }

    listeners.current.get(id)!.add(listener);

    return () => {
      listeners.current.get(id)?.delete(listener);
    };
  };

  const notify = (id: number) => {
    listeners.current.get(id)?.forEach((l) => l());
  };

  const setRange = (start: number, values: number[]) => {
    values.forEach((value, index) => {
      const id = start + index;
      data.current.set(id, value);
      notify(id);
    });
  };

  const updateOne = (id: number, value: number, userId?: string) => {
    data.current.set(id, value);

    if (userId) {
      if (value === 1) owners.current.set(id, userId);
      else owners.current.delete(id);
    }

    notify(id);
  };

  const get = (id: number) => data.current.get(id) ?? 0;

  const getOwner = (id: number) => owners.current.get(id);

  return { subscribe, setRange, updateOne, get, getOwner };
};
