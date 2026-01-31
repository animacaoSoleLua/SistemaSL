"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createMember,
  deleteMember,
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
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "animador" as Role,
    password: "",
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const isAdmin = currentUser?.role === "admin";

  const loadMembers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getMembers();
      setUsers(response.data as Member[]);
    } catch (err: any) {
      setError(err.message || "Erro ao carregar usuarios.");
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
    setSelectedId(null);
    setActionError(null);
    setModalOpen(true);
  };

  const openEditModal = (member: Member) => {
    setModalMode("edit");
    setFormData({ name: member.name, email: member.email, role: member.role, password: "" });
    setSelectedId(member.id);
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
      } else if (selectedId) {
        await updateMember(selectedId, {
          name: formData.name.trim(),
          email: formData.email.trim(),
          role: formData.role,
        });
      }
      await loadMembers();
      setModalOpen(false);
    } catch (err: any) {
      setActionError(err.message || "Nao foi possivel salvar o usuario.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (member: Member) => {
    const confirmed = window.confirm(`Excluir ${member.name}?`);
    if (!confirmed) return;
    setActionError(null);
    try {
      await deleteMember(member.id);
      await loadMembers();
    } catch (err: any) {
      setActionError(err.message || "Nao foi possivel excluir o usuario.");
    }
  };

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
              Novo Usuário
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

        <section className="card users-card">
          <div className="users-header">
            <div>
              <h2 className="section-title">Membros Sol e Lua</h2>
              <p>Lista de todos os Membros.</p>
            </div>
          </div>

          {loading ? (
            <div className="empty-state">
              <p>Carregando usuarios...</p>
            </div>
          ) : error ? (
            <div className="empty-state">
              <p className="text-red-500">Erro ao carregar usuarios: {error}</p>
            </div>
          ) : users.length === 0 ? (
            <div className="empty-state">
              <p>Nenhum usuario encontrado.</p>
            </div>
          ) : (
            <div className="users-table">
              <div className={`user-row user-head ${isAdmin ? "admin" : "read-only"}`}>
                <span>Nome</span>
                <span>E-mail</span>
                <span>Função</span>
                {isAdmin && <span className="user-actions-label">Ações</span>}
              </div>

              {users.map((user) => (
                <div
                  className={`user-row ${isAdmin ? "admin" : "read-only"}`}
                  key={user.id}
                >
                  <div className="user-cell user-name">{user.name}</div>
                  <div className="user-cell">{user.email}</div>
                  <div className="user-cell">
                    <span
                      className={`role-pill ${user.role === "admin" ? "admin" : ""}`}
                    >
                      {roleLabels[user.role]}
                    </span>
                  </div>
                  {isAdmin && (
                    <div className="user-cell user-actions">
                      <button
                        className="icon-button"
                        type="button"
                        aria-label="Editar usuário"
                        onClick={() => openEditModal(user)}
                      >
                        <svg viewBox="0 0 24 24">
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" />
                        </svg>
                      </button>
                      <button
                        className="icon-button danger"
                        type="button"
                        aria-label="Excluir usuário"
                        onClick={() => handleDelete(user)}
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
              ))}
            </div>
          )}

          {actionError && (
            <div className="empty-state">
              <p className="text-red-500">{actionError}</p>
            </div>
          )}
        </section>
      </section>

      {modalOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card">
            <header className="modal-header">
              <div>
                <h2 className="section-title">
                  {modalMode === "create" ? "Novo usuario" : "Editar usuario"}
                </h2>
                <p>
                  {modalMode === "create"
                    ? "Preencha os dados para criar um novo usuario."
                    : "Atualize as informacoes do usuario selecionado."}
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
