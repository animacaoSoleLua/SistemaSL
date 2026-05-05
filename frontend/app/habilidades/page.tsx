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

  // Skill modal (create/edit)
  const [skillModalOpen, setSkillModalOpen] = useState(false);
  const [editingSkillId, setEditingSkillId] = useState<string | null>(null);
  const [skillForm, dispatchSkillForm] = useReducer(skillFormReducer, { name: "", description: "" });
  const [skillSaving, setSkillSaving] = useState(false);
  const [skillError, setSkillError] = useState<string | null>(null);

  // MemberSkill modal (add/edit)
  const [memberSkillModalOpen, setMemberSkillModalOpen] = useState(false);
  const [editingMemberSkill, setEditingMemberSkill] = useState<{ skillId: string; memberId: string } | null>(null);
  const [memberSkillForm, dispatchMemberSkillForm] = useReducer(memberSkillFormReducer, { skillId: "", memberId: "", rating: "5" });
  const [memberSkillSaving, setMemberSkillSaving] = useState(false);
  const [memberSkillError, setMemberSkillError] = useState<string | null>(null);
  const [memberSearch, setMemberSearch] = useState("");
  const [memberDropdownOpen, setMemberDropdownOpen] = useState(false);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<{ type: "skill"; id: string; name: string } | { type: "memberSkill"; skillId: string; memberId: string; memberName: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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

  const getMemberFullName = (m: SkillMember) =>
    [m.name, m.last_name].filter(Boolean).join(" ");

  if (loading) {
    return (
      <main className="page-content">
        <div className="habilidades-header">
          <h1>Habilidades</h1>
        </div>
        <p>Carregando...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="page-content">
        <div className="habilidades-header">
          <h1>Habilidades</h1>
        </div>
        <p className="modal-error">{error}</p>
      </main>
    );
  }

  return (
    <main className="page-content">
      <div className="habilidades-header">
        <h1>Habilidades</h1>
        <div className="habilidades-header-actions">
          <button type="button" className="btn btn-secondary" onClick={openAddMemberSkill}>
            <FiUserPlus aria-hidden="true" /> Adicionar a Membro
          </button>
          <button type="button" className="btn btn-primary" onClick={openCreateSkill}>
            <FiPlus aria-hidden="true" /> Nova Habilidade
          </button>
        </div>
      </div>

      {skills.length === 0 ? (
        <div className="habilidades-empty">
          <FiStar size={32} aria-hidden="true" />
          <p>Nenhuma habilidade cadastrada ainda.</p>
        </div>
      ) : (
        <div className="habilidades-list">
          {skills.map((skill) => {
            const isOpen = expandedSkillId === skill.id;
            return (
              <div key={skill.id} className="habilidade-item">
                <div className="habilidade-summary" style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px" }}>
                  <button
                    type="button"
                    onClick={() => setExpandedSkillId(isOpen ? null : skill.id)}
                    style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: 0 }}
                    aria-expanded={isOpen}
                  >
                    <FiChevronRight
                      className={`habilidade-chevron${isOpen ? " open" : ""}`}
                      aria-hidden="true"
                    />
                    <span className="habilidade-name">{skill.name}</span>
                    <span className="habilidade-count">{skill.members.length} {skill.members.length === 1 ? "membro" : "membros"}</span>
                  </button>
                  <div className="habilidade-actions">
                    <button
                      type="button"
                      className="btn btn-icon"
                      aria-label={`Editar ${skill.name}`}
                      onClick={() => openEditSkill(skill)}
                    >
                      <FiEdit2 size={15} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="btn btn-icon btn-danger"
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
                                        width={28}
                                        height={28}
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
                                    className="btn btn-icon"
                                    aria-label={`Editar nota de ${getMemberFullName(m)}`}
                                    onClick={() => openEditMemberSkill(skill.id, m.member_id, m.rating)}
                                  >
                                    <FiEdit2 size={13} aria-hidden="true" />
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-icon btn-danger"
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
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Criar/Editar Habilidade */}
      <Modal
        isOpen={skillModalOpen}
        title={editingSkillId ? "Editar Habilidade" : "Nova Habilidade"}
        titleId={skillModalTitleId}
        onClose={() => setSkillModalOpen(false)}
      >
          <form onSubmit={handleSkillSubmit}>
            <div className="modal-field">
              <label htmlFor="skill-name">Nome *</label>
              <input
                id="skill-name"
                type="text"
                value={skillForm.name}
                onChange={(e) => dispatchSkillForm({ type: "SET", field: "name", value: e.target.value })}
                maxLength={100}
                autoFocus
              />
            </div>
            <div className="modal-field">
              <label htmlFor="skill-description">Descrição (opcional)</label>
              <textarea
                id="skill-description"
                value={skillForm.description}
                onChange={(e) => dispatchSkillForm({ type: "SET", field: "description", value: e.target.value })}
              />
            </div>
            {skillError && <p className="modal-error">{skillError}</p>}
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setSkillModalOpen(false)} disabled={skillSaving}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary" disabled={skillSaving}>
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
          <form onSubmit={handleMemberSkillSubmit}>
            <div className="modal-field">
              <label htmlFor="ms-skill">Habilidade *</label>
              <select
                id="ms-skill"
                value={memberSkillForm.skillId}
                onChange={(e) => dispatchMemberSkillForm({ type: "SET", field: "skillId", value: e.target.value })}
                disabled={!!editingMemberSkill}
              >
                <option value="">Selecione...</option>
                {skills.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="modal-field">
              <label htmlFor="ms-member">Membro *</label>
              {editingMemberSkill ? (
                <input id="ms-member" type="text" value={memberSearch} disabled />
              ) : (
                <div className="member-search-wrapper">
                  <input
                    id="ms-member"
                    type="text"
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
                          return full.includes(memberSearch.toLowerCase());
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
            </div>
            <div className="modal-field">
              <label htmlFor="ms-rating">Nota (1–10) *</label>
              <select
                id="ms-rating"
                value={memberSkillForm.rating}
                onChange={(e) => dispatchMemberSkillForm({ type: "SET", field: "rating", value: e.target.value })}
              >
                {[1,2,3,4,5,6,7,8,9,10].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
            {memberSkillError && <p className="modal-error">{memberSkillError}</p>}
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setMemberSkillModalOpen(false)} disabled={memberSkillSaving}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary" disabled={memberSkillSaving}>
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
      >
          <p>
            {deleteTarget?.type === "skill"
              ? `Tem certeza que deseja excluir a habilidade "${deleteTarget.name}"? Todos os vínculos com membros serão removidos.`
              : deleteTarget?.type === "memberSkill"
              ? `Tem certeza que deseja remover "${deleteTarget.memberName}" desta habilidade?`
              : null}
          </p>
          {deleteError && <p className="modal-error">{deleteError}</p>}
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancelar
            </button>
            <button type="button" className="btn btn-danger" onClick={handleDeleteConfirm} disabled={deleting}>
              {deleting ? "Removendo..." : "Confirmar"}
            </button>
          </div>
      </Modal>
    </main>
  );
}
