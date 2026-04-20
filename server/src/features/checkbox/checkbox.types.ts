export interface ToggleCheckboxPayload {
  id: number;
  checked: boolean;
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
}
