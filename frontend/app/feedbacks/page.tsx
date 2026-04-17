"use client";

import "./page.css";
import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FiMessageSquare, FiPlus, FiThumbsDown, FiThumbsUp, FiTrash2, FiX } from "react-icons/fi";
import { Modal } from "../../components/Modal";
import {
  createFeedback,
  createFeedbackWithAudio,
  deleteFeedback,
  getErrorMessage,
  getFeedbacks,
  getMembers,
  resolveApiAssetUrl,
} from "../../lib/api";
import { getDefaultRoute, getStoredUser, isRoleAllowed, type Role } from "../../lib/auth";

interface FeedbackMember {
  id: string;
  name: string;
  last_name: string | null;
  role: string;
}

interface Feedback {
  id: string;
  type: "positive" | "negative";
  text: string | null;
  audio_url: string | null;
  event_date: string | null;
  created_at: string;
  created_by: { id: string; name: string; last_name: string | null };
  members: FeedbackMember[];
}

interface MemberOption {
  id: string;
  name: string;
  last_name: string | null;
  role: string;
}

// ── Reducer: formulário de criação ───────────────────────────────────────────

interface CreateFormState {
  type: "positive" | "negative" | "";
  text: string;
  memberSearch: string;
  selectedMembers: MemberOption[];
  audioFile: File | null;
  inputMode: "text" | "audio";
  eventDate: string;
}

type CreateFormAction =
  | { type: "SET_FIELD"; field: "type" | "text" | "memberSearch" | "inputMode" | "eventDate"; value: string }
  | { type: "ADD_MEMBER"; member: MemberOption }
  | { type: "REMOVE_MEMBER"; memberId: string }
  | { type: "SET_AUDIO"; file: File | null }
  | { type: "RESET" };

const createFormInitial: CreateFormState = {
  type: "",
  text: "",
  memberSearch: "",
  selectedMembers: [],
  audioFile: null,
  inputMode: "text",
  eventDate: "",
};

function createFormReducer(state: CreateFormState, action: CreateFormAction): CreateFormState {
  switch (action.type) {
    case "SET_FIELD":
      return { ...state, [action.field]: action.value };
    case "ADD_MEMBER":
      if (state.selectedMembers.some((m) => m.id === action.member.id)) return state;
      return { ...state, selectedMembers: [...state.selectedMembers, action.member], memberSearch: "" };
    case "REMOVE_MEMBER":
      return { ...state, selectedMembers: state.selectedMembers.filter((m) => m.id !== action.memberId) };
    case "SET_AUDIO":
      return { ...state, audioFile: action.file };
    case "RESET":
      return createFormInitial;
    default:
      return state;
  }
}

function fullName(name: string, lastName: string | null | undefined) {
  return lastName ? `${name} ${lastName}` : name;
}

function roleLabel(role: string) {
  if (role === "animador") return "Animador";
  if (role === "recreador") return "Recreador";
  if (role === "admin") return "Admin";
  return role;
}

function formatDateString(dateString: string): string {
  // Converte strings de data ISO (YYYY-MM-DD) ou ISO com tempo para formato local
  // sem problemas de timezone
  if (!dateString) return '';

  // Se for data simples (YYYY-MM-DD), processa diretamente
  if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [year, month, day] = dateString.split('-');
    return new Date(`${year}-${month}-${day}T00:00:00`).toLocaleDateString("pt-BR");
  }

  // Se for ISO com tempo, extrai apenas a data
  if (dateString.includes('T')) {
    const datePart = dateString.split('T')[0];
    const [year, month, day] = datePart.split('-');
    return new Date(`${year}-${month}-${day}T00:00:00`).toLocaleDateString("pt-BR");
  }

  return new Date(dateString).toLocaleDateString("pt-BR");
}

