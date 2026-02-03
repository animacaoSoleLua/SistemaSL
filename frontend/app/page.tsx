"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getDefaultRoute, getStoredUser, isRoleAllowed } from "../lib/auth";

const allowedRoles = ["admin"] as const;

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const user = getStoredUser();
    if (!user) {
      router.push("/login");
      return;
    }
    if (!isRoleAllowed(user.role, [...allowedRoles])) {
      router.push(getDefaultRoute(user.role));
    }
  }, [router]);

  return (
    <main className="app-page">
      <section className="shell reveal">
        <header className="page-header">
          <div>
            <h1 className="hero-title">Dashboard</h1>
          </div>
        </header>

        <section className="dashboard-grid">
          <article className="summary-card">
            <div className="summary-head">
              <span className="summary-label">Total de Relatórios</span>
              <span className="summary-icon">
                <svg viewBox="0 0 20 20" aria-hidden="true">
                  <path d="M6 3.5h6l3 3V16a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 5 16V5A1.5 1.5 0 0 1 6.5 3.5z" />
                  <path d="M12 3.5V7h3" />
                </svg>
              </span>
            </div>
            <strong className="summary-value">0</strong>
            <p className="summary-note">Relatórios cadastrados</p>
          </article>
          <article className="summary-card">
            <div className="summary-head">
              <span className="summary-label">Avaliação Média da Equipe</span>
              <span className="summary-icon gold">
                <svg viewBox="0 0 20 20" aria-hidden="true">
                  <path d="M10 3.5l1.9 3.9 4.3.6-3.1 3 0.7 4.3L10 13.4 6.2 15.3l0.7-4.3-3.1-3 4.3-.6z" />
                </svg>
              </span>
            </div>
            <strong className="summary-value">0.0</strong>
          </article>
          <article className="summary-card">
            <div className="summary-head">
              <span className="summary-label">Qualidade Média do Som</span>
              <span className="summary-icon gold">
                <svg viewBox="0 0 20 20" aria-hidden="true">
                  <path d="M10 3.5l1.9 3.9 4.3.6-3.1 3 0.7 4.3L10 13.4 6.2 15.3l0.7-4.3-3.1-3 4.3-.6z" />
                </svg>
              </span>
            </div>
            <strong className="summary-value">0.0</strong>
            <p className="summary-note">Avaliação do som nos eventos</p>
          </article>
          <article className="summary-card">
            <div className="summary-head">
              <span className="summary-label">Qualidade Média do Evento</span>
              <span className="summary-icon gold">
                <svg viewBox="0 0 20 20" aria-hidden="true">
                  <path d="M10 3.5l1.9 3.9 4.3.6-3.1 3 0.7 4.3L10 13.4 6.2 15.3l0.7-4.3-3.1-3 4.3-.6z" />
                </svg>
              </span>
            </div>
            <strong className="summary-value">0.0</strong>
            <p className="summary-note">Avaliação geral dos eventos</p>
          </article>
          <article className="summary-card">
            <div className="summary-head">
              <span className="summary-label">Relatórios do Mês</span>
              <span className="summary-icon">
                <svg viewBox="0 0 20 20" aria-hidden="true">
                  <rect x="3.5" y="4" width="13" height="12.5" rx="2" />
                  <path d="M6.5 2.8v2.4M13.5 2.8v2.4M3.5 8.4h13" />
                </svg>
              </span>
            </div>
            <strong className="summary-value">0</strong>
            <p className="summary-note">Eventos realizados</p>
          </article>
        </section>

        <section className="report-panel">
          <div className="report-header">
            <div>
              <h2 className="section-title">Relatórios Recentes</h2>
              <p>Últimos eventos cadastrados no sistema</p>
            </div>
            <div className="view-toggle" role="group" aria-label="Visualização">
              <button className="toggle-button active" type="button">
                <svg viewBox="0 0 20 20" aria-hidden="true">
                  <rect x="4" y="5" width="12" height="2" rx="1" />
                  <rect x="4" y="9" width="12" height="2" rx="1" />
                  <rect x="4" y="13" width="12" height="2" rx="1" />
                </svg>
              </button>
              <button className="toggle-button" type="button">
                <svg viewBox="0 0 20 20" aria-hidden="true">
                  <rect x="4" y="4" width="5" height="5" rx="1" />
                  <rect x="11" y="4" width="5" height="5" rx="1" />
                  <rect x="4" y="11" width="5" height="5" rx="1" />
                  <rect x="11" y="11" width="5" height="5" rx="1" />
                </svg>
              </button>
            </div>
          </div>
          <div className="empty-state">
            <p>Nenhum relatório cadastrado ainda</p>
          </div>
        </section>
      </section>
    </main>
  );
}
