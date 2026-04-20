export const validateRange = (start: number, end: number) => {
  if (
    typeof start !== "number" ||
    typeof end !== "number" ||
    start < 0 ||
    end > 1_000_000 ||
    start >= end ||
    end - start > 1000
  ) {
    return false;
  }

  return true;
};
