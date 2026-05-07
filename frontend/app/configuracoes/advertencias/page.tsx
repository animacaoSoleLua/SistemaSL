"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getErrorMessage, getMember } from "../../../lib/api";
import { getStoredUser } from "../../../lib/auth";

interface WarningItem {
  id: string;
  reason: string;
  warning_date: string;
  created_by_name?: string | null;
}

interface SuspensionInfo {
  status: "active" | "suspended";
  start_date: string | null;
  end_date: string | null;
}

interface MemberData {
  warnings: WarningItem[];
  warnings_total: number;
  suspension: SuspensionInfo;
}

export default function ConfiguracoesAdvertencias() {
  const router = useRouter();
  const [data, setData] = useState<MemberData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const user = getStoredUser();
    if (!user) {
      router.push("/login");
      return;
    }
    const load = async () => {
      try {
        const response = await getMember(user.id);
        setData({
          warnings: response.data.warnings,
          warnings_total: response.data.warnings_total,
          suspension: response.data.suspension,
        });
      } catch (err: unknown) {
        setError(getErrorMessage(err, "Erro ao carregar advertências."));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [router]);

  const formatDateBR = (value: string) => {
    const [year, month, day] = value.split("-");
    if (!year || !month || !day) return value;
    return `${day}/${month}/${year}`;
  };

  if (loading) return <div className="empty-state"><p>Carregando...</p></div>;
  if (error) return <div className="empty-state"><p className="text-red-500">{error}</p></div>;

  return (
    <>
      {data?.suspension.status === "suspended" && (
        <div className="suspension-alert">
          <div className="suspension-alert-title">SUSPENSÃO ATIVA</div>
          <p className="suspension-alert-text">
            Você está suspenso por 1 mês e não pode trabalhar.
          </p>
          {data.suspension.start_date && data.suspension.end_date && (
            <p className="suspension-alert-text">
              Período: {formatDateBR(data.suspension.start_date)} até{" "}
              {formatDateBR(data.suspension.end_date)}.
            </p>
          )}
        </div>
      )}
      <section className="report-panel">
        <div className="report-header">
          <div>
            <h2 className="section-title">Minhas advertências</h2>
            <p>Total de advertências: {data?.warnings_total ?? 0}</p>
          </div>
        </div>
        {data && data.warnings.length > 0 ? (
          <div className="warning-list">
            <article className="warning-card">
              <div className="warning-header">
                <div className="warning-meta">
                  <strong className="warning-name">Advertências</strong>
                  <span className="warning-count">{data.warnings.length} advertência(s)</span>
                </div>
              </div>
              <ul className="warning-items" style={{ maxHeight: "500px", overflowY: "auto" }}>
                {data.warnings.map((warning) => (
                  <li key={warning.id} className="warning-item">
                    <span className="warning-date">{formatDateBR(warning.warning_date)}</span>
                    <span className="warning-desc">{warning.reason}</span>
                    {warning.created_by_name && (
                      <span className="warning-issuer">Dada por: {warning.created_by_name}</span>
                    )}
                  </li>
                ))}
              </ul>
            </article>
          </div>
        ) : (
          <div className="empty-state">
            <p>Nenhuma advertência registrada.</p>
          </div>
        )}
      </section>
    </>
  );
}
