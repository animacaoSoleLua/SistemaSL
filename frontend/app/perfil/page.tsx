"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getMember,
  resolveApiAssetUrl,
  updateMember,
  uploadMemberPhoto,
} from "../../lib/api";
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
  last_name?: string | null;
  cpf?: string | null;
  email: string;
  birth_date?: string | null;
  region?: string | null;
  phone?: string | null;
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
  const [editLastName, setEditLastName] = useState("");
  const [editCpf, setEditCpf] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editBirthDate, setEditBirthDate] = useState("");
  const [editRegion, setEditRegion] = useState("");
  const [editPhone, setEditPhone] = useState("");
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
      setEditLastName(member.last_name ?? "");
      setEditCpf(member.cpf ?? "");
      setEditEmail(member.email);
      setEditBirthDate(member.birth_date ?? "");
      setEditRegion(member.region ?? "");
      setEditPhone(formatPhone(member.phone ?? ""));
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

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);

    if (digits.length <= 2) return digits ? `(${digits}` : "";
    if (digits.length <= 6) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    }
    if (digits.length <= 10) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    }
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const formatCpf = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6)
      return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9)
      return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(
      6,
      9
    )}-${digits.slice(9)}`;
  };

  const formatCourseStatus = (status: "enrolled" | "attended" | "missed") => {
    if (status === "attended") return "Presente";
    if (status === "missed") return "Faltou";
    return "Inscrito";
  };

  const hasProfileChanges =
    member &&
    (editName.trim() !== member.name ||
      editLastName.trim() !== (member.last_name ?? "") ||
      editCpf.trim() !== (member.cpf ?? "") ||
      editEmail.trim() !== member.email ||
      editBirthDate !== (member.birth_date ?? "") ||
      editRegion.trim() !== (member.region ?? "") ||
      editPhone.trim() !== (member.phone ?? ""));
  const hasPhotoChange = !!photoFile;
  const hasChanges = !!hasProfileChanges || hasPhotoChange;

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!member) {
      return;
    }
    const trimmedName = editName.trim();
    const trimmedLastName = editLastName.trim();
    const trimmedCpf = editCpf.trim();
    const trimmedEmail = editEmail.trim();
    const trimmedRegion = editRegion.trim();
    const trimmedPhone = editPhone.trim();
    const birthDateValue = editBirthDate;

    if (
      !trimmedName ||
      !trimmedLastName ||
      !trimmedCpf ||
      !trimmedEmail ||
      !birthDateValue ||
      !trimmedRegion ||
      !trimmedPhone
    ) {
      setSaveError("Preencha todos os dados pessoais para salvar.");
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
          last_name: trimmedLastName,
          cpf: trimmedCpf,
          email: trimmedEmail,
          birth_date: birthDateValue,
          region: trimmedRegion,
          phone: trimmedPhone,
        });
        setMember((current) =>
          current
            ? {
                ...current,
                name: trimmedName,
                last_name: trimmedLastName,
                cpf: trimmedCpf,
                email: trimmedEmail,
                birth_date: birthDateValue,
                region: trimmedRegion,
                phone: trimmedPhone,
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
          window.dispatchEvent(new Event("user-updated"));
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
        const storedUser = getStoredUser();
        if (storedUser) {
          localStorage.setItem(
            "user",
            JSON.stringify({
              ...storedUser,
              photo_url: photoUrl,
            })
          );
          window.dispatchEvent(new Event("user-updated"));
        }
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

  const previewUrl = photoPreview ?? resolveApiAssetUrl(member?.photo_url);

  return (
    <main className="app-page">
      <section className="shell reveal">
        <header className="page-header">
          <div>
            <h1 className="hero-title">Meu Perfil</h1>
            <p className="hero-copy">Veja suas informações.</p>
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
            {member.suspension.status === "suspended" && (
              <div className="suspension-alert">
                <div className="suspension-alert-title">SUSPENSÃO ATIVA</div>
                <p className="suspension-alert-text">
                  Você está suspenso por 1 mês e não pode trabalhar.
                </p>
                {member.suspension.start_date && member.suspension.end_date && (
                  <p className="suspension-alert-text">
                    Período: {formatDateBR(member.suspension.start_date)} até{" "}
                    {formatDateBR(member.suspension.end_date)}.
                  </p>
                )}
              </div>
            )}
            <form className="form-layout" onSubmit={handleSave}>
              <article className="form-card">
                <div className="form-card-head">
                  <h2 className="section-title">Editar perfil</h2>
                  <p>Atualize seus dados pessoais para o sistema.</p>
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
                      </div>
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
                  <label className="field full" htmlFor="profileLastName">
                    <span>Sobrenome</span>
                    <input
                      id="profileLastName"
                      className="input"
                      value={editLastName}
                      onChange={(e) => setEditLastName(e.target.value)}
                      placeholder="Seu sobrenome"
                    />
                  </label>
                  <label className="field full" htmlFor="profileCpf">
                    <span>CPF</span>
                    <input
                      id="profileCpf"
                      name="cpf"
                      className="input"
                      inputMode="numeric"
                      autoComplete="national-id"
                      value={editCpf}
                      onChange={(e) => setEditCpf(formatCpf(e.target.value))}
                      placeholder="000.000.000-00"
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
                  <label className="field full" htmlFor="profileBirthDate">
                    <span>Data de nascimento</span>
                    <input
                      id="profileBirthDate"
                      className="input"
                      type="date"
                      value={editBirthDate}
                      onChange={(e) => setEditBirthDate(e.target.value)}
                    />
                  </label>
                  <label className="field full" htmlFor="profileRegion">
                    <span>Região administrativa</span>
                    <input
                      id="profileRegion"
                      className="input"
                      value={editRegion}
                      onChange={(e) => setEditRegion(e.target.value)}
                      placeholder="Ex: Ceilândia"
                    />
                  </label>
                  <label className="field full" htmlFor="profilePhone">
                    <span>Telefone</span>
                    <input
                      id="profilePhone"
                      name="tel"
                      className="input"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel-national"
                      value={editPhone}
                      onChange={(e) => setEditPhone(formatPhone(e.target.value))}
                      onInput={(e) =>
                        setEditPhone(
                          formatPhone((e.target as HTMLInputElement).value)
                        )
                      }
                      onBlur={(e) => setEditPhone(formatPhone(e.target.value))}
                      placeholder="(61) 99999-9999"
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
