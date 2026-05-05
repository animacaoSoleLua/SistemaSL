"use client";

import './page.css';
import { useEffect, useId, useMemo, useReducer, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  FiAlertTriangle,
  FiEdit2,
  FiInfo,
  FiShield,
  FiStar,
  FiTrash2,
  FiUserPlus,
  FiUsers,
  FiX,
} from "react-icons/fi";
import {
  createMember,
  deleteMember,
  getErrorMessage,
  getFeedbacks,
  getMember,
  getMembers,
  resolveApiAssetUrl,
  updateMember,
} from "../../lib/api";
import { getStoredUser, roleLabels, type Role, type StoredUser } from "../../lib/auth";
import { useFocusTrap } from "../../lib/useFocusTrap";
import { isStrongPassword, isValidCPF, normalizeString } from "../../lib/validators";
import { displayToIso, formatDateInput, isoToDisplay } from "../../lib/dateValidators";

interface MemberFormState {
  name: string;
  last_name: string;
  cpf: string;
  email: string;
  birth_date: string;
  region: string;
  phone: string;
  role: Role;
  password: string;
}

type MemberFormAction =
  | { type: "SET_FIELD"; field: keyof MemberFormState; value: string }
  | { type: "RESET" }
  | { type: "LOAD"; payload: MemberFormState };

const memberFormInitial: MemberFormState = {
  name: "",
  last_name: "",
  cpf: "",
  email: "",
  birth_date: "",
  region: "",
  phone: "",
  role: "animador",
  password: "",
};

function memberFormReducer(
  state: MemberFormState,
  action: MemberFormAction
): MemberFormState {
  switch (action.type) {
    case "SET_FIELD":
      return { ...state, [action.field]: action.value } as MemberFormState;
    case "RESET":
      return memberFormInitial;
    case "LOAD":
      return action.payload;
    default:
      return state;
  }
}

interface Member {
  id: string;
  name: string;
  last_name?: string | null;
  cpf?: string | null;
  email: string;
  birth_date?: string | null;
  region?: string | null;
  phone?: string | null;
  pix?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  role: Role;
  photo_url?: string | null;
}

interface MemberFeedback {
  id: string;
  report_id: string;
  feedback: string;
  event_date: string;
  contractor_name: string;
  author_name: string;
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
  pix?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  role: Role;
  photo_url?: string | null;
  courses?: MemberCourse[];
  feedbacks?: MemberFeedback[];
  suspension?: MemberSuspension;
  warnings?: MemberWarning[];
  skills?: { skill_id: string; name: string; description?: string | null; rating: number }[];
}

