import { redis } from "../../config/redis";
import { CHECKBOX_BITMAP_KEY, getOwnerKey } from "./checkbox.constants";
import { TOGGLE_CHECKBOX_LUA } from "./checkbox.lua";

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

  async toggleAtomic(
    id: number,
    checked: boolean,
    userId: string,
  ): Promise<boolean> {
    const ownerKey = getOwnerKey(id);

    const result = await redis.eval(
      TOGGLE_CHECKBOX_LUA,
      2,
      CHECKBOX_BITMAP_KEY,
      ownerKey,
      id,
      userId,
      checked ? 1 : 0,
    );

    return result === 1;
  },

  async getRange(start: number, end: number): Promise<number[]> {
    const byteStart = Math.floor(start / 8);
    const byteEnd = Math.floor((end - 1) / 8);

    const buffer = await redis.getrange(
      CHECKBOX_BITMAP_KEY,
      byteStart,
      byteEnd,
    );

    const result: number[] = [];

    for (let i = start; i < end; i++) {
      const byteIndex = Math.floor(i / 8) - byteStart;
      const bitIndex = 7 - (i % 8);

      const byte = buffer.charCodeAt(byteIndex) || 0;
      const bit = (byte >> bitIndex) & 1;

      result.push(bit);
    }

    return result;
  },
};
