import { useEffect, useState } from "react";
import type { CheckboxStore } from "./useCheckboxStore";

export const useCheckboxValue = (id: number, store: CheckboxStore) => {
  const [state, setState] = useState(() => ({
    value: store.get(id),
    owner: store.getOwner(id),
  }));

  useEffect(() => {
    const unsubscribe = store.subscribe(id, () => {
      setState({
        value: store.get(id),
        owner: store.getOwner(id),
      });
    });

    return unsubscribe;
  }, [id, store]);

  return state;
};