export default function UsuariosPage() {
  const router = useRouter();
  const memberModalTitleId = useId();
  const memberModalDescriptionId = useId();
  const deleteModalTitleId = useId();
  const deleteModalDescriptionId = useId();
  const detailsModalTitleId = useId();
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
  const [formData, dispatchForm] = useReducer(memberFormReducer, memberFormInitial);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [selectedMemberDetails, setSelectedMemberDetails] =
    useState<MemberDetails | null>(null);
  const [feedbackCounts, setFeedbackCounts] = useState<{ positive: number; negative: number } | null>(null);
  const [feedbackCountsLoading, setFeedbackCountsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "all">("all");
  const [cpfModalOpen, setCpfModalOpen] = useState(false);
  const [cpfSearchTerm, setCpfSearchTerm] = useState("");
  const [cpfSelectedMembers, setCpfSelectedMembers] = useState<Member[]>([]);
  const [cpfGenerating, setCpfGenerating] = useState(false);
  const [cpfActionError, setCpfActionError] = useState<string | null>(null);
  const [photoLightbox, setPhotoLightbox] = useState<{ url: string; name: string } | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [detailsTab, setDetailsTab] = useState<"dados" | "cursos" | "advertencias" | "clientes" | "feedbacks" | "habilidades">("dados");
  const memberModalTrapRef = useFocusTrap(modalOpen);
  const deleteTrapRef = useFocusTrap(!!deleteTarget);
  const cpfTrapRef = useFocusTrap(cpfModalOpen);
  const detailsTrapRef = useFocusTrap(detailsModalOpen);
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

  const getPhoneDigits = (value?: string | null) => value?.replace(/\D/g, "") ?? "";

  const getBrazilPhoneForLink = (value?: string | null) => {
    const digits = getPhoneDigits(value);

    if (digits.length === 10 || digits.length === 11) {
      return `55${digits}`;
    }

    if (digits.length === 12 || digits.length === 13) {
      return digits;
    }

    return "";
  };

  const getTelHref = (value?: string | null) => {
    const digits = getBrazilPhoneForLink(value);
    return digits ? `tel:+${digits}` : null;
  };

  const getWhatsAppHref = (value?: string | null) => {
    const digits = getBrazilPhoneForLink(value);
    return digits ? `https://wa.me/${digits}` : null;
  };

  const loadMembers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getMembers({ limit: 1000 });
      setUsers(response.data as Member[]);
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Erro ao carregar membros."));
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
    dispatchForm({ type: "RESET" });
    setEditingId(null);
    setActionError(null);
    setModalOpen(true);
  };

  const openEditModal = (member: Member) => {
    setModalMode("edit");
    dispatchForm({
      type: "LOAD",
      payload: {
        name: member.name,
        last_name: member.last_name ?? "",
        cpf: member.cpf ? formatCpf(member.cpf) : "",
        email: member.email,
        birth_date: member.birth_date ? isoToDisplay(member.birth_date) : "",
        region: member.region ?? "",
        phone: member.phone ?? "",
        role: member.role,
        password: "",
      },
    });
    setEditingId(member.id);
    setActionError(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
  };

  const closeDetailsModal = () => {
    setDetailsModalOpen(false);
  };

  const handleInputChange = (field: keyof MemberFormState, value: string) => {
    dispatchForm({ type: "SET_FIELD", field, value });
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setActionError(null);

    if (!isValidCPF(formData.cpf)) {
      setActionError("CPF inválido.");
      return;
    }

    if (modalMode === "create") {
      const pwdError = isStrongPassword(formData.password);
      if (pwdError) {
        setActionError(pwdError);
        return;
      }
    }

    setSaving(true);

    try {
      if (modalMode === "create") {
        await createMember({
          name: formData.name.trim(),
          last_name: formData.last_name.trim(),
          cpf: formData.cpf.trim(),
          email: formData.email.trim(),
          birth_date: displayToIso(formData.birth_date),
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
          birth_date: displayToIso(formData.birth_date),
          region: formData.region.trim(),
          phone: formData.phone.trim(),
          role: formData.role,
        });
      }
      await loadMembers();
      setModalOpen(false);
    } catch (err: unknown) {
      setActionError(getErrorMessage(err, "Não foi possível salvar o membro."));
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
        setDetailsModalOpen(false);
      }
      setDeleteTarget(null);
    } catch (err: unknown) {
      setActionError(getErrorMessage(err, "Não foi possível excluir o membro."));
    } finally {
      setDeleting(false);
    }
  };

  const filteredUsers = useMemo(() => {
    let result = users;

    // Filter by role
    if (roleFilter !== "all") {
      result = result.filter((user) => user.role === roleFilter);
    }

    // Filter by search term
    const search = normalizeString(searchTerm.trim());
    if (search) {
      result = result.filter(
        (user) =>
          normalizeString(user.name).includes(search) ||
          normalizeString(user.last_name ?? "").includes(search) ||
          normalizeString(user.email).includes(search)
      );
    }

    return result;
  }, [users, searchTerm, roleFilter]);

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

  useEffect(() => {
    if (!isAdmin || !selectedMemberId) {
      setFeedbackCounts(null);
      return;
    }

    let cancelled = false;
    setFeedbackCountsLoading(true);

    Promise.all([
      getFeedbacks({ member_id: selectedMemberId, type: "positive", limit: 1 }),
      getFeedbacks({ member_id: selectedMemberId, type: "negative", limit: 1 }),
    ])
      .then(([pos, neg]) => {
        if (cancelled) return;
        setFeedbackCounts({ positive: pos.total ?? 0, negative: neg.total ?? 0 });
      })
      .catch(() => {
        if (cancelled) return;
        setFeedbackCounts({ positive: 0, negative: 0 });
      })
      .finally(() => {
        if (cancelled) return;
        setFeedbackCountsLoading(false);
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
        <Image
          className="avatar-image"
          src={resolvedPhotoUrl}
          alt={`Foto de ${name}`}
          width={54}
          height={54}
          style={{ width: '100%', height: '100%' }}
          unoptimized
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
  const emergencyTelHref = getTelHref(selectedMemberInfo?.emergency_contact_phone);
  const emergencyWhatsAppHref = getWhatsAppHref(selectedMemberInfo?.emergency_contact_phone);
  const warnings = selectedMemberDetails?.warnings ?? [];
  const courses = selectedMemberDetails?.courses ?? [];
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
    } catch (err: unknown) {
      setCpfActionError(getErrorMessage(err, "Não foi possível gerar o PDF."));
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
                  <FiUserPlus />
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
            <span className="summary-label">Total de Membros</span>
            <strong className="summary-value">{totalUsers}</strong>
          </article>

          <article className="summary-card">
            <span className="summary-label">Administradores</span>
            <strong className="summary-value">{totalAdmins}</strong>
          </article>

          <article className="summary-card">
            <span className="summary-label">Animadores</span>
            <strong className="summary-value">{totalAnimadores}</strong>
          </article>

          <article className="summary-card">
            <span className="summary-label">Recreadores</span>
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
                <div className="members-filters">
                  <button
                    className={`filter-btn ${roleFilter === "all" ? "active" : ""}`}
                    onClick={() => setRoleFilter("all")}
                    aria-pressed={roleFilter === "all"}
                  >
                    Todos
                  </button>
                  <button
                    className={`filter-btn ${roleFilter === "animador" ? "active" : ""}`}
                    onClick={() => setRoleFilter("animador")}
                    aria-pressed={roleFilter === "animador"}
                  >
                    Animadores
                  </button>
                  <button
                    className={`filter-btn ${roleFilter === "recreador" ? "active" : ""}`}
                    onClick={() => setRoleFilter("recreador")}
                    aria-pressed={roleFilter === "recreador"}
                  >
                    Recreadores
                  </button>
                  <button
                    className={`filter-btn ${roleFilter === "admin" ? "active" : ""}`}
                    onClick={() => setRoleFilter("admin")}
                    aria-pressed={roleFilter === "admin"}
                  >
                    Admin
                  </button>
                </div>
              </div>
            </div>

            <p className="sr-only" aria-live="polite" aria-atomic="true">
              {loading ? "Carregando membros..." : ""}
            </p>
            {loading ? (
              <div className="members-list" aria-hidden="true">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="member-row">
                    <div className="member-info">
                      <div className="member-avatar skeleton" />
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <div className="skeleton" style={{ width: 140, height: 16 }} />
                        <div className="skeleton" style={{ width: 100, height: 13 }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="empty-state">
                <p className="text-red-500" role="alert" aria-live="polite">Erro ao carregar membros: {error}</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="empty-state">
                <p>Nenhum membro encontrado.</p>
              </div>
            ) : (
              <ul className="members-list" role="list">
                {filteredUsers.map((user) => {
                  const isSelected = selectedMemberId === user.id;
                  return (
                    <li
                      className={`member-row ${isAdmin ? "admin" : "read-only"} ${
                        isSelected ? "selected" : ""
                      }`}
                      key={user.id}
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
                        <div className="member-row-actions">
                          <button
                            className="icon-button"
                            type="button"
                            aria-label="Ver detalhes do membro"
                            onClick={(event) => {
                              event.stopPropagation();
                              setSelectedMemberId(user.id);
                              setDetailsTab("dados");
                              setDetailsModalOpen(true);
                            }}
                          >
                            <FiInfo aria-hidden="true" />
                          </button>
                          {isAdmin && (
                            <>
                              <button
                                className="icon-button"
                                type="button"
                                aria-label="Editar membro"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  openEditModal(user);
                                }}
                              >
                                <FiEdit2 aria-hidden="true" />
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
                                  <FiTrash2 aria-hidden="true" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                        </div>
                    </li>
                  );
                })}
              </ul>
            )}

            {actionError && (
              <div className="empty-state">
                <p className="text-red-500" role="alert" aria-live="polite">{actionError}</p>
              </div>
            )}
          </div>

        </section>
      </section>

      {detailsModalOpen && selectedMemberInfo && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby={detailsModalTitleId}
          onClick={(event) => {
            if (event.target === event.currentTarget) closeDetailsModal();
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.stopPropagation();
              closeDetailsModal();
            }
          }}
        >
          <div className="modal-card modal-lg details-modal" ref={detailsTrapRef}>
            <header className="modal-header">
              <div className="member-identity">
                <div
                  className={`member-avatar${resolveApiAssetUrl(selectedMemberInfo.photo_url) ? " member-avatar-clickable" : ""}`}
                  aria-hidden={!resolveApiAssetUrl(selectedMemberInfo.photo_url)}
                  role={resolveApiAssetUrl(selectedMemberInfo.photo_url) ? "button" : undefined}
                  tabIndex={resolveApiAssetUrl(selectedMemberInfo.photo_url) ? 0 : undefined}
                  aria-label={resolveApiAssetUrl(selectedMemberInfo.photo_url) ? `Ver foto de ${getDisplayName(selectedMemberInfo)}` : undefined}
                  onClick={() => {
                    const url = resolveApiAssetUrl(selectedMemberInfo.photo_url);
                    if (url) setPhotoLightbox({ url, name: getDisplayName(selectedMemberInfo) });
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      const url = resolveApiAssetUrl(selectedMemberInfo.photo_url);
                      if (url) setPhotoLightbox({ url, name: getDisplayName(selectedMemberInfo) });
                    }
                  }}
                >
                  {renderAvatar(getDisplayName(selectedMemberInfo), selectedMemberInfo.photo_url)}
                </div>
                <div>
                  <h2 className="section-title" id={detailsModalTitleId}>
                    {getDisplayName(selectedMemberInfo)}
                  </h2>
                  <span className="member-email">{selectedMemberInfo.email}</span>
                </div>
              </div>
              <button
                className="icon-button"
                type="button"
                aria-label="Fechar detalhes do membro"
                onClick={closeDetailsModal}
              >
                <FiX aria-hidden="true" />
              </button>
            </header>

            {isAdmin && (
              <div className="details-tabs" role="tablist">
                {(["dados", "feedbacks", "clientes", "cursos", "advertencias", "habilidades"] as const).map((tab) => {
                  const labels = { dados: "Dados", feedbacks: "Feedbacks", clientes: "Clientes", cursos: "Cursos", advertencias: "Advertências", habilidades: "Habilidades" };
                  const counts: Record<string, number | null> = {
                    dados: null,
                    feedbacks: detailsLoading ? null : (selectedMemberDetails?.feedbacks?.length ?? 0),
                    clientes: feedbackCounts ? feedbackCounts.positive + feedbackCounts.negative : null,
                    cursos: detailsLoading ? null : courses.length,
                    advertencias: detailsLoading ? null : warnings.length,
                    habilidades: detailsLoading ? null : (selectedMemberDetails?.skills?.length ?? 0),
                  };
                  return (
                    <button
                      key={tab}
                      role="tab"
                      aria-selected={detailsTab === tab}
                      className={`details-tab-btn${detailsTab === tab ? " active" : ""}`}
                      onClick={() => setDetailsTab(tab)}
                      type="button"
                    >
                      {labels[tab]}
                      {counts[tab] !== null && (
                        <span className="details-tab-count">{counts[tab]}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="modal-body details-modal-body">
              {(!isAdmin || detailsTab === "dados") && (
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
                      <span className={`status-pill ${suspension.status === "suspended" ? "inactive" : "active"}`}>
                        {suspension.status === "suspended" ? "Suspenso" : "Ativo"}
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
                  {selectedMemberInfo.pix && (
                    <div className="member-meta-item">
                      <span className="member-meta-label">Pix</span>
                      <span>{selectedMemberInfo.pix}</span>
                    </div>
                  )}
                  {(selectedMemberInfo.emergency_contact_name || selectedMemberInfo.emergency_contact_phone) && (
                    <div className="member-meta-item member-meta-item-emergency">
                      <span className="member-meta-label">Contato de emergência</span>
                      <div className="member-meta-emergency">
                        <span>
                          {[selectedMemberInfo.emergency_contact_name, selectedMemberInfo.emergency_contact_phone]
                            .filter(Boolean)
                            .join(" — ")}
                        </span>
                        {selectedMemberInfo.emergency_contact_phone && (
                          <div className="member-meta-actions">
                            {emergencyTelHref && (
                              <a
                                className="member-meta-link"
                                href={emergencyTelHref}
                              >
                                Ligar
                              </a>
                            )}
                            {emergencyWhatsAppHref && (
                              <a
                                className="member-meta-link"
                                href={emergencyWhatsAppHref}
                                target="_blank"
                                rel="noreferrer"
                              >
                                WhatsApp
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {isAdmin && detailsTab === "clientes" && (
                <div className="member-section">
                  <div className="member-section-header">
                    <h3 className="section-title">Feedbacks</h3>
                    <span className="member-section-count">
                      {feedbackCounts ? feedbackCounts.positive + feedbackCounts.negative : 0}
                    </span>
                  </div>
                  {feedbackCountsLoading ? (
                    <p className="member-section-empty">Carregando feedbacks...</p>
                  ) : (
                    <div className="feedback-counts">
                      <div className="feedback-count-item positive">
                        <span className="feedback-count-value">{feedbackCounts?.positive ?? 0}</span>
                        <span className="feedback-count-label">Positivos</span>
                      </div>
                      <div className="feedback-count-item negative">
                        <span className="feedback-count-value">{feedbackCounts?.negative ?? 0}</span>
                        <span className="feedback-count-label">Negativos</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {isAdmin && detailsTab === "feedbacks" && (
                <div className="member-section">
                  <div className="member-section-header">
                    <h3 className="section-title">Feedbacks</h3>
                    <span className="member-section-count">
                      {selectedMemberDetails?.feedbacks?.length ?? 0}
                    </span>
                  </div>
                  {detailsLoading ? (
                    <p className="member-section-empty">Carregando feedbacks...</p>
                  ) : detailsError ? (
                    <p className="member-section-error">{detailsError}</p>
                  ) : !selectedMemberDetails?.feedbacks?.length ? (
                    <p className="member-section-empty">Nenhum feedback individual registrado.</p>
                  ) : (
                    <ul className="member-section-list">
                      {selectedMemberDetails.feedbacks.map((entry) => (
                        <li className="member-section-item" key={entry.id}>
                          <div className="member-section-meta">
                            <strong className="member-section-title">{entry.author_name}</strong>
                            <span className="member-section-date">{formatDateBR(entry.event_date)}</span>
                          </div>
                          <p className="member-section-subtitle">{entry.feedback}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {isAdmin && detailsTab === "cursos" && (
                <div className="member-section">
                  <div className="member-section-header">
                    <h3 className="section-title">Cursos</h3>
                    <span className="member-section-count">{courses.length}</span>
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
                            <strong className="member-section-title">{course.title}</strong>
                            <span className="member-section-date">{formatDateBR(course.course_date)}</span>
                          </div>
                          <span className={`status-pill ${getCourseStatusClass(course.status)}`}>
                            {getCourseStatusLabel(course.status)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {isAdmin && detailsTab === "advertencias" && (
                <div className="member-section">
                  <div className="member-section-header">
                    <h3 className="section-title">Advertências</h3>
                    <span className="member-section-count">{warnings.length}</span>
                  </div>
                  {detailsLoading ? (
                    <p className="member-section-empty">Carregando advertências...</p>
                  ) : detailsError ? (
                    <p className="member-section-error">{detailsError}</p>
                  ) : warnings.length === 0 ? (
                    <p className="member-section-empty">Nenhuma advertência registrada.</p>
                  ) : (
                    <ul className="member-section-list">
                      {warnings.map((entry) => (
                        <li className="member-section-item" key={entry.id}>
                          <span className="member-section-date">{formatDateBR(entry.warning_date)}</span>
                          <strong className="member-section-title">
                            {creatorNameById.get(entry.created_by) ?? "Usuário"}
                          </strong>
                          <span className="member-section-text">{entry.reason}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {isAdmin && detailsTab === "habilidades" && (
                <div className="details-tab-content">
                  {!selectedMemberDetails?.skills || selectedMemberDetails.skills.length === 0 ? (
                    <p className="details-empty">Nenhuma habilidade registrada para este membro.</p>
                  ) : (
                    <div className="skills-section">
                      <ul className="skills-list">
                        {selectedMemberDetails.skills.map((s) => (
                          <li key={s.skill_id} className="skill-card">
                            <div className="skill-card-header">
                              <span className="skill-name">{s.name}</span>
                              <span className="skill-rating">{s.rating}<span className="skill-rating-max">/10</span></span>
                            </div>
                            <div className="skill-bar-track">
                              <div className="skill-bar-fill" style={{ width: `${s.rating * 10}%` }} />
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
          <div className="modal-card" ref={memberModalTrapRef}>
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
                aria-label="Fechar modal de membro"
                onClick={closeModal}
              >
                <FiX aria-hidden="true" />
              </button>
            </header>

            <form className="modal-body" onSubmit={handleSave}>
              <div className="form-grid">
                <label className="field" htmlFor="member-name">
                  Nome
                  <input
                    id="member-name"
                    className="input"
                    type="text"
                    value={formData.name}
                    onChange={(event) =>
                      handleInputChange("name", event.target.value)
                    }
                    required
                    aria-required="true"
                    disabled={saving}
                  />
                </label>
                <label className="field" htmlFor="member-last-name">
                  Sobrenome
                  <input
                    id="member-last-name"
                    className="input"
                    type="text"
                    value={formData.last_name}
                    onChange={(event) =>
                      handleInputChange("last_name", event.target.value)
                    }
                    required
                    aria-required="true"
                    disabled={saving}
                  />
                </label>
                <label className="field" htmlFor="member-birth-date">
                  Data de nascimento
                  <input
                    id="member-birth-date"
                    className="input"
                    type="text"
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="DD/MM/AAAA"
                    value={formData.birth_date}
                    onChange={(event) =>
                      handleInputChange("birth_date", formatDateInput(event.target.value))
                    }
                    required
                    aria-required="true"
                    disabled={saving}
                  />
                </label>
                <label className="field" htmlFor="member-region">
                  Cidade / Região
                  <input
                    id="member-region"
                    className="input"
                    type="text"
                    value={formData.region}
                    onChange={(event) =>
                      handleInputChange("region", event.target.value)
                    }
                    required
                    aria-required="true"
                    disabled={saving}
                  />
                </label>
                <label className="field" htmlFor="member-phone">
                  Telefone
                  <input
                    id="member-phone"
                    className="input"
                    type="tel"
                    placeholder="(61) 99999-9999"
                    inputMode="numeric"
                    value={formData.phone}
                    onChange={(event) =>
                      handleInputChange("phone", formatPhone(event.target.value))
                    }
                    required
                    aria-required="true"
                    disabled={saving}
                  />
                </label>
                <label className="field" htmlFor="member-email">
                  E-mail
                  <input
                    id="member-email"
                    className="input"
                    type="email"
                    value={formData.email}
                    onChange={(event) =>
                      handleInputChange("email", event.target.value)
                    }
                    required
                    aria-required="true"
                    disabled={saving}
                  />
                </label>
                <label className="field" htmlFor="member-cpf">
                  CPF
                  <input
                    id="member-cpf"
                    className="input"
                    type="text"
                    placeholder="000.000.000-00"
                    inputMode="numeric"
                    value={formData.cpf}
                    onChange={(event) =>
                      handleInputChange("cpf", formatCpf(event.target.value))
                    }
                    required={modalMode === "create"}
                    aria-required={modalMode === "create"}
                    disabled={saving}
                  />
                </label>
                {modalMode === "create" && (
                  <label className="field full" htmlFor="member-password">
                    Senha
                    <input
                      id="member-password"
                      className="input"
                      type="password"
                      value={formData.password}
                      onChange={(event) =>
                        handleInputChange("password", event.target.value)
                      }
                      required
                      aria-required="true"
                      disabled={saving}
                    />
                  </label>
                )}
                <label className="field full" htmlFor="member-role">
                  Função
                  <select
                    id="member-role"
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

              {actionError && (
                <p className="text-red-500" role="alert" aria-live="polite" style={{ marginTop: 8 }}>
                  {actionError}
                </p>
              )}

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
          <div className="modal-card confirm-modal" ref={deleteTrapRef}>
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
                aria-label="Fechar modal de exclusão de membro"
                onClick={closeDeleteModal}
              >
                <FiX aria-hidden="true" />
              </button>
            </header>

            <div className="modal-body confirm-body">
              <div className="confirm-icon" aria-hidden="true">
                <FiAlertTriangle />
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
          <div className="modal-card cpf-modal" ref={cpfTrapRef}>
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
                aria-label="Fechar modal de listagem de CPF"
                onClick={closeCpfModal}
              >
                <FiX aria-hidden="true" />
              </button>
            </header>

            <div className="modal-body">
              <label className="field" htmlFor="cpf-search-member">
                Buscar membro
                <input
                  id="cpf-search-member"
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
                <p className="text-red-500" role="alert" aria-live="polite">{cpfActionError}</p>
              )}
            </div>

            <div className="modal-footer">
              <button
                className="button secondary"
                type="button"
                aria-label="Fechar modal de listagem de CPF"
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
      {photoLightbox && (
        <div
          className="modal-backdrop photo-lightbox-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label={`Foto de ${photoLightbox.name}`}
          onClick={() => setPhotoLightbox(null)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setPhotoLightbox(null);
          }}
        >
          <div className="photo-lightbox-content" onClick={(e) => e.stopPropagation()}>
            <button
              className="icon-button photo-lightbox-close"
              type="button"
              aria-label="Fechar foto"
              onClick={() => setPhotoLightbox(null)}
            >
              <FiX aria-hidden="true" />
            </button>
            <Image
              className="photo-lightbox-image"
              src={photoLightbox.url}
              alt={`Foto de ${photoLightbox.name}`}
              width={400}
              height={400}
              style={{ objectFit: "contain" }}
              unoptimized
            />
            <p className="photo-lightbox-name">{photoLightbox.name}</p>
          </div>
        </div>
      )}
    </main>
  );
}
