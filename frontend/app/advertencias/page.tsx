"use client";

import './page.css';
import { useEffect, useId, useMemo, useReducer, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FiAlertTriangle } from "react-icons/fi";
import { Modal } from "../../components/Modal";
import {
  createWarning,
  deleteWarning,
  getErrorMessage,
  getMembers,
  getWarnings,
  updateWarning,
} from "../../lib/api";
import { getDefaultRoute, getStoredUser, isRoleAllowed, type Role } from "../../lib/auth";
import { normalizeString } from "../../lib/validators";

interface Warning {
  id: string;
  member_id: string;
  reason: string;
  warning_date: string;
}

interface MemberSummary {
  id: string;
  name: string;
  last_name?: string | null;
}

// ── Reducer: formulário de criação ──────────────────────────────────────────

interface CreateFormState {
  memberId: string;
  reason: string;
  date: string;
  memberSearch: string;
}

type CreateFormAction =
  | { type: "SET_FIELD"; field: keyof CreateFormState; value: string }
  | { type: "RESET" };

const createFormInitial: CreateFormState = {
  memberId: "",
  reason: "",
  date: "",
  memberSearch: "",
};

function createFormReducer(
  state: CreateFormState,
  action: CreateFormAction
): CreateFormState {
  switch (action.type) {
    case "SET_FIELD":
      return { ...state, [action.field]: action.value };
    case "RESET":
      return createFormInitial;
    default:
      return state;
  }
}

// ── Reducer: formulário de edição ───────────────────────────────────────────

interface EditFormState {
  reason: string;
  date: string;
}

type EditFormAction =
  | { type: "SET_FIELD"; field: keyof EditFormState; value: string }
  | { type: "RESET" };

const editFormInitial: EditFormState = { reason: "", date: "" };

