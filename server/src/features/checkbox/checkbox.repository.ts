import { redis } from "../../config/redis";
import { CHECKBOX_BITMAP_KEY, getOwnerKey } from "./checkbox.constants";

export const checkboxRepository = {
  async getOwner(id: number) {
    return redis.get(getOwnerKey(id));
  },

  async setOwner(id: number, userId: string) {
    return redis.set(getOwnerKey(id), userId);
  },

  async removeOwner(id: number) {
    return redis.del(getOwnerKey(id));
  },

  async setChecked(id: number, value: boolean) {
    return redis.setbit(CHECKBOX_BITMAP_KEY, id, value ? 1 : 0);
  },

  async getChecked(id: number) {
    return redis.getbit(CHECKBOX_BITMAP_KEY, id);
  },
};
