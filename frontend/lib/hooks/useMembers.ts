import useSWR from "swr";
import { getMembers } from "../api";

type MembersParams = Parameters<typeof getMembers>[0];

export function useMembers(params: MembersParams = {}) {
  const key = JSON.stringify({ _hook: "members", ...params });

  const { data, error, isLoading, mutate } = useSWR(
    key,
    () => getMembers(params),
    {
      revalidateOnFocus: false,
      dedupingInterval: 30_000,
    }
  );

  return {
    members: (data?.data as unknown[]) ?? [],
    isLoading,
    error,
    refresh: mutate,
  };
}
