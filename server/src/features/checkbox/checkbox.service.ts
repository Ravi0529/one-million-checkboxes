import { checkboxRepository } from "./checkbox.repository";
import { ToggleCheckboxPayload, ToggleResult } from "./checkbox.types";

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

  async getRange(start: number, end: number): Promise<number[]> {
    if (start < 0 || end > 1_000_000 || start >= end) {
      throw new Error("Invalid range");
    }

    return checkboxRepository.getRange(start, end);
  },
};
