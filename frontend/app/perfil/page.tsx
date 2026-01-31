"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMember } from "../../lib/api";
import {
  getDefaultRoute,
  getStoredUser,
  isRoleAllowed,
  roleLabels,
  type Role,
} from "../../lib/auth";

interface WarningItem {
  id: string;
  reason: string;
  warning_date: string;
}

interface SuspensionInfo {
  status: "active" | "suspended";
  start_date: string | null;
  end_date: string | null;
}

interface MemberDetail {
  id: string;
  name: string;
  email: string;
  role: Role;
  warnings: WarningItem[];
  warnings_total: number;
  suspension: SuspensionInfo;
}

export default function PerfilPage() {
  const router = useRouter();
  const [member, setMember] = useState<MemberDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const user = getStoredUser();
    if (!user) {
      router.push("/login");
      return;
    }
    if (!isRoleAllowed(user.role, ["recreador"])) {
      router.push(getDefaultRoute(user.role));
      return;
    }
    const loadProfile = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await getMember(user.id);
        setMember(response.data as MemberDetail);
      } catch (err: any) {
        setError(err.message || "Erro ao carregar perfil.");
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, [router]);

  return (
    <main className="app-page">
      <section className="shell reveal">
        <header className="page-header">
          <div>
            <h1 className="hero-title">Meu Perfil</h1>
            <p className="hero-copy">Veja suas informacoes e advertencias.</p>
          </div>
        </header>

        {loading ? (
          <div className="empty-state">
            <p>Carregando perfil...</p>
          </div>
        ) : error ? (
          <div className="empty-state">
            <p className="text-red-500">Erro ao carregar perfil: {error}</p>
          </div>
        ) : member ? (
          <>
            <section className="dashboard-grid">
              <article className="summary-card">
                <div className="summary-head">
                  <span className="summary-label">Nome</span>
                </div>
                <strong className="summary-value">{member.name}</strong>
              </article>
              <article className="summary-card">
                <div className="summary-head">
                  <span className="summary-label">Email</span>
                </div>
                <strong className="summary-value">{member.email}</strong>
              </article>
              <article className="summary-card">
                <div className="summary-head">
                  <span className="summary-label">Papel</span>
                </div>
                <strong className="summary-value">{roleLabels[member.role]}</strong>
              </article>
              <article className="summary-card">
                <div className="summary-head">
                  <span className="summary-label">Status</span>
                </div>
                <strong className="summary-value">
                  {member.suspension.status === "suspended"
                    ? "Suspenso"
                    : "Ativo"}
                </strong>
              </article>
            </section>

            <section className="report-panel">
              <div className="report-header">
                <div>
                  <h2 className="section-title">Minhas advertencias</h2>
                  <p>
                    Total de advertencias: {member.warnings_total}
                  </p>
                </div>
              </div>

              {member.warnings.length > 0 ? (
                <div className="warning-list">
                  <article className="warning-card">
                    <div className="warning-header">
                      <div className="warning-meta">
                        <strong className="warning-name">Advertencias</strong>
                        <span className="warning-count">
                          {member.warnings.length} advertencia(s)
                        </span>
                      </div>
                    </div>
                    <ul className="warning-items">
                      {member.warnings.map((warning) => (
                        <li key={warning.id} className="warning-item">
                          <span className="warning-date">{warning.warning_date}</span>
                          <span className="warning-desc">{warning.reason}</span>
                        </li>
                      ))}
                    </ul>
                  </article>
                </div>
              ) : (
                <div className="empty-state">
                  <p>Nenhuma advertencia registrada.</p>
                </div>
              )}
            </section>
          </>
        ) : (
          <div className="empty-state">
            <p>Perfil nao encontrado.</p>
          </div>
        )}
      </section>
    </main>
  );
}
