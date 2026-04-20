import { useEffect, useState } from "react";

export interface CheckboxStore {
  get: (id: number) => number;
  subscribe: (id: number, callback: () => void) => () => void;
  setRange: (start: number, data: number[]) => void;
  updateOne: (id: number, value: number) => void;
}

export const useCheckboxValue = (id: number, store: CheckboxStore): number => {
  const [value, setValue] = useState<number>(() => store.get(id));

  useEffect(() => {
    const unsubscribe = store.subscribe(id, () => {
      setValue(store.get(id));
    });

    return unsubscribe;
  }, [id, store]);

  return value;
};
