"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { changePassword, deleteSelfAccount, getErrorMessage, getMember, updateMember } from "../../../lib/api";
import { getStoredUser } from "../../../lib/auth";

interface MemberBasic {
  id: string;
  email: string;
}

export default function ConfiguracoesSeguranca() {
  const router = useRouter();
  const [member, setMember] = useState<MemberBasic | null>(null);
  const [loading, setLoading] = useState(true);

  const [newEmail, setNewEmail] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

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
      setEmailError("Informe o novo e-mail.");
      return;
    }
    if (trimmed === member.email) {
      setEmailError("O novo e-mail é igual ao atual.");
      return;
    }
    setSavingEmail(true);
    setEmailError(null);
    setEmailSuccess(null);
    try {
      await updateMember(member.id, { email: trimmed });
      setMember((cur) => (cur ? { ...cur, email: trimmed } : cur));
      setNewEmail("");
      setEmailSuccess("E-mail atualizado com sucesso.");
    } catch (err: unknown) {
      setEmailError(getErrorMessage(err, "Erro ao atualizar e-mail."));
    } finally {
      setSavingEmail(false);
    }
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member) return;
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("Preencha todos os campos.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("A nova senha e a confirmação não coincidem.");
      return;
    }
    setSavingPassword(true);
    setPasswordError(null);
    setPasswordSuccess(null);
    try {
      await changePassword(member.id, currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordSuccess("Senha alterada com sucesso.");
    } catch (err: unknown) {
      setPasswordError(getErrorMessage(err, "Erro ao alterar senha."));
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
                {savingEmail ? "Salvando..." : "Salvar e-mail"}
              </button>
            </div>
          </div>
          {emailError && <p className="text-red-500" role="alert" aria-live="polite">{emailError}</p>}
          {emailSuccess && <p className="text-green-600" role="status" aria-live="polite">{emailSuccess}</p>}
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
                {savingPassword ? "Salvando..." : "Salvar senha"}
              </button>
            </div>
          </div>
          {passwordError && <p className="text-red-500" role="alert" aria-live="polite">{passwordError}</p>}
          {passwordSuccess && <p className="text-green-600" role="status" aria-live="polite">{passwordSuccess}</p>}
        </article>
      </form>

      {/* Zona de perigo */}
      <div style={{ marginTop: "32px" }}>
        <article
          className="form-card"
          style={{ borderColor: "var(--red, #dc2626)", borderWidth: "1px", borderStyle: "solid" }}
        >
          <div className="form-card-head">
            <h2 className="section-title" style={{ color: "var(--red, #dc2626)" }}>
              Zona de perigo
            </h2>
            <p>Excluir sua conta é uma ação permanente e não pode ser desfeita.</p>
          </div>
          <div className="form-actions">
            <div className="form-buttons">
              <button
                type="button"
                onClick={() => { setShowDeleteModal(true); setDeletePassword(""); setDeleteError(null); }}
                style={{
                  background: "transparent",
                  color: "var(--red, #dc2626)",
                  border: "1.5px solid var(--red, #dc2626)",
                  borderRadius: "8px",
                  padding: "8px 20px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
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
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-modal-title"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
          onClick={(e) => { if (e.target === e.currentTarget && !deleting) { setShowDeleteModal(false); } }}
          onKeyDown={(e) => { if (e.key === "Escape" && !deleting) setShowDeleteModal(false); }}
        >
          <div
            style={{
              background: "var(--bg, #fff)",
              borderRadius: "16px",
              padding: "32px 28px",
              maxWidth: "440px",
              width: "100%",
              boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            <h2
              id="delete-modal-title"
              style={{
                margin: 0,
                fontSize: "18px",
                fontWeight: 700,
                textAlign: "center",
                color: "var(--red, #dc2626)",
              }}
            >
              Excluir conta permanentemente
            </h2>
            <p style={{ margin: 0, textAlign: "center", color: "var(--muted)", fontSize: "14px" }}>
              Esta ação <strong>não pode ser desfeita</strong>. Seu perfil, cursos, advertências e
              todos os dados relacionados serão apagados para sempre.
            </p>
            <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "14px", fontWeight: 500 }}>
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
              <p style={{ margin: 0, color: "var(--red, #dc2626)", fontSize: "14px" }} role="alert" aria-live="polite">
                {deleteError}
              </p>
            )}
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                style={{
                  background: "var(--accent-soft)",
                  border: "none",
                  borderRadius: "8px",
                  padding: "9px 20px",
                  fontWeight: 600,
                  cursor: deleting ? "not-allowed" : "pointer",
                  color: "var(--muted)",
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleting || !deletePassword}
                style={{
                  background: "var(--red, #dc2626)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  padding: "9px 20px",
                  fontWeight: 600,
                  cursor: deleting || !deletePassword ? "not-allowed" : "pointer",
                  opacity: deleting || !deletePassword ? 0.6 : 1,
                }}
              >
                {deleting ? "Excluindo..." : "Excluir minha conta"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
