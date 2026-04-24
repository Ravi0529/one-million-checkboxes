export interface ToggleCheckboxPayload {
  id: number;
}

export interface ToggleResult {
  id: number;
  checked: boolean;
  userId: string;
}

export interface GetRangePayload {
  start: number;
  end: number;
}

export interface RangeData {
  start: number;
  end: number;
  data: number[];
  owners: Record<number, string>;
}

export interface CheckboxStats {
  activeUsers: number;
  checkedCount: number;
}
