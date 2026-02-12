export type QueryParamValue = string | number | boolean | null | undefined;

export const cleanQueryParams = <T extends Record<string, QueryParamValue>>(params: T): Partial<T> => {
  const cleanedEntries = Object.entries(params).flatMap(([key, value]) => {
    if (value === null || value === undefined) return [];

    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed.length > 0 ? [[key, trimmed]] : [];
    }

    if (typeof value === 'boolean') {
      return value ? [[key, value]] : [];
    }

    return [[key, value]];
  });

  return Object.fromEntries(cleanedEntries) as Partial<T>;
};
