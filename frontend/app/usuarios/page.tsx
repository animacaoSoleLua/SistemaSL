"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createMember,
  deleteMember,
  getMember,
  getMembers,
  updateMember,
} from "../../lib/api";
import { getStoredUser, roleLabels, type Role, type StoredUser } from "../../lib/auth";

interface Member {
  id: string;
  name: string;
  email: string;
  role: Role;
}

interface MemberFeedback {
  id: string;
  report_id: string;
  feedback: string;
  event_date: string;
  contractor_name: string;
}

interface MemberWarning {
  id: string;
  reason: string;
  warning_date: string;
  created_by: string;
}

interface MemberDetails {
  id: string;
  name: string;
  email: string;
  role: Role;
  feedbacks?: MemberFeedback[];
  warnings?: MemberWarning[];
}

export default function UsuariosPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<StoredUser | null>(null);
  const [users, setUsers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "animador" as Role,
    password: "",
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [selectedMemberDetails, setSelectedMemberDetails] =
    useState<MemberDetails | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const isAdmin = currentUser?.role === "admin";

  const loadMembers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getMembers();
      setUsers(response.data as Member[]);
    } catch (err: any) {
      setError(err.message || "Erro ao carregar membros.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const stored = getStoredUser();
    if (!stored) {
      router.push("/login");
      return;
    }
    setCurrentUser(stored);
  }, [router]);

  useEffect(() => {
    loadMembers();
  }, []);

  const totalUsers = users.length;
  const totalAdmins = users.filter((user) => user.role === "admin").length;
  const totalAnimadores = users.filter((user) => user.role === "animador").length;
  const totalRecreadores = users.filter((user) => user.role === "recreador").length;

  const openCreateModal = () => {
    setModalMode("create");
    setFormData({ name: "", email: "", role: "animador", password: "" });
    setEditingId(null);
    setActionError(null);
    setModalOpen(true);
  };

  const openEditModal = (member: Member) => {
    setModalMode("edit");
    setFormData({ name: member.name, email: member.email, role: member.role, password: "" });
    setEditingId(member.id);
    setActionError(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setActionError(null);

    try {
      if (modalMode === "create") {
        await createMember({
          name: formData.name.trim(),
          email: formData.email.trim(),
          role: formData.role,
          password: formData.password.trim(),
        });
      } else if (editingId) {
        await updateMember(editingId, {
          name: formData.name.trim(),
          email: formData.email.trim(),
          role: formData.role,
        });
      }
      await loadMembers();
      setModalOpen(false);
    } catch (err: any) {
      setActionError(err.message || "Nao foi possivel salvar o membro.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (member: Member) => {
    const confirmed = window.confirm(`Excluir membro ${member.name}?`);
    if (!confirmed) return;
    setActionError(null);
    try {
      await deleteMember(member.id);
      await loadMembers();
    } catch (err: any) {
      setActionError(err.message || "Nao foi possivel excluir o membro.");
    }
  };

  const filteredUsers = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    if (!search) {
      return users;
    }
    return users.filter(
      (user) =>
        user.name.toLowerCase().includes(search) ||
        user.email.toLowerCase().includes(search)
    );
  }, [users, searchTerm]);

  useEffect(() => {
    if (filteredUsers.length === 0) {
      setSelectedMemberId(null);
      return;
    }
    if (selectedMemberId && !filteredUsers.some((user) => user.id === selectedMemberId)) {
      setSelectedMemberId(null);
    }
  }, [filteredUsers, selectedMemberId]);

  const selectedMember =
    selectedMemberId ? users.find((user) => user.id === selectedMemberId) ?? null : null;

  useEffect(() => {
    if (!isAdmin || !selectedMemberId) {
      setSelectedMemberDetails(null);
      setDetailsError(null);
      setDetailsLoading(false);
      return;
    }

    let cancelled = false;
    setDetailsLoading(true);
    setDetailsError(null);

    getMember(selectedMemberId)
      .then((response) => {
        if (cancelled) return;
        setSelectedMemberDetails(response.data as MemberDetails);
      })
      .catch((err: any) => {
        if (cancelled) return;
        setDetailsError(err.message || "Erro ao carregar detalhes.");
      })
      .finally(() => {
        if (cancelled) return;
        setDetailsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isAdmin, selectedMemberId]);

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((part) => part.trim())
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("");

  const formatDateBR = (value: string) => {
    const [year, month, day] = value.split("-");
    if (!year || !month || !day) {
      return value;
    }
    return `${day}/${month}/${year}`;
  };

  const creatorNameById = useMemo(() => {
    return new Map(users.map((user) => [user.id, user.name]));
  }, [users]);

  const selectedMemberInfo = selectedMemberDetails ?? selectedMember;
  const warnings = selectedMemberDetails?.warnings ?? [];

  return (
    <main className="app-page">
      <section className="shell reveal">
        <header className="page-header">
          <div>
            <h1 className="hero-title">Membros</h1>
            <p className="hero-copy">
              {isAdmin
                ? "Crie e gerencie membros da Sol e Lua."
                : "Visualize os membros Sol e Lua."}
            </p>
          </div>
          {isAdmin && (
            <button
              className="button user-action-primary"
              type="button"
              onClick={openCreateModal}
            >
              <span className="button-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M19 8v6" />
                  <path d="M22 11h-6" />
                </svg>
              </span>
              Novo Membro
            </button>
          )}
        </header>

        <section className="users-summary">
          <article className="summary-card">
            <div className="summary-head">
              <span className="summary-label">Total de Membros</span>
              <span className="summary-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 00-3-3.87" />
                  <path d="M16 3.13a4 4 0 010 7.75" />
                </svg>
              </span>
            </div>
            <strong className="summary-value">{totalUsers}</strong>
          </article>

          <article className="summary-card">
            <div className="summary-head">
              <span className="summary-label">Administradores</span>
              <span className="summary-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M12 2l7 4v6c0 5-3.5 9-7 10-3.5-1-7-5-7-10V6z" />
                </svg>
              </span>
            </div>
            <strong className="summary-value">{totalAdmins}</strong>
          </article>

          <article className="summary-card">
            <div className="summary-head">
              <span className="summary-label">Animadores</span>
              <span className="summary-icon gold" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M12 2l2.4 4.9L20 8l-4 3.8L17 18l-5-2.6L7 18l1-6.2L4 8l5.6-1.1z" />
                </svg>
              </span>
            </div>
            <strong className="summary-value">{totalAnimadores}</strong>
          </article>

          <article className="summary-card">
            <div className="summary-head">
              <span className="summary-label">Recreadores</span>
              <span className="summary-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M16 11c1.7 0 3-1.8 3-4s-1.3-4-3-4-3 1.8-3 4 1.3 4 3 4z" />
                  <path d="M8 12c2.2 0 4-2.2 4-5S10.2 2 8 2 4 4.2 4 7s1.8 5 4 5z" />
                  <path d="M2 22v-2c0-2.9 2.4-5.2 5.3-5.2h1.5c2 0 3.8.9 4.7 2.4" />
                  <path d="M14 22v-2c0-2.4 1.9-4.4 4.3-4.4h1.4c2.4 0 4.3 2 4.3 4.4v2" />
                </svg>
              </span>
            </div>
            <strong className="summary-value">{totalRecreadores}</strong>
          </article>
        </section>

        <section className="users-board">
          <div className="card users-card">
            <div className="members-header">
              <div>
                <h2 className="section-title">Membros Sol e Lua</h2>
                <p>Lista de todos os membros.</p>
              </div>
              <div className="members-search">
                <input
                  className="input"
                  type="search"
                  placeholder="Buscar por nome ou email..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </div>
            </div>

            {loading ? (
              <div className="empty-state">
                <p>Carregando membros...</p>
              </div>
            ) : error ? (
              <div className="empty-state">
                <p className="text-red-500">Erro ao carregar membros: {error}</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="empty-state">
                <p>Nenhum membro encontrado.</p>
              </div>
            ) : (
              <div className="members-list">
                {filteredUsers.map((user) => {
                  const isSelected = selectedMemberId === user.id;
                  return (
                    <div
                      className={`member-row ${isAdmin ? "admin" : "read-only"} ${
                        isSelected ? "selected" : ""
                      }`}
                      key={user.id}
                      role="button"
                      tabIndex={0}
                      aria-pressed={isSelected}
                      onClick={() => setSelectedMemberId(user.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setSelectedMemberId(user.id);
                        }
                      }}
                    >
                      <div className="member-row-avatar" aria-hidden="true">
                        {getInitials(user.name)}
                      </div>
                      <div className="member-row-info">
                        <strong className="member-row-name">{user.name}</strong>
                        <span className="member-row-email">{user.email}</span>
                      </div>
                      <div className="member-row-right">
                        <span className={`role-pill ${user.role}`}>
                          {roleLabels[user.role]}
                        </span>
                        {isAdmin && (
                          <div className="member-row-actions">
                            <button
                              className="icon-button"
                              type="button"
                              aria-label="Editar membro"
                              onClick={(event) => {
                                event.stopPropagation();
                                openEditModal(user);
                              }}
                            >
                              <svg viewBox="0 0 24 24">
                                <path d="M12 20h9" />
                                <path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" />
                              </svg>
                            </button>
                            <button
                              className="icon-button danger"
                              type="button"
                              aria-label="Excluir membro"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleDelete(user);
                              }}
                            >
                              <svg viewBox="0 0 24 24">
                                <path d="M3 6h18" />
                                <path d="M8 6V4h8v2" />
                                <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                                <path d="M10 11v6" />
                                <path d="M14 11v6" />
                              </svg>
                            </button>
                          </div>
                        )}
                        </div>
                    </div>
                  );
                })}
              </div>
            )}

            {actionError && (
              <div className="empty-state">
                <p className="text-red-500">{actionError}</p>
              </div>
            )}
          </div>

          <aside className="card member-panel">
            <div className="member-panel-header">
              <h2 className="section-title">Detalhes do membro</h2>
              <p>Clique em um membro para ver os detalhes.</p>
            </div>

            {!selectedMember ? (
              <div className="member-panel-empty">
                <span className="member-panel-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4 20c0-4.2 3.6-7 8-7s8 2.8 8 7" />
                  </svg>
                </span>
                <p>Selecione um membro para ver detalhes.</p>
              </div>
            ) : (
              <div className="member-panel-body">
                {selectedMemberInfo && (
                  <div className="member-identity">
                    <div className="member-avatar" aria-hidden="true">
                      {getInitials(selectedMemberInfo.name)}
                    </div>
                    <div>
                      <strong className="member-name">{selectedMemberInfo.name}</strong>
                      <span className="member-email">{selectedMemberInfo.email}</span>
                    </div>
                  </div>
                )}

                {selectedMemberInfo && (
                  <div className="member-meta">
                    <div className="member-meta-item">
                      <span className="member-meta-label">Função</span>
                      <span className={`role-pill ${selectedMemberInfo.role}`}>
                        {roleLabels[selectedMemberInfo.role]}
                      </span>
                    </div>
                  </div>
                )}

                {isAdmin && (
                  <div className="member-feedbacks">
                    <div className="member-feedbacks-header">
                      <h3 className="section-title">Advertências</h3>
                      <span className="member-feedbacks-count">
                        {warnings.length}
                      </span>
                    </div>
                    {detailsLoading ? (
                      <p className="member-feedbacks-empty">Carregando advertências...</p>
                    ) : detailsError ? (
                      <p className="member-feedbacks-error">{detailsError}</p>
                    ) : warnings.length === 0 ? (
                      <p className="member-feedbacks-empty">Nenhuma advertência registrada.</p>
                    ) : (
                      <ul className="member-feedbacks-list">
                        {warnings.map((entry) => (
                          <li className="member-feedbacks-item" key={entry.id}>
                            <span className="member-feedbacks-date">
                              {formatDateBR(entry.warning_date)}
                            </span>
                            <strong className="member-feedbacks-title">
                              {creatorNameById.get(entry.created_by) ?? "Usuario"}
                            </strong>
                            <span className="member-feedbacks-text">
                              {entry.reason}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            )}
          </aside>
        </section>
      </section>

      {modalOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card">
            <header className="modal-header">
              <div>
                <h2 className="section-title">
                  {modalMode === "create" ? "Novo membro" : "Editar membro"}
                </h2>
                <p>
                  {modalMode === "create"
                    ? "Preencha os dados para criar um novo membro."
                    : "Atualize as informacoes do membro selecionado."}
                </p>
              </div>
              <button
                className="icon-button"
                type="button"
                aria-label="Fechar"
                onClick={closeModal}
              >
                <svg viewBox="0 0 24 24">
                  <path d="M18 6L6 18" />
                  <path d="M6 6l12 12" />
                </svg>
              </button>
            </header>

            <form className="modal-body" onSubmit={handleSave}>
              <div className="form-grid">
                <label className="field">
                  Nome
                  <input
                    className="input"
                    type="text"
                    value={formData.name}
                    onChange={(event) =>
                      handleInputChange("name", event.target.value)
                    }
                    required
                    disabled={saving}
                  />
                </label>
                <label className="field">
                  E-mail
                  <input
                    className="input"
                    type="email"
                    value={formData.email}
                    onChange={(event) =>
                      handleInputChange("email", event.target.value)
                    }
                    required
                    disabled={saving}
                  />
                </label>
                {modalMode === "create" && (
                  <label className="field full">
                    Senha
                    <input
                      className="input"
                      type="password"
                      value={formData.password}
                      onChange={(event) =>
                        handleInputChange("password", event.target.value)
                      }
                      required
                      disabled={saving}
                    />
                  </label>
                )}
                <label className="field full">
                  Função
                  <select
                    className="input"
                    value={formData.role}
                    onChange={(event) =>
                      handleInputChange("role", event.target.value)
                    }
                    disabled={saving}
                  >
                    <option value="animador">Animador</option>
                    <option value="recreador">Recreador</option>
                    <option value="admin">Admin</option>
                  </select>
                </label>
              </div>

              <div className="modal-footer">
                <button
                  className="button secondary"
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button className="button" type="submit" disabled={saving}>
                  {saving ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
