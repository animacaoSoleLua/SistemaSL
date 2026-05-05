"use client";

import "./page.css";
import Image from "next/image";
import { useEffect, useId, useReducer, useState } from "react";
import { useRouter } from "next/navigation";
import { FiChevronRight, FiEdit2, FiPlus, FiStar, FiTrash2, FiUserPlus } from "react-icons/fi";
import {
  addMemberSkill,
  createSkill,
  deleteSkill,
  getErrorMessage,
  getMembers,
  getSkills,
  removeMemberSkill,
  resolveApiAssetUrl,
  updateMemberSkill,
  updateSkill,
} from "../../lib/api";
import { getDefaultRoute, getStoredUser, isRoleAllowed, type Role } from "../../lib/auth";
import { Modal } from "../../components/Modal";

const allowedRoles: Role[] = ["admin"];

interface SkillMember {
  member_id: string;
  name: string;
  last_name?: string | null;
  photo_url?: string | null;
  rating: number;
}

interface Skill {
  id: string;
  name: string;
  description?: string | null;
  members: SkillMember[];
}

interface MemberOption {
  id: string;
  name: string;
  last_name?: string | null;
}

type SkillFormState = { name: string; description: string };
type SkillFormAction = { type: "SET"; field: keyof SkillFormState; value: string } | { type: "RESET" } | { type: "LOAD"; payload: SkillFormState };

function skillFormReducer(state: SkillFormState, action: SkillFormAction): SkillFormState {
  switch (action.type) {
    case "SET": return { ...state, [action.field]: action.value };
    case "RESET": return { name: "", description: "" };
    case "LOAD": return action.payload;
  }
}

type MemberSkillFormState = { skillId: string; memberId: string; rating: string };
type MemberSkillFormAction = { type: "SET"; field: keyof MemberSkillFormState; value: string } | { type: "RESET" } | { type: "LOAD"; payload: MemberSkillFormState };

function memberSkillFormReducer(state: MemberSkillFormState, action: MemberSkillFormAction): MemberSkillFormState {
  switch (action.type) {
    case "SET": return { ...state, [action.field]: action.value };
    case "RESET": return { skillId: "", memberId: "", rating: "5" };
    case "LOAD": return action.payload;
  }
}