function editFormReducer(
  state: EditFormState,
  action: EditFormAction
): EditFormState {
  switch (action.type) {
    case "SET_FIELD":
      return { ...state, [action.field]: action.value };
    case "RESET":
      return editFormInitial;
    default:
      return state;
  }
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
  const [createForm, dispatchCreate] = useReducer(createFormReducer, createFormInitial);
  const { memberId: newMemberId, reason: newReason, date: newDate, memberSearch } = createForm;
  const [editForm, dispatchEdit] = useReducer(editFormReducer, editFormInitial);
  const { reason: editReason, date: editDate } = editForm;
  const [createError, setCreateError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [warningToDelete, setWarningToDelete] = useState<Warning | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [noticeVisible, setNoticeVisible] = useState(false);
  const [activeMemberIndex, setActiveMemberIndex] = useState<number>(-1);
  const autocompleteId = useId();
  const noticeRef = useRef<HTMLDivElement>(null);
  const todayDate = new Date().toISOString().split("T")[0];

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
          getMembers({ limit: 200 }),
        ]);
        const members = membersResponse.data as MemberSummary[];
        const map: Record<string, string> = {};
        members.forEach((member) => {
          map[member.id] = [member.name, member.last_name].filter(Boolean).join(" ");
        });
        setMembers(members);
        setMemberMap(map);
        setWarnings(warningsResponse.data as Warning[]);
      } catch (err: unknown) {
        setError(getErrorMessage(err, "Erro ao carregar advertências."));
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
    normalizeString(member.name).includes(normalizeString(searchTerm))
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
    dispatchEdit({ type: "SET_FIELD", field: "reason", value: warning.reason });
    dispatchEdit({ type: "SET_FIELD", field: "date", value: warning.warning_date });
    setActionError(null);
  };

  const closeEditModal = () => {
    setEditingWarning(null);
    dispatchEdit({ type: "RESET" });
  };

  const openCreateModal = () => {
    dispatchCreate({ type: "RESET" });
    setCreateError(null);
    setNotice(null);
    setCreatingWarning(true);
  };

  const closeCreateModal = () => {
    setCreatingWarning(false);
    dispatchCreate({ type: "RESET" });
    setCreateError(null);
  };

  const hideNotice = () => {
    setNoticeVisible(false);
    window.setTimeout(() => setNotice(null), 260);
  };

  const handleEditSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingWarning) return;
    const trimmedReason = editReason.trim();
    if (!trimmedReason || !editDate) {
      setActionError("Preencha a descrição e a data.");
      return;
    }
    if (trimmedReason.length < 5) {
      setActionError("A descrição deve ter ao menos 5 caracteres.");
      return;
    }
    if (editDate > todayDate) {
      setActionError("A data da advertência não pode ser no futuro.");
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
    } catch (err: unknown) {
      setActionError(getErrorMessage(err, "Erro ao atualizar advertência."));
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = (warning: Warning) => {
    setWarningToDelete(warning);
  };

  const confirmDelete = async () => {
    if (!warningToDelete) return;
    const warning = warningToDelete;
    setWarningToDelete(null);
    setActionLoadingId(warning.id);
    setActionError(null);
    try {
      await deleteWarning(warning.id);
      setWarnings((prev) => prev.filter((item) => item.id !== warning.id));
    } catch (err: unknown) {
      setActionError(getErrorMessage(err, "Erro ao excluir advertência."));
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
    if (newReason.trim().length < 5) {
      setCreateError("A descrição deve ter ao menos 5 caracteres.");
      return;
    }
    if (newDate > todayDate) {
      setCreateError("A data da advertência não pode ser no futuro.");
      return;
    }
    setCreateError(null);
    setActionLoadingId("new");
    try {
      const createResponse = await createWarning({
        member_id: newMemberId,
        reason: newReason.trim(),
        warning_date: newDate,
      });
      const suspensionApplied =
        (createResponse?.data as { suspension_applied?: boolean })?.suspension_applied ??
        false;
      const warningsParams = currentRole === "animador" ? { created_by: "me" } : {};
      const warningsResponse = await getWarnings(warningsParams);
      setWarnings(warningsResponse.data as Warning[]);
      closeCreateModal();
      if (suspensionApplied) {
        const memberName = memberMap[newMemberId] ?? "Membro";
        setNotice(
          `${memberName} recebeu a 3ª advertência em 1 mês e ficará suspenso por 1 mês.`
        );
        setNoticeVisible(true);
      } else {
        setNotice(null);
        setNoticeVisible(false);
      }
    } catch (err: unknown) {
      setCreateError(getErrorMessage(err, "Erro ao salvar advertência."));
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredMemberOptions = useMemo(() => {
    const term = normalizeString(memberSearch.trim());
    if (!term) return members;
    return members.filter((member) => {
      const fullName = [member.name, member.last_name].filter(Boolean).join(" ");
      return normalizeString(fullName).includes(term);
    });
  }, [memberSearch, members]);

  const handleMemberSearchChange = (value: string) => {
    dispatchCreate({ type: "SET_FIELD", field: "memberSearch", value });
    dispatchCreate({ type: "SET_FIELD", field: "memberId", value: "" });
    setActiveMemberIndex(-1);
    setCreateError(null);
  };

  const handleSelectMember = (member: MemberSummary) => {
    dispatchCreate({ type: "SET_FIELD", field: "memberId", value: member.id });
    dispatchCreate({ type: "SET_FIELD", field: "memberSearch", value: member.name });
    setCreateError(null);
  };

  useEffect(() => {
    if (!notice) return;
    setNoticeVisible(true);
    const timer = window.setTimeout(() => {
      hideNotice();
    }, 4200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (!noticeVisible) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") hideNotice();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [noticeVisible]);

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
                aria-label="Buscar membro pelo nome"
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
          {notice && (
            <div
              ref={noticeRef}
              className={`floating-notice${noticeVisible ? "" : " is-hiding"}`}
              role="status"
              aria-live="polite"
            >
              <div className="floating-notice-content">
                <span className="floating-notice-title">Suspensão aplicada</span>
                <span className="floating-notice-text">{notice}</span>
                <button
                  className="floating-notice-close"
                  type="button"
                  aria-label="Fechar aviso"
                  onClick={hideNotice}
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="empty-state" aria-live="polite" aria-atomic="true">
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
                <FiAlertTriangle />
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

      <Modal
        isOpen={!!editingWarning}
        onClose={closeEditModal}
        title="Editar advertência"
        description="Atualize a descrição e a data da ocorrência."
      >
        <form onSubmit={handleEditSubmit}>
          <div className="form-grid">
            <label className="field full" htmlFor="edit-reason">
              <span>Descrição</span>
              <textarea
                id="edit-reason"
                className="input"
                rows={5}
                value={editReason}
                onChange={(event) => dispatchEdit({ type: "SET_FIELD", field: "reason", value: event.target.value })}
                required
                aria-required="true"
                disabled={actionLoadingId === editingWarning?.id}
              />
            </label>
            <label className="field" htmlFor="edit-date">
              <span>Data da ocorrência</span>
              <input
                id="edit-date"
                type="date"
                className="input"
                value={editDate}
                max={todayDate}
                onChange={(event) => dispatchEdit({ type: "SET_FIELD", field: "date", value: event.target.value })}
                required
                aria-required="true"
                disabled={actionLoadingId === editingWarning?.id}
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
                disabled={actionLoadingId === editingWarning?.id}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="button"
                disabled={actionLoadingId === editingWarning?.id}
              >
                {actionLoadingId === editingWarning?.id ? "Salvando..." : "Salvar"}
              </button>
            </div>
            {actionError && (
              <p className="text-red-500" role="alert" aria-live="polite">
                {actionError}
              </p>
            )}
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={!!warningToDelete}
        onClose={() => setWarningToDelete(null)}
        title="Excluir advertência"
        description="Esta ação não pode ser desfeita."
        role="alertdialog"
      >
        <p>Tem certeza que deseja excluir esta advertência?</p>
        <div className="modal-footer">
          <button
            className="button secondary"
            type="button"
            onClick={() => setWarningToDelete(null)}
          >
            Cancelar
          </button>
          <button
            className="button danger"
            type="button"
            onClick={confirmDelete}
          >
            Excluir
          </button>
        </div>
      </Modal>

      <Modal
        isOpen={creatingWarning}
        onClose={closeCreateModal}
        title="Nova advertência"
        description="Registre somente o essencial."
      >
        <form onSubmit={handleCreateWarning}>
          <div className="form-grid">
            <label className="field full" htmlFor="create-member-search">
              <span>Buscar membro</span>
              <input
                id="create-member-search"
                className="input"
                type="text"
                role="combobox"
                aria-label="Buscar membro pelo nome"
                placeholder="Digite o nome"
                value={memberSearch}
                aria-expanded={memberSearch.trim().length > 0}
                aria-controls={`${autocompleteId}-listbox`}
                aria-autocomplete="list"
                aria-activedescendant={
                  activeMemberIndex >= 0 && filteredMemberOptions[activeMemberIndex]
                    ? `${autocompleteId}-option-${activeMemberIndex}`
                    : undefined
                }
                onChange={(event) => handleMemberSearchChange(event.target.value)}
                onKeyDown={(event) => {
                  if (!filteredMemberOptions.length) return;
                  if (event.key === "ArrowDown") {
                    event.preventDefault();
                    setActiveMemberIndex((prev) =>
                      Math.min(prev + 1, filteredMemberOptions.length - 1)
                    );
                  } else if (event.key === "ArrowUp") {
                    event.preventDefault();
                    setActiveMemberIndex((prev) => Math.max(prev - 1, 0));
                  } else if (event.key === "Enter" && activeMemberIndex >= 0) {
                    event.preventDefault();
                    const selected = filteredMemberOptions[activeMemberIndex];
                    if (selected) handleSelectMember(selected);
                  } else if (event.key === "Escape") {
                    setActiveMemberIndex(-1);
                  }
                }}
                disabled={actionLoadingId === "new"}
              />
              {memberSearch.trim().length > 0 && !newMemberId && (
                <div
                  id={`${autocompleteId}-listbox`}
                  className="member-autocomplete"
                  role="listbox"
                  aria-label="Resultados da busca de membros"
                >
                  {filteredMemberOptions.length === 0 ? (
                    <div className="member-autocomplete-empty">
                      Nenhum membro encontrado.
                    </div>
                  ) : (
                    filteredMemberOptions.map((member, index) => (
                      <button
                        key={member.id}
                        id={`${autocompleteId}-option-${index}`}
                        type="button"
                        className={`member-autocomplete-item ${
                          newMemberId === member.id || activeMemberIndex === index ? "selected" : ""
                        }`}
                        role="option"
                        aria-selected={newMemberId === member.id}
                        onClick={() => handleSelectMember(member)}
                        disabled={actionLoadingId === "new"}
                      >
                        {[member.name, member.last_name].filter(Boolean).join(" ")}
                      </button>
                    ))
                  )}
                </div>
              )}
            </label>
            <label className="field" htmlFor="create-date">
              <span>Data da ocorrência</span>
              <input
                id="create-date"
                type="date"
                className="input"
                value={newDate}
                max={todayDate}
                onChange={(event) => dispatchCreate({ type: "SET_FIELD", field: "date", value: event.target.value })}
                required
                aria-required="true"
                disabled={actionLoadingId === "new"}
              />
            </label>
            <label className="field full" htmlFor="create-reason">
              <span>Descrição</span>
              <textarea
                id="create-reason"
                className="input"
                rows={4}
                value={newReason}
                onChange={(event) => dispatchCreate({ type: "SET_FIELD", field: "reason", value: event.target.value })}
                required
                aria-required="true"
                disabled={actionLoadingId === "new"}
              />
            </label>
          </div>
          {createError && (
            <p className="text-red-500" role="alert" aria-live="polite">
              {createError}
            </p>
          )}
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
      </Modal>
    </main>
  );
}
