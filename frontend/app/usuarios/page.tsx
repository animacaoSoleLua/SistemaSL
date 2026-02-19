"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createMember,
  deleteMember,
  getMember,
  getMembers,
  resolveApiAssetUrl,
  updateMember,
} from "../../lib/api";
import { getStoredUser, roleLabels, type Role, type StoredUser } from "../../lib/auth";

interface Member {
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
}

interface MemberFeedback {
  id: string;
  report_id: string;
  feedback: string;
  event_date: string;
  contractor_name: string;
}

interface MemberCourse {
  id: string;
  title: string;
  course_date: string;
  status: "enrolled" | "attended" | "missed";
}

interface MemberSuspension {
  status: "suspended" | "active";
  start_date: string | null;
  end_date: string | null;
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
  last_name?: string | null;
  cpf?: string | null;
  email: string;
  birth_date?: string | null;
  region?: string | null;
  phone?: string | null;
  role: Role;
  photo_url?: string | null;
  courses?: MemberCourse[];
  feedbacks?: MemberFeedback[];
  suspension?: MemberSuspension;
  warnings?: MemberWarning[];
}

export default function UsuariosPage() {
  const router = useRouter();
  const memberModalTitleId = useId();
  const memberModalDescriptionId = useId();
  const deleteModalTitleId = useId();
  const deleteModalDescriptionId = useId();
  const [currentUser, setCurrentUser] = useState<StoredUser | null>(null);
  const [users, setUsers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Member | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    last_name: "",
    cpf: "",
    email: "",
    birth_date: "",
    region: "",
    phone: "",
    role: "animador" as Role,
    password: "",
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [selectedMemberDetails, setSelectedMemberDetails] =
    useState<MemberDetails | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [cpfModalOpen, setCpfModalOpen] = useState(false);
  const [cpfSearchTerm, setCpfSearchTerm] = useState("");
  const [cpfSelectedMembers, setCpfSelectedMembers] = useState<Member[]>([]);
  const [cpfGenerating, setCpfGenerating] = useState(false);
  const [cpfActionError, setCpfActionError] = useState<string | null>(null);

  const isAdmin = currentUser?.role === "admin";

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
    if (digits.length <= 6) {
      return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    }
    if (digits.length <= 9) {
      return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    }
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  };

  const formatCpfDisplay = (value?: string | null) => {
    if (!value) return "CPF não informado";
    return formatCpf(value);
  };

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
    setFormData({
      name: "",
      last_name: "",
      cpf: "",
      email: "",
      birth_date: "",
      region: "",
      phone: "",
      role: "animador",
      password: "",
    });
    setEditingId(null);
    setActionError(null);
    setModalOpen(true);
  };

  const openEditModal = (member: Member) => {
    setModalMode("edit");
    setFormData({
      name: member.name,
      last_name: member.last_name ?? "",
      cpf: member.cpf ?? "",
      email: member.email,
      birth_date: member.birth_date ?? "",
      region: member.region ?? "",
      phone: member.phone ?? "",
      role: member.role,
      password: "",
    });
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
          last_name: formData.last_name.trim(),
          cpf: formData.cpf.trim(),
          email: formData.email.trim(),
          birth_date: formData.birth_date,
          region: formData.region.trim(),
          phone: formData.phone.trim(),
          role: formData.role,
          password: formData.password.trim(),
        });
      } else if (editingId) {
        await updateMember(editingId, {
          name: formData.name.trim(),
          last_name: formData.last_name.trim(),
          cpf: formData.cpf.trim() ? formData.cpf.trim() : undefined,
          email: formData.email.trim(),
          birth_date: formData.birth_date,
          region: formData.region.trim(),
          phone: formData.phone.trim(),
          role: formData.role,
        });
      }
      await loadMembers();
      setModalOpen(false);
    } catch (err: any) {
      setActionError(err.message || "Não foi possível salvar o membro.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (member: Member) => {
    if (currentUser?.id === member.id) {
      setActionError("Você não pode se excluir.");
      return;
    }
    setActionError(null);
    setDeleteTarget(member);
  };

  const closeDeleteModal = () => {
    if (deleting) return;
    setDeleteTarget(null);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setActionError(null);
    try {
      await deleteMember(deleteTarget.id);
      await loadMembers();
      if (selectedMemberId === deleteTarget.id) {
        setSelectedMemberId(null);
      }
      setDeleteTarget(null);
    } catch (err: any) {
      setActionError(err.message || "Não foi possível excluir o membro.");
    } finally {
      setDeleting(false);
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
        (user.last_name ?? "").toLowerCase().includes(search) ||
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

  const getDisplayName = (member: { name: string; last_name?: string | null }) =>
    member.last_name ? `${member.name} ${member.last_name}` : member.name;

  const getCourseStatusLabel = (status: MemberCourse["status"]) => {
    switch (status) {
      case "attended":
        return "Participou";
      case "missed":
        return "Faltou";
      default:
        return "Inscrito";
    }
  };

  const getCourseStatusClass = (status: MemberCourse["status"]) => {
    switch (status) {
      case "missed":
        return "inactive";
      case "attended":
        return "active";
      default:
        return "active";
    }
  };

  const renderAvatar = (name: string, photoUrl?: string | null) => {
    const resolvedPhotoUrl = resolveApiAssetUrl(photoUrl);
    if (resolvedPhotoUrl) {
      return (
        <img
          className="avatar-image"
          src={resolvedPhotoUrl}
          alt={`Foto de ${name}`}
          loading="lazy"
        />
      );
    }
    return getInitials(name);
  };

  const formatDateBR = (value: string) => {
    const [year, month, day] = value.split("-");
    if (!year || !month || !day) {
      return value;
    }
    return `${day}/${month}/${year}`;
  };

  const creatorNameById = useMemo(() => {
    return new Map(users.map((user) => [user.id, getDisplayName(user)]));
  }, [users]);

  const selectedMemberInfo = selectedMemberDetails ?? selectedMember;
  const warnings = selectedMemberDetails?.warnings ?? [];
  const courses = selectedMemberDetails?.courses ?? [];
  const feedbacks = selectedMemberDetails?.feedbacks ?? [];
  const suspension = selectedMemberDetails?.suspension;

  const cpfSelectedIds = useMemo(
    () => new Set(cpfSelectedMembers.map((member) => member.id)),
    [cpfSelectedMembers]
  );

  const cpfSearchResults = useMemo(() => {
    const search = cpfSearchTerm.trim().toLowerCase();
    if (!search) {
      return [];
    }
    return users.filter((member) => {
      return (
        member.name.toLowerCase().includes(search) ||
        (member.last_name ?? "").toLowerCase().includes(search) ||
        member.email.toLowerCase().includes(search)
      );
    });
  }, [cpfSearchTerm, users]);

  const openCpfModal = () => {
    setCpfSearchTerm("");
    setCpfActionError(null);
    setCpfModalOpen(true);
  };

  const closeCpfModal = () => {
    if (cpfGenerating) return;
    setCpfModalOpen(false);
    setCpfSearchTerm("");
    setCpfActionError(null);
    setCpfSelectedMembers([]);
  };

  const handleSelectCpfMember = (member: Member) => {
    if (cpfSelectedIds.has(member.id)) return;
    setCpfSelectedMembers((prev) => [...prev, member]);
  };

  const handleRemoveCpfMember = (memberId: string) => {
    setCpfSelectedMembers((prev) => prev.filter((member) => member.id !== memberId));
  };

  const escapePdfText = (value: string) =>
    value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

  const normalizePdfText = (value: string) => {
    return value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\x20-\x7E]/g, "?");
  };

  const buildPdfDocument = (lines: string[]) => {
    const sanitized = lines.map((line) =>
      escapePdfText(normalizePdfText(line.trim()))
    );
    const contentLines = sanitized.length ? sanitized : ["Listagem de CPF"];
    let content = "BT\n/F1 12 Tf\n72 720 Td\n";
    content += `(${contentLines[0]}) Tj\n`;

    for (const line of contentLines.slice(1)) {
      content += "0 -16 Td\n";
      content += `(${line}) Tj\n`;
    }

    content += "ET";
    const encoder = new TextEncoder();
    const contentLength = encoder.encode(content).length;
    const objects = [
      "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
      "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
      "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n",
      "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
      `5 0 obj\n<< /Length ${contentLength} >>\nstream\n${content}\nendstream\nendobj\n`,
    ];

    let pdf = "%PDF-1.4\n";
    const offsets: number[] = [0];

    for (const object of objects) {
      offsets.push(encoder.encode(pdf).length);
      pdf += object;
    }

    const xrefOffset = encoder.encode(pdf).length;
    pdf += "xref\n0 6\n";
    pdf += "0000000000 65535 f \n";
    for (const offset of offsets.slice(1)) {
      pdf += `${offset.toString().padStart(10, "0")} 00000 n \n`;
    }
    pdf += "trailer\n<< /Size 6 /Root 1 0 R >>\n";
    pdf += `startxref\n${xrefOffset}\n%%EOF\n`;

    return new Blob([encoder.encode(pdf)], { type: "application/pdf" });
  };

  const handleGenerateCpfPdf = async () => {
    if (cpfSelectedMembers.length === 0) {
      setCpfActionError("Selecione pelo menos um membro.");
      return;
    }
    setCpfGenerating(true);
    setCpfActionError(null);

    try {
      const enriched = await Promise.all(
        cpfSelectedMembers.map(async (member) => {
          if (member.cpf) return member;
          const response = await getMember(member.id);
          const details = response.data as MemberDetails;
          return {
            ...member,
            name: details.name,
            last_name: details.last_name ?? member.last_name ?? null,
            cpf: details.cpf ?? null,
          };
        })
      );

      const today = new Date().toISOString().slice(0, 10);
      const lines = [
        "Lista de CPF - Membros Sol e Lua",
        `Total de pessoas: ${enriched.length}`,
        "",
        ...enriched.map((member) => {
          const name = getDisplayName(member);
          return `${name} - ${formatCpfDisplay(member.cpf)}`;
        }),
      ];

      const pdfBlob = buildPdfDocument(lines);
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `listagem-cpf-${today}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setCpfActionError(err.message || "Não foi possível gerar o PDF.");
    } finally {
      setCpfGenerating(false);
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
            <div className="page-header-actions">
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
              <button
                className="button secondary"
                type="button"
                onClick={openCpfModal}
              >
                Listagem de CPF
              </button>
            </div>
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
              <div className="members-actions">
                <div className="members-search">
                  <input
                    className="input"
                    type="search"
                    placeholder="Buscar por nome ou e-mail..."
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    aria-label="Buscar membro"
                  />
                </div>
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
                        {renderAvatar(getDisplayName(user), user.photo_url)}
                      </div>
                      <div className="member-row-info">
                        <strong className="member-row-name">
                          {getDisplayName(user)}
                        </strong>
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
                            {currentUser?.id !== user.id && (
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
                            )}
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
                      {renderAvatar(
                        getDisplayName(selectedMemberInfo),
                        selectedMemberInfo.photo_url
                      )}
                    </div>
                    <div>
                      <strong className="member-name">
                        {getDisplayName(selectedMemberInfo)}
                      </strong>
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
                    {suspension && (
                      <div className="member-meta-item">
                        <span className="member-meta-label">Situação</span>
                        <span
                          className={`status-pill ${
                            suspension.status === "suspended" ? "inactive" : "active"
                          }`}
                        >
                          {suspension.status === "suspended"
                            ? "Suspenso"
                            : "Ativo"}
                        </span>
                      </div>
                    )}
                    {suspension?.start_date && (
                      <div className="member-meta-item">
                        <span className="member-meta-label">Início suspensão</span>
                        <span>{formatDateBR(suspension.start_date)}</span>
                      </div>
                    )}
                    {suspension?.end_date && (
                      <div className="member-meta-item">
                        <span className="member-meta-label">Fim suspensão</span>
                        <span>{formatDateBR(suspension.end_date)}</span>
                      </div>
                    )}
                    {selectedMemberInfo.birth_date && (
                      <div className="member-meta-item">
                        <span className="member-meta-label">Nascimento</span>
                        <span>{formatDateBR(selectedMemberInfo.birth_date)}</span>
                      </div>
                    )}
                    {selectedMemberInfo.region && (
                      <div className="member-meta-item">
                        <span className="member-meta-label">Região</span>
                        <span>{selectedMemberInfo.region}</span>
                      </div>
                    )}
                    {selectedMemberInfo.phone && (
                      <div className="member-meta-item">
                        <span className="member-meta-label">Telefone</span>
                        <span>{selectedMemberInfo.phone}</span>
                      </div>
                    )}
                  </div>
                )}

                {isAdmin && (
                  <>
                    <div className="member-section">
                      <div className="member-section-header">
                        <h3 className="section-title">Cursos</h3>
                        <span className="member-section-count">
                          {courses.length}
                        </span>
                      </div>
                      {detailsLoading ? (
                        <p className="member-section-empty">Carregando cursos...</p>
                      ) : detailsError ? (
                        <p className="member-section-error">{detailsError}</p>
                      ) : courses.length === 0 ? (
                        <p className="member-section-empty">Nenhum curso registrado.</p>
                      ) : (
                        <ul className="member-section-list">
                          {courses.map((course) => (
                            <li className="member-section-item" key={course.id}>
                              <div className="member-section-meta">
                                <strong className="member-section-title">
                                  {course.title}
                                </strong>
                                <span className="member-section-date">
                                  {formatDateBR(course.course_date)}
                                </span>
                              </div>
                              <span
                                className={`status-pill ${getCourseStatusClass(
                                  course.status
                                )}`}
                              >
                                {getCourseStatusLabel(course.status)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div className="member-section">
                      <div className="member-section-header">
                        <h3 className="section-title">Advertências</h3>
                        <span className="member-section-count">
                          {warnings.length}
                        </span>
                      </div>
                      {detailsLoading ? (
                        <p className="member-section-empty">
                          Carregando advertências...
                        </p>
                      ) : detailsError ? (
                        <p className="member-section-error">{detailsError}</p>
                      ) : warnings.length === 0 ? (
                        <p className="member-section-empty">
                          Nenhuma advertência registrada.
                        </p>
                      ) : (
                        <ul className="member-section-list">
                          {warnings.map((entry) => (
                            <li className="member-section-item" key={entry.id}>
                              <span className="member-section-date">
                                {formatDateBR(entry.warning_date)}
                              </span>
                              <strong className="member-section-title">
                                {creatorNameById.get(entry.created_by) ?? "Usuário"}
                              </strong>
                              <span className="member-section-text">
                                {entry.reason}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    {/* <div className="member-section">
                      <div className="member-section-header">
                        <h3 className="section-title">Feedbacks</h3>
                        <span className="member-section-count">
                          {feedbacks.length}
                        </span>
                      </div>
                      {detailsLoading ? (
                        <p className="member-section-empty">Carregando feedbacks...</p>
                      ) : detailsError ? (
                        <p className="member-section-error">{detailsError}</p>
                      ) : feedbacks.length === 0 ? (
                        <p className="member-section-empty">Nenhum feedback registrado.</p>
                      ) : (
                        <ul className="member-section-list">
                          {feedbacks.map((entry) => (
                            <li className="member-section-item" key={entry.id}>
                              <span className="member-section-date">
                                {formatDateBR(entry.event_date)}
                              </span>
                              <strong className="member-section-title">
                                {entry.contractor_name}
                              </strong>
                              <span className="member-section-text">
                                {entry.feedback}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div> */}
                  </>
                )}
              </div>
            )}
          </aside>
        </section>
      </section>

      {modalOpen && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby={memberModalTitleId}
          aria-describedby={memberModalDescriptionId}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.stopPropagation();
              closeModal();
            }
          }}
        >
          <div className="modal-card">
            <header className="modal-header">
              <div>
                <h2 className="section-title" id={memberModalTitleId}>
                  {modalMode === "create" ? "Novo membro" : "Editar membro"}
                </h2>
                <p id={memberModalDescriptionId}>
                  {modalMode === "create"
                    ? "Preencha os dados para criar um novo membro."
                    : "Atualize as informações do membro selecionado."}
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
                  Sobrenome
                  <input
                    className="input"
                    type="text"
                    value={formData.last_name}
                    onChange={(event) =>
                      handleInputChange("last_name", event.target.value)
                    }
                    required
                    disabled={saving}
                  />
                </label>
                <label className="field">
                  Data de nascimento
                  <input
                    className="input"
                    type="date"
                    value={formData.birth_date}
                    onChange={(event) =>
                      handleInputChange("birth_date", event.target.value)
                    }
                    required
                    disabled={saving}
                  />
                </label>
                <label className="field">
                  Cidade / Região
                  <input
                    className="input"
                    type="text"
                    value={formData.region}
                    onChange={(event) =>
                      handleInputChange("region", event.target.value)
                    }
                    required
                    disabled={saving}
                  />
                </label>
                <label className="field">
                  Telefone
                  <input
                    className="input"
                    type="tel"
                    placeholder="(61) 99999-9999"
                    inputMode="numeric"
                    value={formData.phone}
                    onChange={(event) =>
                      handleInputChange("phone", formatPhone(event.target.value))
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
                <label className="field">
                  CPF
                  <input
                    className="input"
                    type="text"
                    placeholder="000.000.000-00"
                    inputMode="numeric"
                    value={formData.cpf}
                    onChange={(event) =>
                      handleInputChange("cpf", formatCpf(event.target.value))
                    }
                    required={modalMode === "create"}
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

      {deleteTarget && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby={deleteModalTitleId}
          aria-describedby={deleteModalDescriptionId}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.stopPropagation();
              closeDeleteModal();
            }
          }}
        >
          <div className="modal-card confirm-modal">
            <header className="modal-header">
              <div>
                <h2 className="section-title" id={deleteModalTitleId}>
                  Confirmar exclusão
                </h2>
                <p id={deleteModalDescriptionId}>
                  Esta ação remove o membro e seus registros relacionados.
                </p>
              </div>
              <button
                className="icon-button"
                type="button"
                aria-label="Fechar"
                onClick={closeDeleteModal}
              >
                <svg viewBox="0 0 24 24">
                  <path d="M18 6L6 18" />
                  <path d="M6 6l12 12" />
                </svg>
              </button>
            </header>

            <div className="modal-body confirm-body">
              <div className="confirm-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M12 9v4" />
                  <path d="M12 17h.01" />
                  <path d="M10.3 3.3l-7 12.1a2 2 0 001.7 3h14a2 2 0 001.7-3l-7-12.1a2 2 0 00-3.4 0z" />
                </svg>
              </div>
              <div className="confirm-text">
                <p>
                  Tem certeza que deseja excluir{" "}
                  <strong>{getDisplayName(deleteTarget)}</strong>?
                </p>
                <p className="confirm-muted">
                  Essa ação não poderá ser desfeita.
                </p>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="button secondary"
                type="button"
                onClick={closeDeleteModal}
                disabled={deleting}
              >
                Cancelar
              </button>
              <button
                className="button danger"
                type="button"
                onClick={confirmDelete}
                disabled={deleting}
              >
                {deleting ? "Excluindo..." : "Excluir membro"}
              </button>
            </div>
          </div>
        </div>
      )}

      {cpfModalOpen && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cpf-modal-title"
          aria-describedby="cpf-modal-description"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.stopPropagation();
              closeCpfModal();
            }
          }}
        >
          <div className="modal-card cpf-modal">
            <header className="modal-header">
              <div>
                <h2 className="section-title" id="cpf-modal-title">
                  Listagem de CPF
                </h2>
                <p id="cpf-modal-description">
                  Busque, selecione e gere um PDF com nomes e CPFs.
                </p>
              </div>
              <button
                className="icon-button"
                type="button"
                aria-label="Fechar"
                onClick={closeCpfModal}
              >
                <svg viewBox="0 0 24 24">
                  <path d="M18 6L6 18" />
                  <path d="M6 6l12 12" />
                </svg>
              </button>
            </header>

            <div className="modal-body">
              <label className="field">
                Buscar membro
                <input
                  className="input"
                  type="search"
                  placeholder="Digite o nome ou e-mail..."
                  value={cpfSearchTerm}
                  onChange={(event) => setCpfSearchTerm(event.target.value)}
                />
              </label>

              {cpfSearchTerm.trim().length > 0 && (
                <div className="member-autocomplete" aria-label="Resultados da busca">
                  {cpfSearchResults.length === 0 ? (
                    <div className="member-autocomplete-empty">
                      Nenhum membro encontrado.
                    </div>
                  ) : (
                    cpfSearchResults.map((member) => {
                      const isSelected = cpfSelectedIds.has(member.id);
                      return (
                        <button
                          key={member.id}
                          type="button"
                          className={`member-autocomplete-item ${
                            isSelected ? "selected" : ""
                          }`}
                          aria-selected={isSelected}
                          onClick={() => handleSelectCpfMember(member)}
                        >
                          {getDisplayName(member)}
                        </button>
                      );
                    })
                  )}
                </div>
              )}

              <div className="cpf-selected">
                <div className="cpf-selected-header">
                  <h3 className="section-title">Selecionados</h3>
                  <span className="cpf-selected-count">
                    {cpfSelectedMembers.length}
                  </span>
                </div>
                {cpfSelectedMembers.length === 0 ? (
                  <p className="cpf-selected-empty">
                    Nenhum membro selecionado.
                  </p>
                ) : (
                  <div className="cpf-selected-list">
                    {cpfSelectedMembers.map((member) => (
                      <button
                        key={member.id}
                        type="button"
                        className="cpf-selected-item"
                        onClick={() => handleRemoveCpfMember(member.id)}
                      >
                        <span className="cpf-selected-name">
                          {getDisplayName(member)}
                        </span>
                        <span className="cpf-selected-remove">
                          Clique para remover
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {cpfActionError && (
                <p className="text-red-500">{cpfActionError}</p>
              )}
            </div>

            <div className="modal-footer">
              <button
                className="button secondary"
                type="button"
                onClick={closeCpfModal}
                disabled={cpfGenerating}
              >
                Fechar
              </button>
              <button
                className="button"
                type="button"
                onClick={handleGenerateCpfPdf}
                disabled={cpfGenerating || cpfSelectedMembers.length === 0}
              >
                {cpfGenerating ? "Gerando..." : "Gerar PDF"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
