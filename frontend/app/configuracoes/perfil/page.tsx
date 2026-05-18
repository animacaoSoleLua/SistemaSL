"use client";

import "./page.css";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  deleteMemberPhoto,
  getErrorMessage,
  getMember,
  resolveApiAssetUrl,
  updateMember,
  uploadMemberPhoto,
} from "../../../lib/api";
import { getStoredUser } from "../../../lib/auth";
import { displayToIso, formatDateInput, isoToDisplay } from "../../../lib/dateValidators";
import { useToast } from "../../context/ToastContext";

interface MemberDetail {
  id: string;
  name: string;
  last_name?: string | null;
  cpf?: string | null;
  birth_date?: string | null;
  region?: string | null;
  phone?: string | null;
  pix?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  photo_url?: string | null;
}

export default function ConfiguracoesPerfil() {
  const router = useRouter();
  const { showToast } = useToast();
  const [member, setMember] = useState<MemberDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editCpf, setEditCpf] = useState("");
  const [editBirthDate, setEditBirthDate] = useState("");
  const [editRegion, setEditRegion] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editPix, setEditPix] = useState("");
  const [editEmergencyContactName, setEditEmergencyContactName] = useState("");
  const [editEmergencyContactPhone, setEditEmergencyContactPhone] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoInputKey, setPhotoInputKey] = useState(0);
  const [removingPhoto, setRemovingPhoto] = useState(false);
  const [confirmRemovePhoto, setConfirmRemovePhoto] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const user = getStoredUser();
    if (!user) {
      router.push("/login");
      return;
    }
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await getMember(user.id);
        setMember(response.data as MemberDetail);
      } catch (err: unknown) {
        setError(getErrorMessage(err, "Erro ao carregar perfil."));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [router]);

  useEffect(() => {
    if (member) {
      setEditName(member.name);
      setEditLastName(member.last_name ?? "");
      setEditCpf(member.cpf ?? "");
      setEditBirthDate(member.birth_date ? isoToDisplay(member.birth_date) : "");
      setEditRegion(member.region ?? "");
      setEditPhone(formatPhone(member.phone ?? ""));
      setEditPix(member.pix ?? "");
      setEditEmergencyContactName(member.emergency_contact_name ?? "");
      setEditEmergencyContactPhone(formatPhone(member.emergency_contact_phone ?? ""));
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
    return () => URL.revokeObjectURL(url);
  }, [photoFile]);

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) return digits ? `(${digits}` : "";
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const formatCpf = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  };

  const hasProfileChanges =
    member &&
    (editName.trim() !== member.name ||
      editLastName.trim() !== (member.last_name ?? "") ||
      editCpf.trim() !== (member.cpf ?? "") ||
      editBirthDate !== (member.birth_date ? isoToDisplay(member.birth_date) : "") ||
      editRegion.trim() !== (member.region ?? "") ||
      editPhone.trim() !== (member.phone ?? "") ||
      editPix.trim() !== (member.pix ?? "") ||
      editEmergencyContactName.trim() !== (member.emergency_contact_name ?? "") ||
      editEmergencyContactPhone.trim() !== (member.emergency_contact_phone ?? ""));
  const hasChanges = !!hasProfileChanges || !!photoFile;

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!member) return;

    const trimmedName = editName.trim();
    const trimmedLastName = editLastName.trim();
    const trimmedCpf = editCpf.trim();
    const trimmedRegion = editRegion.trim();
    const trimmedPhone = editPhone.trim();

    if (!trimmedName || !trimmedLastName || !trimmedCpf || !editBirthDate || !trimmedRegion || !trimmedPhone) {
      showToast("Preencha todos os dados pessoais para salvar.", "error");
      return;
    }
    if (!hasChanges) {
      showToast("Nenhuma alteração para salvar.", "success");
      return;
    }

    setSaving(true);
    try {
      if (hasProfileChanges) {
        await updateMember(member.id, {
          name: trimmedName,
          last_name: trimmedLastName,
          cpf: trimmedCpf,
          birth_date: displayToIso(editBirthDate),
          region: trimmedRegion,
          phone: trimmedPhone,
          pix: editPix.trim() || null,
          emergency_contact_name: editEmergencyContactName.trim() || null,
          emergency_contact_phone: editEmergencyContactPhone.trim() || null,
        });
        setMember((cur) =>
          cur
            ? {
                ...cur,
                name: trimmedName,
                last_name: trimmedLastName,
                cpf: trimmedCpf,
                birth_date: displayToIso(editBirthDate),
                region: trimmedRegion,
                phone: trimmedPhone,
                pix: editPix.trim() || null,
                emergency_contact_name: editEmergencyContactName.trim() || null,
                emergency_contact_phone: editEmergencyContactPhone.trim() || null,
              }
            : cur
        );
        const storedUser = getStoredUser();
        if (storedUser) {
          sessionStorage.setItem("user", JSON.stringify({ ...storedUser, name: trimmedName }));
          window.dispatchEvent(new Event("user-updated"));
        }
      }
      if (photoFile) {
        const response = await uploadMemberPhoto(member.id, photoFile);
        const photoUrl = response?.data?.photo_url ?? null;
        setMember((cur) => (cur ? { ...cur, photo_url: photoUrl } : cur));
        const storedUser = getStoredUser();
        if (storedUser) {
          sessionStorage.setItem("user", JSON.stringify({ ...storedUser, photo_url: photoUrl }));
          window.dispatchEvent(new Event("user-updated"));
        }
        setPhotoFile(null);
        setPhotoInputKey((prev) => prev + 1);
      }
      showToast(
        hasProfileChanges && photoFile
          ? "Dados e foto atualizados com sucesso."
          : photoFile
          ? "Foto atualizada com sucesso."
          : "Dados atualizados com sucesso.",
        "success"
      );
    } catch (err: unknown) {
      showToast(getErrorMessage(err, "Erro ao salvar perfil."), "error");
    } finally {
      setSaving(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (!member || removingPhoto) return;
    setRemovingPhoto(true);
    setSaveError(null);
    setSaveSuccess(null);
    try {
      await deleteMemberPhoto(member.id);
      setMember((cur) => (cur ? { ...cur, photo_url: null } : cur));
      setPhotoFile(null);
      setPhotoInputKey((prev) => prev + 1);
      const storedUser = getStoredUser();
      if (storedUser) {
        sessionStorage.setItem("user", JSON.stringify({ ...storedUser, photo_url: null }));
        window.dispatchEvent(new Event("user-updated"));
      }
      setSaveSuccess("Foto removida com sucesso.");
    } catch (err: unknown) {
      setSaveError(getErrorMessage(err, "Erro ao remover foto."));
    } finally {
      setRemovingPhoto(false);
    }
  };

  const previewUrl = photoPreview ?? resolveApiAssetUrl(member?.photo_url);

  if (loading) return <div className="empty-state"><p>Carregando...</p></div>;
  if (error) return <div className="empty-state"><p className="text-red-500">{error}</p></div>;
  if (!member) return <div className="empty-state"><p>Perfil não encontrado.</p></div>;

  return (
    <form className="form-layout" onSubmit={handleSave}>
      <article className="form-card">
        <div className="form-card-head">
          <h2 className="section-title">Dados pessoais</h2>
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
              <label className="profile-photo-upload" htmlFor="profilePhotoFile">
                <span>Adicionar foto</span>
                <input
                  id="profilePhotoFile"
                  className="profile-photo-input"
                  type="file"
                  accept="image/*"
                  key={photoInputKey}
                  onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
                />
              </label>
              {(member.photo_url || photoFile) &&
                (confirmRemovePhoto ? (
                  <div className="profile-photo-confirm">
                    <span className="profile-photo-confirm-text">Remover a foto?</span>
                    <button
                      type="button"
                      className="profile-photo-confirm-yes"
                      onClick={() => {
                        setConfirmRemovePhoto(false);
                        const hasPersistedPhoto = Boolean(member.photo_url);
                        if (photoFile) {
                          setPhotoFile(null);
                          setPhotoInputKey((prev) => prev + 1);
                        }
                        if (hasPersistedPhoto) handleRemovePhoto();
                      }}
                      disabled={removingPhoto}
                    >
                      {removingPhoto ? "Removendo..." : "Confirmar"}
                    </button>
                    <button
                      type="button"
                      className="profile-photo-confirm-no"
                      onClick={() => setConfirmRemovePhoto(false)}
                      disabled={removingPhoto}
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="profile-photo-remove"
                    onClick={() => setConfirmRemovePhoto(true)}
                    disabled={removingPhoto}
                  >
                    Remover foto
                  </button>
                ))}
            </div>
          </div>

          <label className="field" htmlFor="profileName">
            <span>Nome</span>
            <input id="profileName" className="input" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Seu nome" />
          </label>
          <label className="field" htmlFor="profileLastName">
            <span>Sobrenome</span>
            <input id="profileLastName" className="input" value={editLastName} onChange={(e) => setEditLastName(e.target.value)} placeholder="Seu sobrenome" />
          </label>
          <label className="field" htmlFor="profileCpf">
            <span>CPF</span>
            <input id="profileCpf" name="cpf" className="input" inputMode="numeric" autoComplete="national-id" value={editCpf} onChange={(e) => setEditCpf(formatCpf(e.target.value))} placeholder="000.000.000-00" />
          </label>
          <label className="field" htmlFor="profileBirthDate">
            <span>Data de nascimento</span>
            <input id="profileBirthDate" className="input" type="text" inputMode="numeric" maxLength={10} placeholder="DD/MM/AAAA" value={editBirthDate} onChange={(e) => setEditBirthDate(formatDateInput(e.target.value))} />
          </label>
          <label className="field" htmlFor="profileRegion">
            <span>Região administrativa</span>
            <input id="profileRegion" className="input" value={editRegion} onChange={(e) => setEditRegion(e.target.value)} placeholder="Ex: Ceilândia" />
          </label>
          <label className="field" htmlFor="profilePhone">
            <span>Telefone</span>
            <input id="profilePhone" name="tel" className="input" type="tel" inputMode="tel" autoComplete="tel-national" value={editPhone} onChange={(e) => setEditPhone(formatPhone(e.target.value))} onBlur={(e) => setEditPhone(formatPhone(e.target.value))} placeholder="(61) 99999-9999" />
          </label>
          <label className="field full" htmlFor="profilePix">
            <span>Chave Pix</span>
            <input id="profilePix" className="input" value={editPix} onChange={(e) => setEditPix(e.target.value)} placeholder="CPF, e-mail, celular ou chave aleatória" />
          </label>
          <label className="field" htmlFor="profileEmergencyContactName">
            <span>Contato de emergência — quem é</span>
            <input id="profileEmergencyContactName" className="input" value={editEmergencyContactName} onChange={(e) => setEditEmergencyContactName(e.target.value)} placeholder="Ex: Mãe, Pai, Cônjuge..." />
          </label>
          <label className="field" htmlFor="profileEmergencyContactPhone">
            <span>Contato de emergência — telefone</span>
            <input id="profileEmergencyContactPhone" className="input" type="tel" inputMode="tel" value={editEmergencyContactPhone} onChange={(e) => setEditEmergencyContactPhone(formatPhone(e.target.value))} onBlur={(e) => setEditEmergencyContactPhone(formatPhone(e.target.value))} placeholder="(61) 99999-9999" />
          </label>
        </div>
        <div className="form-actions">
          <p className="helper">Revise antes de salvar.</p>
          <div className="form-buttons">
            <button type="submit" className="button" disabled={saving || !hasChanges}>
              {saving ? (
                <>
                  <span className="btn-spinner" aria-hidden="true" />
                  Salvando...
                </>
              ) : (
                "Salvar perfil"
              )}
            </button>
          </div>
        </div>
      </article>
    </form>
  );
}
