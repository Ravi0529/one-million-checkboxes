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

    return null;
  },
};