export default function HabilidadesPage() {
  const router = useRouter();
  const skillModalTitleId = useId();
  const memberSkillModalTitleId = useId();
  const deleteModalTitleId = useId();

  const [skills, setSkills] = useState<Skill[]>([]);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSkillId, setExpandedSkillId] = useState<string | null>(null);

  const [skillModalOpen, setSkillModalOpen] = useState(false);
  const [editingSkillId, setEditingSkillId] = useState<string | null>(null);
  const [skillForm, dispatchSkillForm] = useReducer(skillFormReducer, { name: "", description: "" });
  const [skillSaving, setSkillSaving] = useState(false);
  const [skillError, setSkillError] = useState<string | null>(null);

  const [memberSkillModalOpen, setMemberSkillModalOpen] = useState(false);
  const [editingMemberSkill, setEditingMemberSkill] = useState<{ skillId: string; memberId: string } | null>(null);
  const [memberSkillForm, dispatchMemberSkillForm] = useReducer(memberSkillFormReducer, { skillId: "", memberId: "", rating: "5" });
  const [memberSkillSaving, setMemberSkillSaving] = useState(false);
  const [memberSkillError, setMemberSkillError] = useState<string | null>(null);
  const [memberSearch, setMemberSearch] = useState("");
  const [memberDropdownOpen, setMemberDropdownOpen] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<{ type: "skill"; id: string; name: string } | { type: "memberSkill"; skillId: string; memberId: string; memberName: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkSkillId, setBulkSkillId] = useState("");
  const [bulkSelections, setBulkSelections] = useState<Record<string, number>>({});
  const [bulkSearch, setBulkSearch] = useState("");
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const bulkModalTitleId = useId();

  useEffect(() => {
    const user = getStoredUser();
    if (!user || !isRoleAllowed(user.role, allowedRoles)) {
      router.replace(getDefaultRoute(user?.role ?? "recreador"));
    }
  }, [router]);

  const loadSkills = async () => {
    try {
      const res = await getSkills();
      setSkills(res ?? []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const loadMembers = async () => {
    try {
      const res = await getMembers({ limit: 500 });
      setMembers(res?.data ?? []);
    } catch {
      // silencioso — lista de membros é auxiliar
    }
  };

  useEffect(() => {
    loadSkills();
    loadMembers();
  }, []);

  const openCreateSkill = () => {
    setEditingSkillId(null);
    dispatchSkillForm({ type: "RESET" });
    setSkillError(null);
    setSkillModalOpen(true);
  };

  const openEditSkill = (skill: Skill) => {
    setEditingSkillId(skill.id);
    dispatchSkillForm({ type: "LOAD", payload: { name: skill.name, description: skill.description ?? "" } });
    setSkillError(null);
    setSkillModalOpen(true);
  };

  const handleSkillSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!skillForm.name.trim()) {
      setSkillError("Nome é obrigatório");
      return;
    }
    setSkillSaving(true);
    setSkillError(null);
    try {
      if (editingSkillId) {
        await updateSkill(editingSkillId, {
          name: skillForm.name.trim(),
          description: skillForm.description.trim() || null,
        });
      } else {
        await createSkill({
          name: skillForm.name.trim(),
          description: skillForm.description.trim() || undefined,
        });
      }
      setSkillModalOpen(false);
      setLoading(true);
      await loadSkills();
    } catch (err) {
      setSkillError(getErrorMessage(err));
    } finally {
      setSkillSaving(false);
    }
  };

  const openAddMemberSkill = () => {
    setEditingMemberSkill(null);
    dispatchMemberSkillForm({ type: "RESET" });
    setMemberSearch("");
    setMemberDropdownOpen(false);
    setMemberSkillError(null);
    setMemberSkillModalOpen(true);
  };

  const openEditMemberSkill = (skillId: string, memberId: string, currentRating: number) => {
    setEditingMemberSkill({ skillId, memberId });
    dispatchMemberSkillForm({ type: "LOAD", payload: { skillId, memberId, rating: String(currentRating) } });
    const found = members.find((m) => m.id === memberId);
    setMemberSearch(found ? [found.name, found.last_name].filter(Boolean).join(" ") : "");
    setMemberDropdownOpen(false);
    setMemberSkillError(null);
    setMemberSkillModalOpen(true);
  };

  const handleMemberSkillSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const rating = Number(memberSkillForm.rating);
    if (!memberSkillForm.skillId) { setMemberSkillError("Selecione uma habilidade"); return; }
    if (!memberSkillForm.memberId) { setMemberSkillError("Selecione um membro"); return; }
    if (!rating || rating < 1 || rating > 10) { setMemberSkillError("Nota deve ser entre 1 e 10"); return; }

    setMemberSkillSaving(true);
    setMemberSkillError(null);
    try {
      if (editingMemberSkill) {
        await updateMemberSkill(editingMemberSkill.skillId, editingMemberSkill.memberId, { rating });
      } else {
        await addMemberSkill(memberSkillForm.skillId, { member_id: memberSkillForm.memberId, rating });
      }
      setMemberSkillModalOpen(false);
      setLoading(true);
      await loadSkills();
    } catch (err) {
      setMemberSkillError(getErrorMessage(err));
    } finally {
      setMemberSkillSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      if (deleteTarget.type === "skill") {
        await deleteSkill(deleteTarget.id);
      } else {
        await removeMemberSkill(deleteTarget.skillId, deleteTarget.memberId);
      }
      setDeleteTarget(null);
      setLoading(true);
      await loadSkills();
    } catch (err) {
      setDeleteError(getErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  const openBulkModal = () => {
    setBulkSkillId("");
    setBulkSelections({});
    setBulkSearch("");
    setBulkError(null);
    setBulkModalOpen(true);
  };

  const toggleBulkMember = (memberId: string) => {
    setBulkSelections((prev) => {
      if (prev[memberId] !== undefined) {
        const next = { ...prev };
        delete next[memberId];
        return next;
      }
      return { ...prev, [memberId]: 5 };
    });
  };

  const setBulkRating = (memberId: string, rating: number) => {
    setBulkSelections((prev) => ({ ...prev, [memberId]: rating }));
  };

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkSkillId) { setBulkError("Selecione uma habilidade"); return; }
    const entries = Object.entries(bulkSelections);
    if (entries.length === 0) { setBulkError("Selecione pelo menos um membro"); return; }
    setBulkSaving(true);
    setBulkError(null);
    try {
      await Promise.all(entries.map(([memberId, rating]) =>
        addMemberSkill(bulkSkillId, { member_id: memberId, rating })
      ));
      setBulkModalOpen(false);
      setLoading(true);
      await loadSkills();
    } catch (err) {
      setBulkError(getErrorMessage(err));
    } finally {
      setBulkSaving(false);
    }
  };

  const getMemberFullName = (m: SkillMember) =>
    [m.name, m.last_name].filter(Boolean).join(" ");

  if (loading) {
    return (
      <main className="app-page">
        <header className="page-header">
          <h1>Habilidades</h1>
        </header>
        <p>Carregando...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="app-page">
        <header className="page-header">
          <h1>Habilidades</h1>
        </header>
        <p className="field-error">{error}</p>
      </main>
    );
  }

  return (
    <main className="app-page">
      <header className="page-header">
        <h1>Habilidades</h1>
        <div className="page-header-actions">
          <button type="button" className="button secondary" onClick={openBulkModal}>
            <FiUserPlus aria-hidden="true" /> Adicionar a Membros
          </button>
          <button type="button" className="button" onClick={openCreateSkill}>
            <FiPlus aria-hidden="true" /> Nova Habilidade
          </button>
        </div>
      </header>

      {skills.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <FiStar aria-hidden="true" />
          </div>
          <p>Nenhuma habilidade cadastrada ainda.</p>
        </div>
      ) : (
        <div className="habilidades-list">
          {skills.map((skill) => {
            const isOpen = expandedSkillId === skill.id;
            return (
              <div key={skill.id} className="habilidade-item">
                <div className="habilidade-summary">
                  <button
                    type="button"
                    className="habilidade-toggle"
                    onClick={() => setExpandedSkillId(isOpen ? null : skill.id)}
                    aria-expanded={isOpen}
                  >
                    <FiChevronRight
                      className={`habilidade-chevron${isOpen ? " open" : ""}`}
                      aria-hidden="true"
                    />
                    <span className="habilidade-info">
                      <span className="habilidade-name">{skill.name}</span>
                      {skill.description && (
                        <span className="habilidade-description">{skill.description}</span>
                      )}
                    </span>
                    <span className="habilidade-count">
                      {skill.members.length} {skill.members.length === 1 ? "membro" : "membros"}
                    </span>
                  </button>
                  <div className="habilidade-actions">
                    <button
                      type="button"
                      className="icon-button"
                      aria-label={`Editar ${skill.name}`}
                      onClick={() => openEditSkill(skill)}
                    >
                      <FiEdit2 size={15} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="icon-button danger"
                      aria-label={`Deletar ${skill.name}`}
                      onClick={() => { setDeleteError(null); setDeleteTarget({ type: "skill", id: skill.id, name: skill.name }); }}
                    >
                      <FiTrash2 size={15} aria-hidden="true" />
                    </button>
                  </div>
                </div>

                {isOpen && (
                  <div className="habilidade-body">
                    {skill.members.length === 0 ? (
                      <p className="habilidade-empty-members">Nenhum membro associado a esta habilidade.</p>
                    ) : (
                      <div className="habilidade-table-wrapper">
                        <table className="habilidade-members-table">
                          <thead>
                            <tr>
                              <th>Membro</th>
                              <th>Nota</th>
                              <th></th>
                            </tr>
                          </thead>
                          <tbody>
                            {skill.members.map((m) => (
                              <tr key={m.member_id}>
                                <td>
                                  <div className="member-cell">
                                    <div className="member-avatar-sm">
                                      {m.photo_url ? (
                                        <Image
                                          src={resolveApiAssetUrl(m.photo_url)}
                                          alt={getMemberFullName(m)}
                                          width={30}
                                          height={30}
                                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                          unoptimized
                                        />
                                      ) : (
                                        m.name.charAt(0).toUpperCase()
                                      )}
                                    </div>
                                    {getMemberFullName(m)}
                                  </div>
                                </td>
                                <td>
                                  <span className="rating-badge">{m.rating}</span>
                                </td>
                                <td>
                                  <div className="member-row-actions">
                                    <button
                                      type="button"
                                      className="icon-button"
                                      aria-label={`Editar nota de ${getMemberFullName(m)}`}
                                      onClick={() => openEditMemberSkill(skill.id, m.member_id, m.rating)}
                                    >
                                      <FiEdit2 size={13} aria-hidden="true" />
                                    </button>
                                    <button
                                      type="button"
                                      className="icon-button danger"
                                      aria-label={`Remover ${getMemberFullName(m)} de ${skill.name}`}
                                      onClick={() => { setDeleteError(null); setDeleteTarget({ type: "memberSkill", skillId: skill.id, memberId: m.member_id, memberName: getMemberFullName(m) }); }}
                                    >
                                      <FiTrash2 size={13} aria-hidden="true" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Adicionar Membros em Lote */}
      <Modal
        isOpen={bulkModalOpen}
        title="Adicionar Membros em Lote"
        titleId={bulkModalTitleId}
        onClose={() => setBulkModalOpen(false)}
      >
        <form onSubmit={handleBulkSubmit} className="form-layout">
          <label className="field" htmlFor="bulk-skill">
            <span>Habilidade *</span>
            <select
              id="bulk-skill"
              className="input"
              value={bulkSkillId}
              onChange={(e) => { setBulkSkillId(e.target.value); setBulkSelections({}); }}
            >
              <option value="">Selecione...</option>
              {skills.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </label>

          <label className="field" htmlFor="bulk-search">
            <span>Buscar membro</span>
            <input
              id="bulk-search"
              type="text"
              className="input"
              placeholder="Filtrar por nome..."
              value={bulkSearch}
              onChange={(e) => setBulkSearch(e.target.value)}
            />
          </label>

          {bulkSkillId && (() => {
            const selectedSkill = skills.find((s) => s.id === bulkSkillId);
            const available = members.filter((m) => {
              if (selectedSkill?.members.some((sm) => sm.member_id === m.id)) return false;
              if (bulkSearch) {
                const full = [m.name, m.last_name].filter(Boolean).join(" ").toLowerCase();
                return full.includes(bulkSearch.toLowerCase());
              }
              return true;
            });
            const selectedCount = Object.keys(bulkSelections).length;
            return (
              <div className="bulk-member-list-wrapper">
                {available.length === 0 ? (
                  <p className="bulk-empty">Nenhum membro disponível para esta habilidade.</p>
                ) : (
                  <ul className="bulk-member-list">
                    {available.map((m) => {
                      const fullName = [m.name, m.last_name].filter(Boolean).join(" ");
                      const isChecked = bulkSelections[m.id] !== undefined;
                      return (
                        <li key={m.id} className={`bulk-member-row${isChecked ? " selected" : ""}`}>
                          <label className="bulk-member-label">
                            <input
                              type="checkbox"
                              className="bulk-checkbox"
                              checked={isChecked}
                              onChange={() => toggleBulkMember(m.id)}
                            />
                            <div className="member-avatar-sm">
                              {m.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="bulk-member-name">{fullName}</span>
                          </label>
                          <select
                            className="bulk-rating-select"
                            disabled={!isChecked}
                            value={isChecked ? bulkSelections[m.id] : 5}
                            onChange={(e) => setBulkRating(m.id, Number(e.target.value))}
                            aria-label={`Nota de ${fullName}`}
                          >
                            {[1,2,3,4,5,6,7,8,9,10].map((n) => (
                              <option key={n} value={n}>{n}</option>
                            ))}
                          </select>
                        </li>
                      );
                    })}
                  </ul>
                )}
                {selectedCount > 0 && (
                  <p className="bulk-selection-count">
                    {selectedCount} membro{selectedCount !== 1 ? "s" : ""} selecionado{selectedCount !== 1 ? "s" : ""}
                  </p>
                )}
              </div>
            );
          })()}

          {bulkError && <p className="field-error">{bulkError}</p>}
          <div className="modal-footer">
            <button type="button" className="button secondary" onClick={() => setBulkModalOpen(false)} disabled={bulkSaving}>
              Cancelar
            </button>
            <button type="submit" className="button" disabled={bulkSaving || Object.keys(bulkSelections).length === 0}>
              {bulkSaving ? "Adicionando..." : `Adicionar${Object.keys(bulkSelections).length > 0 ? ` ${Object.keys(bulkSelections).length}` : ""}`}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Criar/Editar Habilidade */}
      <Modal
        isOpen={skillModalOpen}
        title={editingSkillId ? "Editar Habilidade" : "Nova Habilidade"}
        titleId={skillModalTitleId}
        onClose={() => setSkillModalOpen(false)}
      >
        <form onSubmit={handleSkillSubmit} className="form-layout">
          <label className="field" htmlFor="skill-name">
            <span>Nome *</span>
            <input
              id="skill-name"
              type="text"
              className="input"
              value={skillForm.name}
              onChange={(e) => dispatchSkillForm({ type: "SET", field: "name", value: e.target.value })}
              maxLength={100}
              autoFocus
            />
          </label>
          <label className="field" htmlFor="skill-description">
            <span>Descrição (opcional)</span>
            <textarea
              id="skill-description"
              className="input"
              value={skillForm.description}
              onChange={(e) => dispatchSkillForm({ type: "SET", field: "description", value: e.target.value })}
            />
          </label>
          {skillError && <p className="field-error">{skillError}</p>}
          <div className="modal-footer">
            <button type="button" className="button secondary" onClick={() => setSkillModalOpen(false)} disabled={skillSaving}>
              Cancelar
            </button>
            <button type="submit" className="button" disabled={skillSaving}>
              {skillSaving ? "Salvando..." : editingSkillId ? "Salvar" : "Criar"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Adicionar/Editar Habilidade a Membro */}
      <Modal
        isOpen={memberSkillModalOpen}
        title={editingMemberSkill ? "Editar Nota" : "Adicionar Habilidade a Membro"}
        titleId={memberSkillModalTitleId}
        onClose={() => setMemberSkillModalOpen(false)}
      >
        <form onSubmit={handleMemberSkillSubmit} className="form-layout">
          <label className="field" htmlFor="ms-skill">
            <span>Habilidade *</span>
            <select
              id="ms-skill"
              className="input"
              value={memberSkillForm.skillId}
              onChange={(e) => dispatchMemberSkillForm({ type: "SET", field: "skillId", value: e.target.value })}
              disabled={!!editingMemberSkill}
            >
              <option value="">Selecione...</option>
              {skills.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </label>
          <label className="field" htmlFor="ms-member">
            <span>Membro *</span>
            {editingMemberSkill ? (
              <input id="ms-member" type="text" className="input" value={memberSearch} disabled />
            ) : (
              <div className="member-search-wrapper">
                <input
                  id="ms-member"
                  type="text"
                  className="input"
                  placeholder="Buscar por nome..."
                  value={memberSearch}
                  autoComplete="off"
                  onChange={(e) => {
                    setMemberSearch(e.target.value);
                    setMemberDropdownOpen(true);
                    dispatchMemberSkillForm({ type: "SET", field: "memberId", value: "" });
                  }}
                  onFocus={() => setMemberDropdownOpen(true)}
                  onBlur={() => setTimeout(() => setMemberDropdownOpen(false), 150)}
                />
                {memberDropdownOpen && (
                  <ul className="member-search-dropdown">
                    {members
                      .filter((m) => {
                        const full = [m.name, m.last_name].filter(Boolean).join(" ").toLowerCase();
                        if (!full.includes(memberSearch.toLowerCase())) return false;
                        const selectedSkill = skills.find((s) => s.id === memberSkillForm.skillId);
                        if (selectedSkill && selectedSkill.members.some((sm) => sm.member_id === m.id)) return false;
                        return true;
                      })
                      .map((m) => (
                        <li
                          key={m.id}
                          className="member-search-option"
                          onMouseDown={() => {
                            dispatchMemberSkillForm({ type: "SET", field: "memberId", value: m.id });
                            setMemberSearch([m.name, m.last_name].filter(Boolean).join(" "));
                            setMemberDropdownOpen(false);
                          }}
                        >
                          {[m.name, m.last_name].filter(Boolean).join(" ")}
                        </li>
                      ))}
                  </ul>
                )}
              </div>
            )}
          </label>
          <label className="field" htmlFor="ms-rating">
            <span>Nota (1–10) *</span>
            <select
              id="ms-rating"
              className="input"
              value={memberSkillForm.rating}
              onChange={(e) => dispatchMemberSkillForm({ type: "SET", field: "rating", value: e.target.value })}
            >
              {[1,2,3,4,5,6,7,8,9,10].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
          {memberSkillError && <p className="field-error">{memberSkillError}</p>}
          <div className="modal-footer">
            <button type="button" className="button secondary" onClick={() => setMemberSkillModalOpen(false)} disabled={memberSkillSaving}>
              Cancelar
            </button>
            <button type="submit" className="button" disabled={memberSkillSaving}>
              {memberSkillSaving ? "Salvando..." : editingMemberSkill ? "Salvar" : "Adicionar"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Confirmar exclusão */}
      <Modal
        isOpen={!!deleteTarget}
        title="Confirmar exclusão"
        titleId={deleteModalTitleId}
        onClose={() => setDeleteTarget(null)}
        role="alertdialog"
      >
        <p>
          {deleteTarget?.type === "skill"
            ? `Tem certeza que deseja excluir a habilidade "${deleteTarget.name}"? Todos os vínculos com membros serão removidos.`
            : deleteTarget?.type === "memberSkill"
            ? `Tem certeza que deseja remover "${deleteTarget.memberName}" desta habilidade?`
            : null}
        </p>
        {deleteError && <p className="field-error">{deleteError}</p>}
        <div className="modal-footer">
          <button type="button" className="button secondary" onClick={() => setDeleteTarget(null)} disabled={deleting}>
            Cancelar
          </button>
          <button type="button" className="button danger" onClick={handleDeleteConfirm} disabled={deleting}>
            {deleting ? "Removendo..." : "Confirmar"}
          </button>
        </div>
      </Modal>
    </main>
  );
}
