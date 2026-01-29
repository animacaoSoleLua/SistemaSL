"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getReports } from "../../lib/api";

interface Report {
  id: string;
  contractor_name: string;
  event_date: string;
}

export default function RelatoriosPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getReports()
      .then((data) => {
        setReports(data.data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const filteredReports = reports.filter((report) =>
    report.contractor_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <main className="app-page">
      <section className="shell reveal">
        <header className="page-header">
          <div>
            <h1 className="hero-title">Relatórios</h1>
            <p className="hero-copy">Gerencie os relatórios de eventos</p>
          </div>
          <Link className="button" href="/novo-relatorio">
            + Novo Relatório
          </Link>
        </header>

        <section className="report-panel">
          <div className="report-header">
            <div>
              <h2 className="section-title">Lista de relatórios</h2>
              <p>Encontre um relatório pelo nome do contratante ou data.</p>
            </div>
            <label className="field report-search">
              <span>Buscar</span>
              <input
                type="text"
                placeholder="Digite o nome do contratante"
                className="input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </label>
          </div>

          {loading ? (
            <div className="empty-state">
              <p>Carregando relatórios...</p>
            </div>
          ) : error ? (
            <div className="empty-state">
              <p className="text-red-500">Erro ao carregar relatórios: {error}</p>
            </div>
          ) : filteredReports.length > 0 ? (
            <div className="report-list">
              {filteredReports.map((report) => (
                <article className="report-item" key={report.id}>
                  <div className="report-meta">
                    <strong className="report-name">{report.contractor_name}</strong>
                    <span className="report-date">{report.event_date}</span>
                  </div>
                  <Link className="button secondary small" href={`/relatorios/${report.id}`}>
                    Ver
                  </Link>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <span className="empty-state-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </span>
              <p>Nenhum relatório encontrado</p>
              <p className="helper">Comece criando seu primeiro relatório de evento.</p>
              <Link className="button" href="/novo-relatorio">
                + Criar Relatório
              </Link>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
