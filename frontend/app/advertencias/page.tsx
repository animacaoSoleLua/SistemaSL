"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getMembers, getWarnings } from "../../lib/api";
import { getDefaultRoute, getStoredUser, isRoleAllowed, type Role } from "../../lib/auth";

interface Warning {
  id: string;
  member_id: string;
  reason: string;
  warning_date: string;
}

interface MemberSummary {
  id: string;
  name: string;
}

export default function WarningsPage() {
  const router = useRouter();
  const [currentRole, setCurrentRole] = useState<Role | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [memberMap, setMemberMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const user = getStoredUser();
    if (!user) {
      router.push("/login");
      return;
    }
    if (!isRoleAllowed(user.role, ["admin", "animador"])) {
      router.push(getDefaultRoute(user.role));
      return;
    }
    setCurrentRole(user.role);
  }, [router]);

  useEffect(() => {
    if (!currentRole) return;
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const warningsParams =
          currentRole === "animador" ? { created_by: "me" } : {};
        const [warningsResponse, membersResponse] = await Promise.all([
          getWarnings(warningsParams),
          getMembers(),
        ]);
        const members = membersResponse.data as MemberSummary[];
        const map: Record<string, string> = {};
        members.forEach((member) => {
          map[member.id] = member.name;
        });
        setMemberMap(map);
        setWarnings(warningsResponse.data as Warning[]);
      } catch (err: any) {
        setError(err.message || "Erro ao carregar advertencias.");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [currentRole]);

  const groupedMembers = useMemo(() => {
    const grouped = new Map<
      string,
      { id: string; name: string; warnings: Warning[] }
    >();
    warnings.forEach((warning) => {
      const name = memberMap[warning.member_id] ?? "Membro";
      const existing = grouped.get(warning.member_id);
      if (existing) {
        existing.warnings.push(warning);
      } else {
        grouped.set(warning.member_id, {
          id: warning.member_id,
          name,
          warnings: [warning],
        });
      }
    });
    return Array.from(grouped.values());
  }, [warnings, memberMap]);

  const filteredMembers = groupedMembers.filter((member) =>
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
              <p>
                {currentRole === "animador"
                  ? "Mostrando apenas as advertencias que voce registrou."
                  : "Veja o historico e a quantidade de advertencias."}
              </p>
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

          {loading ? (
            <div className="empty-state">
              <p>Carregando advertencias...</p>
            </div>
          ) : error ? (
            <div className="empty-state">
              <p className="text-red-500">Erro ao carregar advertencias: {error}</p>
            </div>
          ) : filteredMembers.length > 0 ? (
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
                          <span className="warning-date">{warning.warning_date}</span>
                          <span className="warning-desc">{warning.reason}</span>
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
