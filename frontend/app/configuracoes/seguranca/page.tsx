"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { changePassword, deleteSelfAccount, getErrorMessage, getMember, updateMember } from "../../../lib/api";
import { getStoredUser } from "../../../lib/auth";
import { useToast } from "../../context/ToastContext";

interface MemberBasic {
  id: string;
  email: string;
}

export default function ConfiguracoesSeguranca() {
  const router = useRouter();
  const { showToast } = useToast();
  const [member, setMember] = useState<MemberBasic | null>(null);
  const [loading, setLoading] = useState(true);

  const [newEmail, setNewEmail] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  useEffect(() => {
    const user = getStoredUser();
    if (!user) {
      router.push("/login");
      return;
    }
    const load = async () => {
      try {
        const response = await getMember(user.id);
        setMember({ id: response.data.id, email: response.data.email });
      } catch {
        // silently fail — user will see empty state
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [router]);

  const handleSaveEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member) return;
    const trimmed = newEmail.trim();
    if (!trimmed) {
      showToast("Informe o novo e-mail.", "error");
      return;
    }
    if (trimmed === member.email) {
      showToast("O novo e-mail é igual ao atual.", "error");
      return;
    }
    setSavingEmail(true);
    try {
      await updateMember(member.id, { email: trimmed });
      setMember((cur) => (cur ? { ...cur, email: trimmed } : cur));
      setNewEmail("");
      showToast("E-mail atualizado com sucesso.", "success");
    } catch (err: unknown) {
      showToast(getErrorMessage(err, "Erro ao atualizar e-mail."), "error");
    } finally {
      setSavingEmail(false);
    }
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member) return;
    if (!currentPassword || !newPassword || !confirmPassword) {
      showToast("Preencha todos os campos.", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast("A nova senha e a confirmação não coincidem.", "error");
      return;
    }
    setSavingPassword(true);
    try {
      await changePassword(member.id, currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      showToast("Senha alterada com sucesso.", "success");
    } catch (err: unknown) {
      showToast(getErrorMessage(err, "Erro ao alterar senha."), "error");
    } finally {
      setSavingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!member || !deletePassword) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteSelfAccount(member.id, deletePassword);
      sessionStorage.removeItem("authToken");
      sessionStorage.removeItem("user");
      router.push("/login");
    } catch (err: unknown) {
      setDeleteError(getErrorMessage(err, "Erro ao excluir conta."));
      setDeleting(false);
    }
  };

  if (loading) return <div className="empty-state"><p>Carregando...</p></div>;

  return (
    <>
      <form className="form-layout" onSubmit={handleSaveEmail}>
        <article className="form-card">
          <div className="form-card-head">
            <h2 className="section-title">E-mail de acesso</h2>
            <p>Seu e-mail é usado para fazer login na plataforma.</p>
          </div>
          <div className="form-grid">
            <label className="field full">
              <span>E-mail atual</span>
              <input className="input" type="email" value={member?.email ?? ""} readOnly disabled />
            </label>
            <label className="field full" htmlFor="newEmail">
              <span>Novo e-mail</span>
              <input
                id="newEmail"
                className="input"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="novo@email.com"
                autoComplete="email"
              />
            </label>
          </div>
          <div className="form-actions">
            <div className="form-buttons">
              <button type="submit" className="button" disabled={savingEmail || !newEmail.trim()}>
                {savingEmail ? (
                  <>
                    <span className="btn-spinner" aria-hidden="true" />
                    Salvando...
                  </>
                ) : (
                  "Salvar e-mail"
                )}
              </button>
            </div>
          </div>
        </article>
      </form>

      <form className="form-layout" onSubmit={handleSavePassword} style={{ marginTop: "24px" }}>
        <article className="form-card">
          <div className="form-card-head">
            <h2 className="section-title">Senha</h2>
            <p>Altere sua senha periodicamente para maior segurança.</p>
          </div>
          <div className="form-grid">
            <label className="field full" htmlFor="currentPassword">
              <span>Senha atual</span>
              <input
                id="currentPassword"
                className="input"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="********"
              />
            </label>
            <label className="field full" htmlFor="newPassword">
              <span>Nova senha</span>
              <input
                id="newPassword"
                className="input"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                placeholder="********"
              />
            </label>
            <label className="field full" htmlFor="confirmPassword">
              <span>Confirmar nova senha</span>
              <input
                id="confirmPassword"
                className="input"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                placeholder="********"
              />
            </label>
          </div>
          <div className="form-actions">
            <div className="form-buttons">
              <button
                type="submit"
                className="button"
                disabled={savingPassword || !currentPassword || !newPassword || !confirmPassword}
              >
                {savingPassword ? (
                  <>
                    <span className="btn-spinner" aria-hidden="true" />
                    Salvando...
                  </>
                ) : (
                  "Salvar senha"
                )}
              </button>
            </div>
          </div>
        </article>
      </form>

      {/* Zona de perigo */}
      <div style={{ marginTop: "32px" }}>
        <article className="form-card" style={{ border: "1px solid rgba(208, 75, 75, 0.4)" }}>
          <div className="form-card-head">
            <h2 className="section-title" style={{ color: "#d04b4b" }}>
              Zona de perigo
            </h2>
            <p>Excluir sua conta é uma ação permanente e não pode ser desfeita.</p>
          </div>
          <div className="form-actions">
            <div className="form-buttons">
              <button
                type="button"
                className="button danger"
                onClick={() => { setShowDeleteModal(true); setDeletePassword(""); setDeleteError(null); }}
              >
                Excluir minha conta
              </button>
            </div>
          </div>
        </article>
      </div>

      {/* Modal de confirmação */}
      {showDeleteModal && createPortal(
        <div
          className="modal-backdrop"
          onClick={(e) => { if (e.target === e.currentTarget && !deleting) { setShowDeleteModal(false); } }}
          onKeyDown={(e) => { if (e.key === "Escape" && !deleting) setShowDeleteModal(false); }}
        >
          <div
            className="modal-card modal-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-modal-title"
          >
            <div className="modal-header">
              <h2 id="delete-modal-title" className="section-title" style={{ color: "#d04b4b" }}>
                Excluir conta permanentemente
              </h2>
            </div>
            <div className="modal-body">
              <p>
                Esta ação <strong>não pode ser desfeita</strong>. Seu perfil, cursos, advertências e
                todos os dados relacionados serão apagados para sempre.
              </p>
              <label className="field">
                Digite sua senha para confirmar
                <input
                  className="input"
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Sua senha atual"
                  autoFocus
                  disabled={deleting}
                  autoComplete="current-password"
                />
              </label>
              {deleteError && (
                <p className="text-error" role="alert" aria-live="polite">{deleteError}</p>
              )}
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="button secondary"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="button danger"
                onClick={handleDeleteAccount}
                disabled={deleting || !deletePassword}
              >
                {deleting ? (
                  <>
                    <span className="btn-spinner" aria-hidden="true" />
                    Excluindo...
                  </>
                ) : (
                  "Excluir minha conta"
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
