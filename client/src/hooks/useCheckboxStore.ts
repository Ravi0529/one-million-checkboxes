import { useRef } from "react";

type Listener = () => void;

export const useCheckboxStore = () => {
  const data = useRef<Map<number, number>>(new Map());
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

  const updateOne = (id: number, value: number) => {
    data.current.set(id, value);
    notify(id);
  };

  const get = (id: number) => {
    return data.current.get(id) ?? 0;
  };

  return { subscribe, setRange, updateOne, get };
};
