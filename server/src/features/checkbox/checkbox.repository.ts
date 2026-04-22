import { redis } from "../../config/redis";
import { CHECKBOX_BITMAP_KEY, getOwnerKey } from "./checkbox.constants";
import { TOGGLE_CHECKBOX_LUA } from "./checkbox.lua";

export const checkboxRepository = {
  async getChecked(id: number) {
    return redis.getbit(CHECKBOX_BITMAP_KEY, id);
  },

  async toggleAtomic(
    id: number,
    userId: string,
  ): Promise<{ status: number; owner: string | null }> {
    const ownerKey = getOwnerKey(id);

    const result = (await redis.eval(
      TOGGLE_CHECKBOX_LUA,
      2,
      CHECKBOX_BITMAP_KEY,
      ownerKey,
      id,
      userId,
    )) as [number, string | null];

    console.log("LUA TOGGLE:", id, userId);

    return {
      status: result[0],
      owner: result[1],
    };
  },

  async getRange(start: number, end: number): Promise<number[]> {
    const byteStart = Math.floor(start / 8);
    const byteEnd = Math.floor((end - 1) / 8);

    const raw = await redis.getrange(CHECKBOX_BITMAP_KEY, byteStart, byteEnd);

    const buffer = Buffer.from(raw, "latin1");

    const result: number[] = [];

    for (let i = start; i < end; i++) {
      const byteIndex = Math.floor(i / 8) - byteStart;
      const bitIndex = 7 - (i % 8);

      const byte = buffer[byteIndex] ?? 0;
      const bit = (byte >> bitIndex) & 1;

      result.push(bit);
    }

    return result;
  },
};
