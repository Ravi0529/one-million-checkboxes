import { checkboxRepository } from "./checkbox.repository";
import { ToggleCheckboxPayload, ToggleResult } from "./checkbox.types";

export const checkboxService = {
  async toggle(
    payload: ToggleCheckboxPayload,
    userId: string,
  ): Promise<ToggleResult | null> {
    const { id, checked } = payload;

    const owner = await checkboxRepository.getOwner(id);

    if (checked) {
      if (!owner) {
        await checkboxRepository.setOwner(id, userId);
        await checkboxRepository.setChecked(id, true);

        return { id, checked: true, userId };
      }

      return null;
    }

    if (owner === userId) {
      await checkboxRepository.removeOwner(id);
      await checkboxRepository.setChecked(id, false);

      return { id, checked: false, userId };
    }

    const success = await checkboxRepository.toggleAtomic(id, checked, userId);

    if (!success) return null;

    return {
      id,
      checked,
      userId,
    };
  },

  async getRange(start: number, end: number): Promise<number[]> {
    if (start < 0 || end > 1_000_000 || start >= end) {
      throw new Error("Invalid range");
    }

    return checkboxRepository.getRange(start, end);
  },
};
