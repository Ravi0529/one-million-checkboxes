import { useRef, useState } from "react";

export const useCheckboxStore = () => {
  const store = useRef<Map<number, number>>(new Map());

  const [, forceRender] = useState(0);

  const setRange = (start: number, data: number[]) => {
    data.forEach((value, index) => {
      store.current.set(start + index, value);
    });

    forceRender((x) => x + 1);
  };

  const updateOne = (id: number, value: number) => {
    store.current.set(id, value);
    forceRender((x) => x + 1);
  };

  const get = (id: number) => {
    return store.current.get(id) ?? 0;
  };

  return { setRange, updateOne, get };
};
