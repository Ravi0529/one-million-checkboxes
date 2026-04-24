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
    const pipeline = redis.pipeline();

    for (let i = start; i < end; i++) {
      pipeline.getbit(CHECKBOX_BITMAP_KEY, i);
    }

    const results = await pipeline.exec();

    if (!results) {
      throw new Error("Failed to read checkbox range");
    }

    return results.map(([error, value]) => {
      if (error) {
        throw error;
      }

      return Number(value ?? 0);
    });
  },

  async getOwners(ids: number[]): Promise<Record<number, string>> {
    if (ids.length === 0) {
      return {};
    }

    const pipeline = redis.pipeline();

    ids.forEach((id) => {
      pipeline.get(getOwnerKey(id));
    });

    const results = await pipeline.exec();

    if (!results) {
      throw new Error("Failed to read checkbox owners");
    }

    return ids.reduce<Record<number, string>>((acc, id, index) => {
      const entry = results[index];

      if (!entry) {
        return acc;
      }

      const [error, value] = entry;

      if (error) {
        throw error;
      }

      if (typeof value === "string" && value.length > 0) {
        acc[id] = value;
      }

      return acc;
    }, {});
  },
};
