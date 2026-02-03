"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMember, updateMember, uploadMemberPhoto } from "../../lib/api";
import {
  getDefaultRoute,
  getStoredUser,
  isRoleAllowed,
  type Role,
} from "../../lib/auth";

interface WarningItem {
  id: string;
  reason: string;
  warning_date: string;
}

interface SuspensionInfo {
  status: "active" | "suspended";
  start_date: string | null;
  end_date: string | null;
}

interface MemberDetail {
  id: string;
  name: string;
  email: string;
  role: Role;
  photo_url?: string | null;
  courses: Array<{
    id: string;
    title: string;
    course_date: string;
    status: "enrolled" | "attended" | "missed";
  }>;
  warnings: WarningItem[];
  warnings_total: number;
  suspension: SuspensionInfo;
}

export default function PerfilPage() {
  const router = useRouter();
  const [member, setMember] = useState<MemberDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoInputKey, setPhotoInputKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  useEffect(() => {
    const user = getStoredUser();
    if (!user) {
      router.push("/login");
      return;
    }
    if (!isRoleAllowed(user.role, ["recreador", "animador", "admin"])) {
      router.push(getDefaultRoute(user.role));
      return;
    }
    const loadProfile = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await getMember(user.id);
        setMember(response.data as MemberDetail);
      } catch (err: any) {
        setError(err.message || "Erro ao carregar perfil.");
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, [router]);

  useEffect(() => {
    if (member) {
      setEditName(member.name);
      setEditEmail(member.email);
      setPhotoFile(null);
    }
  }, [member]);

  useEffect(() => {
    if (!photoFile) {
      setPhotoPreview(null);
      return;
    }
    const url = URL.createObjectURL(photoFile);
    setPhotoPreview(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [photoFile]);

  const formatDateBR = (value: string) => {
    const [year, month, day] = value.split("-");
    if (!year || !month || !day) {
      return value;
    }
    return `${day}/${month}/${year}`;
  };

  const formatCourseStatus = (status: "enrolled" | "attended" | "missed") => {
    if (status === "attended") return "Presente";
    if (status === "missed") return "Faltou";
    return "Inscrito";
  };

  const hasProfileChanges =
    member &&
    (editName.trim() !== member.name || editEmail.trim() !== member.email);
  const hasPhotoChange = !!photoFile;
  const hasChanges = !!hasProfileChanges || hasPhotoChange;

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!member) {
      return;
    }
    const trimmedName = editName.trim();
    const trimmedEmail = editEmail.trim();

    if (!trimmedName || !trimmedEmail) {
      setSaveError("Preencha nome e e-mail para salvar.");
      setSaveSuccess(null);
      return;
    }

    if (!hasChanges) {
      setSaveError(null);
      setSaveSuccess("Nenhuma alteração para salvar.");
      return;
    }

    setSaving(true);
    setSaveError(null);
    setSaveSuccess(null);
    try {
      if (hasProfileChanges) {
        await updateMember(member.id, {
          name: trimmedName,
          email: trimmedEmail,
        });
        setMember((current) =>
          current
            ? {
                ...current,
                name: trimmedName,
                email: trimmedEmail,
              }
            : current
        );
        const storedUser = getStoredUser();
        if (storedUser) {
          localStorage.setItem(
            "user",
            JSON.stringify({
              ...storedUser,
              name: trimmedName,
            })
          );
        }
      }
      if (photoFile) {
        const response = await uploadMemberPhoto(member.id, photoFile);
        const photoUrl = response?.data?.photo_url ?? null;
        setMember((current) =>
          current
            ? {
                ...current,
                photo_url: photoUrl,
              }
            : current
        );
        setPhotoFile(null);
        setPhotoInputKey((prev) => prev + 1);
      }
      if (hasProfileChanges && hasPhotoChange) {
        setSaveSuccess("Dados e foto atualizados com sucesso.");
      } else if (hasPhotoChange) {
        setSaveSuccess("Foto atualizada com sucesso.");
      } else {
        setSaveSuccess("Dados atualizados com sucesso.");
      }
    } catch (err: any) {
      setSaveError(err.message || "Erro ao salvar perfil.");
    } finally {
      setSaving(false);
    }
  };

  const previewUrl = photoPreview ?? member?.photo_url ?? "";

  return (
    <main className="app-page">
      <section className="shell reveal">
        <header className="page-header">
          <div>
            <h1 className="hero-title">Meu Perfil</h1>
            <p className="hero-copy">Veja suas informações e advertências.</p>
          </div>
        </header>

        {loading ? (
          <div className="empty-state">
            <p>Carregando perfil...</p>
          </div>
        ) : error ? (
          <div className="empty-state">
            <p className="text-red-500">Erro ao carregar perfil: {error}</p>
          </div>
        ) : member ? (
          <>
            <form className="form-layout" onSubmit={handleSave}>
              <article className="form-card">
                <div className="form-card-head">
                  <h2 className="section-title">Editar perfil</h2>
                  <p>Atualize seu nome e e-mail para usar no login.</p>
                </div>
                <div className="form-grid">
                  <div className="profile-photo-block">
                    <div className="profile-photo-preview" aria-hidden="true">
                      {previewUrl ? (
                        <img className="avatar-image" src={previewUrl} alt="" />
                      ) : (
                        <span className="profile-photo-placeholder">Sem foto</span>
                      )}
                    </div>
                    <div className="profile-photo-meta">
                      <strong>Foto de perfil</strong>
                      <p className="helper">
                        Envie uma imagem do seu celular para aparecer no sistema.
                      </p>
                    </div>
                  </div>
                  <label className="field full" htmlFor="profileName">
                    <span>Nome</span>
                    <input
                      id="profileName"
                      className="input"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Seu nome completo"
                    />
                  </label>
                  <label className="field full" htmlFor="profileEmail">
                    <span>E-mail</span>
                    <input
                      id="profileEmail"
                      className="input"
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      placeholder="seu@email.com"
                    />
                  </label>
                  <label className="field full" htmlFor="profilePhotoFile">
                    <span>Enviar foto</span>
                    <input
                      id="profilePhotoFile"
                      className="input"
                      type="file"
                      accept="image/*"
                      key={photoInputKey}
                      onChange={(event) =>
                        setPhotoFile(event.target.files?.[0] ?? null)
                      }
                    />
                  </label>
                </div>
                <div className="form-actions">
                  <p className="helper">Revise antes de salvar.</p>
                  <div className="form-buttons">
                    <button
                      type="submit"
                      className="button"
                      disabled={saving || !hasChanges}
                    >
                      {saving ? "Salvando..." : "Salvar perfil"}
                    </button>
                  </div>
                </div>
                {saveError && <p className="text-red-500">{saveError}</p>}
                {saveSuccess && <p className="text-green-600">{saveSuccess}</p>}
              </article>
            </form>

            <section className="report-panel">
              <div className="report-header">
                <div>
                  <h2 className="section-title">Meus cursos</h2>
                  <p>Total de cursos: {member.courses.length}</p>
                </div>
              </div>

              {member.courses.length > 0 ? (
                <div className="warning-list">
                  <article className="warning-card">
                    <div className="warning-header">
                      <div className="warning-meta">
                        <strong className="warning-name">Cursos inscritos</strong>
                        <span className="warning-count">
                          {member.courses.length} curso(s)
                        </span>
                      </div>
                    </div>
                    <ul className="warning-items">
                      {member.courses.map((course) => (
                        <li key={course.id} className="warning-item">
                          <span className="warning-date">
                            {formatDateBR(course.course_date)}
                          </span>
                          <span className="warning-desc">
                            {course.title} · {formatCourseStatus(course.status)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </article>
                </div>
              ) : (
                <div className="empty-state">
                  <p>Nenhum curso inscrito.</p>
                </div>
              )}
            </section>

            <section className="report-panel">
              <div className="report-header">
                <div>
                  <h2 className="section-title">Minhas advertências</h2>
                  <p>
                    Total de advertências: {member.warnings_total}
                  </p>
                </div>
              </div>

              {member.warnings.length > 0 ? (
                <div className="warning-list">
                  <article className="warning-card">
                    <div className="warning-header">
                      <div className="warning-meta">
                        <strong className="warning-name">Advertências</strong>
                        <span className="warning-count">
                          {member.warnings.length} advertência(s)
                        </span>
                      </div>
                    </div>
                    <ul className="warning-items">
                      {member.warnings.map((warning) => (
                        <li key={warning.id} className="warning-item">
                          <span className="warning-date">
                            {formatDateBR(warning.warning_date)}
                          </span>
                          <span className="warning-desc">{warning.reason}</span>
                        </li>
                      ))}
                    </ul>
                  </article>
                </div>
              ) : (
                <div className="empty-state">
                  <p>Nenhuma advertência registrada.</p>
                </div>
              )}
            </section>
          </>
        ) : (
          <div className="empty-state">
            <p>Perfil não encontrado.</p>
          </div>
        )}
      </section>
    </main>
  );
}
