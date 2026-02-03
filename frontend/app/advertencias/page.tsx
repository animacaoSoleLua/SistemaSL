"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createWarning,
  deleteWarning,
  getMembers,
  getWarnings,
  updateWarning,
} from "../../lib/api";
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
  const [members, setMembers] = useState<MemberSummary[]>([]);
  const [memberMap, setMemberMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingWarning, setEditingWarning] = useState<Warning | null>(null);
  const [creatingWarning, setCreatingWarning] = useState(false);
  const [newMemberId, setNewMemberId] = useState("");
  const [newReason, setNewReason] = useState("");
  const [newDate, setNewDate] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [editReason, setEditReason] = useState("");
  const [editDate, setEditDate] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

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
        setMembers(members);
        setMemberMap(map);
        setWarnings(warningsResponse.data as Warning[]);
      } catch (err: any) {
        setError(err.message || "Erro ao carregar advertências.");
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

  const formatDateBR = (value: string) => {
    const [year, month, day] = value.split("-");
    if (!year || !month || !day) {
      return value;
    }
    return `${day}/${month}/${year}`;
  };

  const openEditModal = (warning: Warning) => {
    setEditingWarning(warning);
    setEditReason(warning.reason);
    setEditDate(warning.warning_date);
    setActionError(null);
  };

  const closeEditModal = () => {
    setEditingWarning(null);
    setEditReason("");
    setEditDate("");
  };

  const openCreateModal = () => {
    setNewMemberId("");
    setNewReason("");
    setNewDate("");
    setMemberSearch("");
    setCreateError(null);
    setCreatingWarning(true);
  };

  const closeCreateModal = () => {
    setCreatingWarning(false);
    setNewMemberId("");
    setNewReason("");
    setNewDate("");
    setMemberSearch("");
    setCreateError(null);
  };

  const handleEditSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingWarning) return;
    const trimmedReason = editReason.trim();
    if (!trimmedReason || !editDate) {
      setActionError("Preencha a descrição e a data.");
      return;
    }
    setActionLoadingId(editingWarning.id);
    setActionError(null);
    try {
      const response = await updateWarning(editingWarning.id, {
        reason: trimmedReason,
        warning_date: editDate,
      });
      const updated = response?.data as { id: string; reason: string; warning_date: string };
      setWarnings((prev) =>
        prev.map((warning) =>
          warning.id === updated.id
            ? { ...warning, reason: updated.reason, warning_date: updated.warning_date }
            : warning
        )
      );
      closeEditModal();
    } catch (err: any) {
      setActionError(err.message || "Erro ao atualizar advertência.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (warning: Warning) => {
    if (!window.confirm("Deseja excluir esta advertência?")) {
      return;
    }
    setActionLoadingId(warning.id);
    setActionError(null);
    try {
      await deleteWarning(warning.id);
      setWarnings((prev) => prev.filter((item) => item.id !== warning.id));
    } catch (err: any) {
      setActionError(err.message || "Erro ao excluir advertência.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCreateWarning = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newMemberId || !newReason.trim() || !newDate) {
      setCreateError("Preencha membro, descrição e data.");
      return;
    }
    setCreateError(null);
    setActionLoadingId("new");
    try {
      await createWarning({
        member_id: newMemberId,
        reason: newReason.trim(),
        warning_date: newDate,
      });
      const warningsParams = currentRole === "animador" ? { created_by: "me" } : {};
      const response = await getWarnings(warningsParams);
      setWarnings(response.data as Warning[]);
      closeCreateModal();
    } catch (err: any) {
      setCreateError(err.message || "Erro ao salvar advertência.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredMemberOptions = useMemo(() => {
    const term = memberSearch.trim().toLowerCase();
    if (!term) return members;
    return members.filter((member) => member.name.toLowerCase().includes(term));
  }, [memberSearch, members]);

  const handleMemberSearchChange = (value: string) => {
    setMemberSearch(value);
    setNewMemberId("");
    setCreateError(null);
  };

  const handleSelectMember = (member: MemberSummary) => {
    setNewMemberId(member.id);
    setMemberSearch(member.name);
    setCreateError(null);
  };

  return (
    <main className="app-page">
      <section className="shell reveal">
        <header className="page-header">
          <div>
            <h1 className="hero-title">Advertências</h1>
            <p className="hero-copy">
              Registre e acompanhe advertências dos membros.
            </p>
          </div>
          {(currentRole === "admin" || currentRole === "animador") && (
            <button className="button" type="button" onClick={openCreateModal}>
              + Nova Advertência
            </button>
          )}
        </header>

        <section className="report-panel">
          <div className="report-header">
            <div>
              <h2 className="section-title">Membros e ocorrências</h2>
              <p>
                {currentRole === "animador"
                  ? "Mostrando apenas as advertências que você registrou."
                  : "Veja o histórico e a quantidade de advertências."}
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
          {actionError && !editingWarning && (
            <div className="empty-state">
              <p className="text-red-500">{actionError}</p>
            </div>
          )}

          {loading ? (
            <div className="empty-state">
              <p>Carregando advertências...</p>
            </div>
          ) : error ? (
            <div className="empty-state">
              <p className="text-red-500">Erro ao carregar advertências: {error}</p>
            </div>
          ) : filteredMembers.length > 0 ? (
            <div className="warning-list">
              {filteredMembers.map((member) => (
                <article key={member.id} className="warning-card">
                  <div className="warning-header">
                    <div className="warning-meta">
                      <strong className="warning-name">{member.name}</strong>
                      <span className="warning-count">
                        {member.warnings.length} advertência(s)
                      </span>
                    </div>
                  </div>

                  {member.warnings.length > 0 ? (
                    <ul className="warning-items">
                      {member.warnings.map((warning) => (
                        <li key={warning.id} className="warning-item">
                          <div className="warning-row">
                            <span className="warning-date">
                              {formatDateBR(warning.warning_date)}
                            </span>
                            <div className="warning-actions">
                              {(currentRole === "admin" || currentRole === "animador") && (
                                <button
                                  className="button secondary small"
                                  type="button"
                                  onClick={() => openEditModal(warning)}
                                  disabled={actionLoadingId === warning.id}
                                >
                                  Editar
                                </button>
                              )}
                              {currentRole === "admin" && (
                                <button
                                  className="button danger small"
                                  type="button"
                                  onClick={() => handleDelete(warning)}
                                  disabled={actionLoadingId === warning.id}
                                >
                                  Excluir
                                </button>
                              )}
                            </div>
                          </div>
                          <span className="warning-desc">{warning.reason}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="helper">
                      Nenhuma advertência registrada para este membro.
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
              <p>Nenhuma advertência encontrada</p>
              <p className="helper">
                Comece registrando a primeira advertência.
              </p>
              {(currentRole === "admin" || currentRole === "animador") && (
                <button className="button" type="button" onClick={openCreateModal}>
                  + Criar Advertência
                </button>
              )}
            </div>
          )}
        </section>
      </section>

      {editingWarning && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card">
            <header className="modal-header">
              <div>
                <h2 className="section-title">Editar advertência</h2>
                <p>Atualize a descrição e a data da ocorrência.</p>
              </div>
              <button
                className="icon-button"
                type="button"
                aria-label="Fechar"
                onClick={closeEditModal}
              >
                <svg viewBox="0 0 24 24">
                  <path d="M18 6L6 18" />
                  <path d="M6 6l12 12" />
                </svg>
              </button>
            </header>

            <form className="modal-body" onSubmit={handleEditSubmit}>
              <div className="form-grid">
                <label className="field full">
                  <span>Descrição</span>
                  <textarea
                    className="input"
                    rows={5}
                    value={editReason}
                    onChange={(event) => setEditReason(event.target.value)}
                    required
                    disabled={actionLoadingId === editingWarning.id}
                  />
                </label>
                <label className="field">
                  <span>Data da ocorrência</span>
                  <input
                    type="date"
                    className="input"
                    value={editDate}
                    onChange={(event) => setEditDate(event.target.value)}
                    required
                    disabled={actionLoadingId === editingWarning.id}
                  />
                </label>
              </div>
              <div className="form-actions">
                <p className="helper">Revise antes de salvar.</p>
                <div className="form-buttons">
                  <button
                    type="button"
                    className="button secondary"
                    onClick={closeEditModal}
                    disabled={actionLoadingId === editingWarning.id}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="button"
                    disabled={actionLoadingId === editingWarning.id}
                  >
                    {actionLoadingId === editingWarning.id ? "Salvando..." : "Salvar"}
                  </button>
                </div>
                {actionError && <p className="text-red-500">{actionError}</p>}
              </div>
            </form>
          </div>
        </div>
      )}

      {creatingWarning && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card">
            <header className="modal-header">
              <div>
                <strong>Nova advertência</strong>
                <p className="helper">Registre somente o essencial.</p>
              </div>
              <button className="button secondary" type="button" onClick={closeCreateModal}>
                Fechar
              </button>
            </header>
            <form className="modal-body" onSubmit={handleCreateWarning}>
              <div className="form-grid">
                <label className="field full">
                  <span>Buscar membro</span>
                  <input
                    className="input"
                    type="text"
                    placeholder="Digite o nome"
                    value={memberSearch}
                    onChange={(event) => handleMemberSearchChange(event.target.value)}
                    disabled={actionLoadingId === "new"}
                  />
                  {memberSearch.trim().length > 0 && (
                    <div className="member-autocomplete" role="listbox">
                      {filteredMemberOptions.length === 0 ? (
                        <div className="member-autocomplete-empty">
                          Nenhum membro encontrado.
                        </div>
                      ) : (
                        filteredMemberOptions.map((member) => (
                          <button
                            key={member.id}
                            type="button"
                            className={`member-autocomplete-item ${
                              newMemberId === member.id ? "selected" : ""
                            }`}
                            onClick={() => handleSelectMember(member)}
                            disabled={actionLoadingId === "new"}
                          >
                            {member.name}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </label>
                <label className="field">
                  <span>Data da ocorrência</span>
                  <input
                    type="date"
                    className="input"
                    value={newDate}
                    onChange={(event) => setNewDate(event.target.value)}
                    required
                    disabled={actionLoadingId === "new"}
                  />
                </label>
                <label className="field full">
                  <span>Descrição</span>
                  <textarea
                    className="input"
                    rows={4}
                    value={newReason}
                    onChange={(event) => setNewReason(event.target.value)}
                    required
                    disabled={actionLoadingId === "new"}
                  />
                </label>
              </div>
              {createError && <p className="text-red-500">{createError}</p>}
              <div className="modal-footer">
                <button
                  className="button secondary"
                  type="button"
                  onClick={closeCreateModal}
                  disabled={actionLoadingId === "new"}
                >
                  Cancelar
                </button>
                <button className="button" type="submit" disabled={actionLoadingId === "new"}>
                  {actionLoadingId === "new" ? "Salvando..." : "Salvar advertência"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
