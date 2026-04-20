import { redis } from "../config/redis";

const WINDOW = 5;
const LIMIT = 20;

export const rateLimiter = {
  async isAllowed(userId: string): Promise<boolean> {
    const key = `rate_limit:${userId}`;

    const count = await redis.incr(key);

    if (count === 1) {
      await redis.expire(key, WINDOW);
    }

    return count <= LIMIT;
  },
};
