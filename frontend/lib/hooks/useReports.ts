import useSWR from "swr";
import { getReports } from "../api";

export function useReports() {
  const { data, error, isLoading, mutate } = useSWR(
    "relatorios",
    () => getReports(),
    {
      revalidateOnFocus: false,
      dedupingInterval: 30_000,
    }
  );

  return {
    reports: (data?.data as unknown[]) ?? [],
    isLoading,
    error,
    refresh: mutate,
  };
}
