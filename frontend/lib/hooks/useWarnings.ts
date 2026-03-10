import useSWR from "swr";
import { getWarnings } from "../api";

type WarningsParams = Parameters<typeof getWarnings>[0];

export function useWarnings(params: WarningsParams = {}) {
  const key = JSON.stringify({ _hook: "warnings", ...params });

  const { data, error, isLoading, mutate } = useSWR(
    key,
    () => getWarnings(params),
    {
      revalidateOnFocus: false,
      dedupingInterval: 30_000,
    }
  );

  return {
    warnings: (data?.data as unknown[]) ?? [],
    total: (data?.total as number) ?? 0,
    pages: (data?.pages as number) ?? 1,
    isLoading,
    error,
    refresh: mutate,
  };
}
