export type QueryParamValue = string | number | boolean | null | undefined;

export const cleanQueryParams = <T extends Record<string, QueryParamValue>>(params: T): Partial<T> => {
  const cleaned: Partial<T> = {};

  for (const [key, value] of Object.entries(params) as Array<[keyof T, T[keyof T]]>) {
    if (value === null || value === undefined) continue;

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed.length > 0) {
        cleaned[key] = trimmed as T[keyof T];
      }
      continue;
    }

    if (typeof value === 'boolean') {
      if (value) {
        cleaned[key] = value as T[keyof T];
      }
      continue;
    }

    cleaned[key] = value;
  }

  return cleaned;
};
