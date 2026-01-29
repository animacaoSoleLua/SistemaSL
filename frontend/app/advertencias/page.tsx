"use client";

import { useState } from "react";
import Link from "next/link";

// Mock data, replace with API calls
const members = [
  {
    id: 1,
    name: "João da Silva",
    warnings: [
      { id: 1, date: "2024-01-15", description: "Falta injustificada." },
      { id: 2, date: "2024-02-01", description: "Atraso na entrega de tarefas." },
    ],
  },
  {
    id: 2,
    name: "Maria Oliveira",
    warnings: [],
  },
];

export default function WarningsPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredMembers = members.filter((member) =>
    member.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <main className="app-page">
      <section className="shell reveal">
        <header className="page-header">
          <div>
            <h1 className="hero-title">Advertencias</h1>
            <p className="hero-copy">
              Registre e acompanhe advertencias dos membros.
            </p>
          </div>
          <Link className="button" href="/nova-advertencia">
            + Nova Advertencia
          </Link>
        </header>

        <section className="report-panel">
          <div className="report-header">
            <div>
              <h2 className="section-title">Membros e ocorrencias</h2>
              <p>Veja o historico e a quantidade de advertencias.</p>
            </div>
            <label className="field report-search">
              <span>Buscar</span>
              <input
                type="text"
                placeholder="Digite o nome do membro"
                className="input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </label>
          </div>

          {filteredMembers.length > 0 ? (
            <div className="warning-list">
              {filteredMembers.map((member) => (
                <article key={member.id} className="warning-card">
                  <div className="warning-header">
                    <div className="warning-meta">
                      <strong className="warning-name">{member.name}</strong>
                      <span className="warning-count">
                        {member.warnings.length} advertencia(s)
                      </span>
                    </div>
                    <Link className="button secondary small" href="/nova-advertencia">
                      Nova advertencia
                    </Link>
                  </div>

                  {member.warnings.length > 0 ? (
                    <ul className="warning-items">
                      {member.warnings.map((warning) => (
                        <li key={warning.id} className="warning-item">
                          <span className="warning-date">{warning.date}</span>
                          <span className="warning-desc">{warning.description}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="helper">
                      Nenhuma advertencia registrada para este membro.
                    </p>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <span className="empty-state-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M12 9v4m0 4h.01M10.29 3.86l-7.4 13.03A2 2 0 004.62 20h14.76a2 2 0 001.73-3.11l-7.4-13.03a2 2 0 00-3.42 0z" />
                </svg>
              </span>
              <p>Nenhuma advertencia encontrada</p>
              <p className="helper">
                Comece registrando a primeira advertencia.
              </p>
              <Link className="button" href="/nova-advertencia">
                + Criar Advertencia
              </Link>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