export default function FeedbacksPage() {
  const router = useRouter();
  const [currentRole, setCurrentRole] = useState<Role | null>(null);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [allMembers, setAllMembers] = useState<MemberOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filterType, setFilterType] = useState<"" | "positive" | "negative">("");
  const [filterSearch, setFilterSearch] = useState("");

  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createForm, dispatchCreate] = useReducer(createFormReducer, createFormInitial);

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const audioInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const stored = getStoredUser();
    if (!stored) { router.push("/login"); return; }
    if (!isRoleAllowed(stored.role, ["admin"])) {
      router.push(getDefaultRoute(stored.role)); return;
    }
    setCurrentRole(stored.role as Role);
  }, [router]);

  useEffect(() => {
    if (!currentRole) return;
    loadFeedbacks();
    loadMembers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentRole]);

  async function loadFeedbacks() {
    setLoading(true);
    setError(null);
    try {
      const res = await getFeedbacks({ limit: 50 });
      setFeedbacks(res?.data ?? []);
    } catch (err) {
      setError(getErrorMessage(err, "Erro ao carregar feedbacks."));
    } finally {
      setLoading(false);
    }
  }

  async function loadMembers() {
    try {
      const res = await getMembers({ limit: 200 });
      setAllMembers(res?.data ?? []);
    } catch { /* silent */ }
  }

  const filteredFeedbacks = useMemo(() => {
    const search = filterSearch.trim().toLowerCase();
    return feedbacks.filter((f) => {
      if (filterType && f.type !== filterType) return false;
      if (search && !f.members.some((m) => fullName(m.name, m.last_name).toLowerCase().includes(search))) return false;
      return true;
    });
  }, [feedbacks, filterType, filterSearch]);

  const memberSuggestions = useMemo(() => {
    const search = createForm.memberSearch.trim().toLowerCase();
    if (!search) return [];
    const selectedIds = new Set(createForm.selectedMembers.map((m) => m.id));
    return allMembers
      .filter((m) => !selectedIds.has(m.id))
      .filter((m) => fullName(m.name, m.last_name).toLowerCase().includes(search))
      .slice(0, 8);
  }, [createForm.memberSearch, createForm.selectedMembers, allMembers]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;

    if (!createForm.type) {
      setCreateError("Selecione o tipo do feedback (positivo ou negativo).");
      return;
    }
    if (createForm.selectedMembers.length === 0) {
      setCreateError("Selecione pelo menos um membro.");
      return;
    }
    if (createForm.inputMode === "audio") {
      if (!createForm.audioFile) { setCreateError("Selecione um arquivo de áudio."); return; }
    } else {
      if (!createForm.text.trim()) { setCreateError("Informe o texto do feedback."); return; }
      if (createForm.text.trim().length < 3) { setCreateError("Texto muito curto (mínimo 3 caracteres)."); return; }
    }

    setSaving(true);
    setCreateError(null);

    try {
      const memberIds = createForm.selectedMembers.map((m) => m.id);

      if (createForm.inputMode === "audio" && createForm.audioFile) {
        const formData = new FormData();
        formData.append("type", createForm.type);
        formData.append("member_ids", JSON.stringify(memberIds));
        if (createForm.text.trim()) formData.append("text", createForm.text.trim());
        if (createForm.eventDate) formData.append("event_date", createForm.eventDate);
        formData.append("audio", createForm.audioFile);
        await createFeedbackWithAudio(formData);
      } else {
        await createFeedback({
          type: createForm.type as "positive" | "negative",
          text: createForm.text.trim(),
          member_ids: memberIds,
          event_date: createForm.eventDate || undefined,
        });
      }

      dispatchCreate({ type: "RESET" });
      setCreating(false);
      await loadFeedbacks();
    } catch (err) {
      setCreateError(getErrorMessage(err, "Erro ao salvar feedback."));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    try {
      await deleteFeedback(deleteTarget);
      setDeleteTarget(null);
      await loadFeedbacks();
    } catch (err) {
      setError(getErrorMessage(err, "Erro ao excluir feedback."));
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  function openCreate() {
    dispatchCreate({ type: "RESET" });
    setCreateError(null);
    setCreating(true);
  }

  function closeCreate() {
    if (saving) return;
    setCreating(false);
    dispatchCreate({ type: "RESET" });
    setCreateError(null);
  }

  const hasFilters = filterType || filterSearch;

  return (
    <main className="app-page">
      <section className="shell reveal">

        {/* Header */}
        <header className="page-header">
          <h1 className="hero-title">Feedbacks dos Clientes</h1>
          <button type="button" className="button" onClick={openCreate}>
            <FiPlus aria-hidden="true" />
            {" "}Novo Feedback
          </button>
        </header>

        <div className="report-panel">

          {/* Filtros */}
          <div className="report-header">
            <div className="feedback-header-left">
              <h2 className="section-title">Listagem de feedbacks</h2>
              <input
                type="text"
                className="input feedback-search-inline"
                placeholder="Buscar por nome..."
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
                autoComplete="off"
                aria-label="Buscar por pessoa"
              />
            </div>
            <div className="feedback-filters-right">
              <button
                type="button"
                className="feedback-filter-clear"
                onClick={() => { setFilterType(""); setFilterSearch(""); }}
                style={!hasFilters ? { visibility: "hidden", pointerEvents: "none" } : undefined}
                tabIndex={hasFilters ? 0 : -1}
                aria-hidden={!hasFilters}
              >
                <FiX aria-hidden="true" />
                Limpar filtros
              </button>

              <label className="feedback-filter-field field">
                <span>Tipo</span>
                <select
                  className="input"
                  aria-label="Filtrar por tipo de feedback"
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as typeof filterType)}
                >
                  <option value="">Todos</option>
                  <option value="positive">Positivo</option>
                  <option value="negative">Negativo</option>
                </select>
              </label>
            </div>
          </div>

          {/* Estados */}
          {loading && (
            <div className="empty-state" aria-live="polite" aria-atomic="true">
              <p>Carregando feedbacks...</p>
            </div>
          )}
          {!loading && error && (
            <div className="alert-card error" role="alert">
              <p>{error}</p>
            </div>
          )}
          {!loading && !error && filteredFeedbacks.length === 0 && (
            <div className="empty-state">
              <div className="empty-state-icon">
                <FiMessageSquare aria-hidden="true" />
              </div>
              <p>{hasFilters ? "Nenhum feedback encontrado com esses filtros." : "Nenhum feedback registrado ainda."}</p>
            </div>
          )}

          {/* Lista */}
          {!loading && !error && filteredFeedbacks.length > 0 && (
            <ul className="feedback-list" aria-label="Lista de feedbacks">
              {filteredFeedbacks.map((fb) => (
                <li key={fb.id} className={`feedback-item feedback-item--${fb.type}`}>
                  <div className="feedback-item-header">
                    <span className={`feedback-badge feedback-badge--${fb.type}`}>
                      {fb.type === "positive"
                        ? <><FiThumbsUp aria-hidden="true" /> Positivo</>
                        : <><FiThumbsDown aria-hidden="true" /> Negativo</>}
                    </span>
                    {fb.event_date && (
                      <span className="feedback-item-date" style={{ fontSize: "0.9em", color: "#666" }}>
                        Evento: {formatDateString(fb.event_date)}
                      </span>
                    )}
                    {currentRole === "admin" && (
                      <div className="feedback-item-header-right">
                        <button
                          type="button"
                          className="icon-button danger"
                          aria-label="Excluir feedback"
                          onClick={() => setDeleteTarget(fb.id)}
                        >
                          <FiTrash2 aria-hidden="true" />
                        </button>
                      </div>
                    )}
                  </div>

                  {fb.text && <p className="feedback-text">{fb.text}</p>}

                  {fb.audio_url && (
                    <div className="feedback-audio-block">
                      <span className="feedback-audio-label">Áudio</span>
                      <audio
                        controls
                        src={resolveApiAssetUrl(fb.audio_url)}
                        className="feedback-audio-player"
                      >
                        Seu navegador não suporta áudio.
                      </audio>
                    </div>
                  )}

                  <div className="feedback-members-block">
                    <span className="feedback-members-label">Membros relacionados</span>
                    <ul className="feedback-members-chips" aria-label="Membros">
                      {fb.members.map((m) => (
                        <li key={m.id} className="feedback-member-chip">
                          <span className="feedback-chip-name">{fullName(m.name, m.last_name)}</span>
                          <span className={`feedback-chip-role feedback-chip-role--${m.role}`}>
                            {roleLabel(m.role)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="feedback-item-footer">
                    <div>Registrado por <strong>{fullName(fb.created_by.name, fb.created_by.last_name)}</strong></div>
                    <div style={{ fontSize: "0.9em", color: "#666", marginTop: "4px" }}>
                      Criado dia {formatDateString(fb.created_at)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Modal: Novo Feedback */}
      <Modal isOpen={creating} onClose={closeCreate} title="Novo Feedback">
        <form onSubmit={handleCreate} noValidate className="modal-body">
          {createError && (
            <div className="feedback-modal-error alert-card error" role="alert">
              <p>{createError}</p>
            </div>
          )}

          {/* Tipo */}
          <fieldset className="feedback-type-fieldset">
            <legend className="feedback-type-legend">Tipo *</legend>
            <div className="feedback-type-options">
              {(["positive", "negative"] as const).map((t) => (
                <label
                  key={t}
                  className={`feedback-type-option${createForm.type === t ? " is-selected" : ""}`}
                >
                  <input
                    type="radio"
                    name="feedback-type"
                    value={t}
                    checked={createForm.type === t}
                    onChange={() => dispatchCreate({ type: "SET_FIELD", field: "type", value: t })}
                    className="sr-only"
                  />
                  {t === "positive" ? <FiThumbsUp aria-hidden="true" /> : <FiThumbsDown aria-hidden="true" />}
                  {t === "positive" ? "Positivo" : "Negativo"}
                </label>
              ))}
            </div>
          </fieldset>

          {/* Formato */}
          <fieldset className="input-mode-fieldset">
            <legend className="input-mode-legend">Formato</legend>
            <div className="input-mode-options">
              {(["text", "audio"] as const).map((m) => (
                <label
                  key={m}
                  className={`input-mode-option${createForm.inputMode === m ? " is-selected" : ""}`}
                >
                  <input
                    type="radio"
                    name="input-mode"
                    value={m}
                    checked={createForm.inputMode === m}
                    onChange={() => dispatchCreate({ type: "SET_FIELD", field: "inputMode", value: m })}
                    className="sr-only"
                  />
                  {m === "text" ? "Texto" : "Áudio / Arquivo"}
                </label>
              ))}
            </div>
          </fieldset>

          {/* Texto */}
          {createForm.inputMode === "text" && (
            <label className="field">
              <span>Texto *</span>
              <textarea
                className="input"
                rows={4}
                maxLength={2000}
                value={createForm.text}
                onChange={(e) => dispatchCreate({ type: "SET_FIELD", field: "text", value: e.target.value })}
                placeholder="Descreva o feedback do cliente..."
                style={{ resize: "vertical" }}
              />
              <span className="char-count">{createForm.text.length}/2000</span>
            </label>
          )}

          {/* Áudio */}
          {createForm.inputMode === "audio" && (
            <div className="field">
              <span>Arquivo de áudio *</span>
              <div className="audio-upload-zone">
                <input
                  ref={audioInputRef}
                  type="file"
                  accept="audio/mpeg,audio/mp4,audio/ogg,audio/wav,audio/webm,audio/aac,audio/x-m4a"
                  className="sr-only"
                  id="audio-file-input"
                  onChange={(e) => dispatchCreate({ type: "SET_AUDIO", file: e.target.files?.[0] ?? null })}
                />
                {createForm.audioFile ? (
                  <div className="audio-file-row">
                    <span className="audio-file-name">{createForm.audioFile.name}</span>
                    <button
                      type="button"
                      className="button secondary small"
                      aria-label="Remover áudio"
                      onClick={() => {
                        dispatchCreate({ type: "SET_AUDIO", file: null });
                        if (audioInputRef.current) audioInputRef.current.value = "";
                      }}
                    >
                      <FiX aria-hidden="true" /> Remover
                    </button>
                  </div>
                ) : (
                  <label htmlFor="audio-file-input" className="audio-upload-label">
                    Selecionar arquivo de áudio
                  </label>
                )}
              </div>
              <label className="field" style={{ marginTop: 12 }}>
                <span>Texto complementar (opcional)</span>
                <textarea
                  className="input"
                  rows={2}
                  maxLength={2000}
                  value={createForm.text}
                  onChange={(e) => dispatchCreate({ type: "SET_FIELD", field: "text", value: e.target.value })}
                  placeholder="Notas adicionais..."
                  style={{ resize: "vertical" }}
                />
              </label>
            </div>
          )}

          {/* Busca de membros */}
          <div className="field">
            <span>Membros relacionados *</span>
            <div className="member-search-box">
              <input
                type="text"
                className="input"
                placeholder="Buscar por nome..."
                value={createForm.memberSearch}
                onChange={(e) => dispatchCreate({ type: "SET_FIELD", field: "memberSearch", value: e.target.value })}
                autoComplete="off"
                aria-label="Buscar membro"
              />
              {memberSuggestions.length > 0 && (
                <ul className="member-autocomplete" role="listbox" aria-label="Sugestões de membros">
                  {memberSuggestions.map((m) => (
                    <li key={m.id} role="option" aria-selected="false">
                      <button
                        type="button"
                        className="member-autocomplete-item"
                        onClick={() => dispatchCreate({ type: "ADD_MEMBER", member: m })}
                        style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
                      >
                        <span>{fullName(m.name, m.last_name)}</span>
                        <span className={`member-suggestion-role member-suggestion-role--${m.role}`}>
                          {roleLabel(m.role)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {createForm.selectedMembers.length > 0 && (
              <ul className="selected-members-chips" aria-label="Membros selecionados">
                {createForm.selectedMembers.map((m) => (
                  <li key={m.id} className="selected-member-chip">
                    <span className="selected-chip-name">{fullName(m.name, m.last_name)}</span>
                    <span className={`feedback-chip-role feedback-chip-role--${m.role}`}>
                      {roleLabel(m.role)}
                    </span>
                    <button
                      type="button"
                      className="selected-chip-remove"
                      aria-label={`Remover ${fullName(m.name, m.last_name)}`}
                      onClick={() => dispatchCreate({ type: "REMOVE_MEMBER", memberId: m.id })}
                    >
                      <FiX aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Data do Evento */}
          <label className="field">
            <span>Data do evento (opcional)</span>
            <input
              type="date"
              className="input"
              value={createForm.eventDate}
              onChange={(e) => {
                let dateValue = e.target.value;

                // Se o usuário digitou manualmente em formato DD/MM/YYYY, converte para YYYY-MM-DD
                if (dateValue && !dateValue.includes('-') && dateValue.includes('/')) {
                  const parts = dateValue.split('/');
                  if (parts.length === 3) {
                    dateValue = `${parts[2]}-${parts[1]}-${parts[0]}`;
                  }
                }

                dispatchCreate({ type: "SET_FIELD", field: "eventDate", value: dateValue });
              }}
              onBlur={(e) => {
                let dateValue = e.target.value;

                // Normaliza o formato se necessário
                if (dateValue && !dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
                  const parts = dateValue.replace(/\D/g, '');
                  if (parts.length === 8) {
                    dateValue = `${parts.substring(4)}-${parts.substring(2, 4)}-${parts.substring(0, 2)}`;
                    dispatchCreate({ type: "SET_FIELD", field: "eventDate", value: dateValue });
                  }
                }
              }}
              placeholder="DD/MM/YYYY ou use o date picker"
              aria-label="Data do evento relacionado ao feedback"
            />
          </label>

          <div className="modal-footer">
            <button type="button" className="button secondary" onClick={closeCreate} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className="button" disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Confirmar exclusão */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => { if (!deleting) setDeleteTarget(null); }}
        title="Excluir Feedback"
      >
        <div className="modal-body">
          <p>Tem certeza que deseja excluir este feedback? Essa ação não pode ser desfeita.</p>
        </div>
        <div className="modal-footer">
          <button type="button" className="button secondary" onClick={() => setDeleteTarget(null)} disabled={deleting}>
            Cancelar
          </button>
          <button type="button" className="button danger" onClick={handleDelete} disabled={deleting}>
            {deleting ? "Excluindo..." : "Excluir"}
          </button>
        </div>
      </Modal>
    </main>
  );
}
