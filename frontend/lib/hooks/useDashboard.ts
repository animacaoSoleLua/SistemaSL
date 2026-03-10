import useSWR from "swr";
import { getDashboardSummary, getDashboardQuality, getReports } from "../api";

export function useDashboard() {
  const { data: summaryData, error: summaryError, isLoading: summaryLoading } = useSWR(
    "dashboard/resumo",
    () => getDashboardSummary(),
    { revalidateOnFocus: false, dedupingInterval: 60_000 }
  );

  const { data: qualityData, error: qualityError, isLoading: qualityLoading } = useSWR(
    "dashboard/qualidade",
    () => getDashboardQuality(),
    { revalidateOnFocus: false, dedupingInterval: 60_000 }
  );

  const { data: reportsData, error: reportsError, isLoading: reportsLoading } = useSWR(
    "relatorios",
    () => getReports(),
    { revalidateOnFocus: false, dedupingInterval: 30_000 }
  );

  return {
    summary: summaryData?.data ?? null,
    quality: qualityData?.data ?? null,
    reports: (reportsData?.data as unknown[]) ?? [],
    isLoading: summaryLoading || qualityLoading || reportsLoading,
    error: summaryError || qualityError || reportsError,
  };
}
