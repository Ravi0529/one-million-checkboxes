import { checkboxRepository } from "./checkbox.repository";
import {
  CheckboxStats,
  RangeData,
  ToggleCheckboxPayload,
  ToggleResult,
} from "./checkbox.types";

export const checkboxService = {
  async toggle(
    payload: ToggleCheckboxPayload,
    userId: string,
  ): Promise<ToggleResult | null> {
    const { id } = payload;

    const result = await checkboxRepository.toggleAtomic(id, userId);

    if (result.status === -1) {
      return null;
    }

    return {
      id,
      checked: result.status === 1,
      userId: result.owner!,
    };
  },

  async getRange(start: number, end: number): Promise<RangeData> {
    if (start < 0 || end > 1_000_000 || start >= end) {
      throw new Error("Invalid range");
    }

    const data = await checkboxRepository.getRange(start, end);
    const checkedIds = data.reduce<number[]>((acc, value, index) => {
      if (value === 1) {
        acc.push(start + index);
      }

      return acc;
    }, []);
    const owners = await checkboxRepository.getOwners(checkedIds);

    return {
      start,
      end,
      data,
      owners,
    };
  },

  async getStats(): Promise<CheckboxStats> {
    const [activeUsers, checkedCount] = await Promise.all([
      checkboxRepository.getActiveUsersCount(),
      checkboxRepository.getCheckedCount(),
    ]);

    return {
      activeUsers,
      checkedCount,
    };
  },
};
