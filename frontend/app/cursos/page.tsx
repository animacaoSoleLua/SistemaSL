"use client";

import './page.css';
import { useEffect, useId, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FiAlertTriangle, FiArchive, FiInfo, FiTrash2, FiX } from "react-icons/fi";
import {
  cancelEnrollment,
  createCourse,
  deleteCourse,
  enrollInCourse,
  finalizeCourse,
  getCourse,
  getCourses,
  getErrorMessage,
  getMember,
  getMembers,
  importCourse,
  updateCourse,
} from "../../lib/api";
import {
  getDefaultRoute,
  getStoredUser,
  isRoleAllowed,
  type Role,
  type StoredUser,
} from "../../lib/auth";
import { useFocusTrap } from "../../lib/useFocusTrap";
import { normalizeString } from "../../lib/validators";

interface Course {
  id: string;
  title: string;
  course_date: string;
  capacity: number | null;
  created_by: string;
  instructor: { id: string; name: string };
  enrolled_count: number;
  available_spots: number | null;
}

interface CourseDetails {
  id: string;
  title: string;
  description?: string | null;
  course_date: string;
  location?: string | null;
  capacity: number | null;
  instructor: { id: string; name: string };
  enrollments?: Array<{
    id: string;
    member_id: string;
    member_name: string;
    status: string;
  }>;
}

export default function CursosPage() {
  const router = useRouter();
  const modalTitleId = useId();
  const modalDescriptionId = useId();
  const deleteModalTitleId = useId();
  const deleteModalDescriptionId = useId();
  const unenrollModalTitleId = useId();
  const unenrollModalDescriptionId = useId();
  const [currentRole, setCurrentRole] = useState<Role | null>(null);
  const [currentUser, setCurrentUser] = useState<StoredUser | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrolledCourses, setEnrolledCourses] = useState<
    Record<string, { status: "enrolled" | "attended" | "missed"; enrollmentId: string }>
  >({});
  const [statusFilter, setStatusFilter] = useState<"available" | "full" | "all" | "archived">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [enrollingId, setEnrollingId] = useState<string | null>(null);
  const [unenrollingId, setUnenrollingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [editingLoading, setEditingLoading] = useState(false);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewCourse, setViewCourse] = useState<Course | null>(null);
  const [viewDetails, setViewDetails] = useState<CourseDetails | null>(null);
  const [viewError, setViewError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [courseDate, setCourseDate] = useState("");
  const [courseTime, setCourseTime] = useState("");
  const [location, setLocation] = useState("");
  const [capacity, setCapacity] = useState("");
  const [unlimitedVagas, setUnlimitedVagas] = useState(false);
  const [instructorId, setInstructorId] = useState("");
  const [members, setMembers] = useState<Array<{ id: string; name: string; last_name?: string | null }>>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [unenrollTarget, setUnenrollTarget] = useState<Course | null>(null);
  const [error, setError] = useState<string | null>(null);

  const finalizeModalTitleId = useId();
  const [finalizeModalOpen, setFinalizeModalOpen] = useState(false);
  const [finalizeLoading, setFinalizeLoading] = useState(false);
  const [finalizeCourseData, setFinalizeCourseData] = useState<{
    id: string;
    title: string;
    enrollments: Array<{
      enrollmentId: string;
      memberId: string;
      memberName: string;
      status: "attended" | "missed";
    }>;
  } | null>(null);
  const [finalizing, setFinalizing] = useState(false);

  // --- modal importar curso ---
  const importModalTitleId = useId();
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importSaving, setImportSaving] = useState(false);
  const [importFormError, setImportFormError] = useState<string | null>(null);
  const [importTitle, setImportTitle] = useState("");
  const [importDescription, setImportDescription] = useState("");
  const [importDate, setImportDate] = useState("");
  const [importTime, setImportTime] = useState("");
  const [importLocation, setImportLocation] = useState("");
  const [importInstructorId, setImportInstructorId] = useState("");
  const [importSearch, setImportSearch] = useState("");
  const [importParticipants, setImportParticipants] = useState<
    Array<{ id: string; name: string; status: "attended" | "missed" }>
  >([]);
  const importTrapRef = useFocusTrap(importModalOpen);

  const createEditTrapRef = useFocusTrap(modalOpen);
  const viewTrapRef = useFocusTrap(viewModalOpen);
  const deleteTrapRef = useFocusTrap(!!deleteTarget);
  const unenrollTrapRef = useFocusTrap(!!unenrollTarget);
  const finalizeTrapRef = useFocusTrap(finalizeModalOpen);

  useEffect(() => {
    const user = getStoredUser();
    if (!user) {
      router.push("/login");
      return;
    }
    if (!isRoleAllowed(user.role, ["admin", "animador", "recreador"])) {
      router.push(getDefaultRoute(user.role));
      return;
    }
    setCurrentRole(user.role);
    setCurrentUser(user);
  }, [router]);

  useEffect(() => {
    if (!notice || notice.type !== "success") return;
    const timer = setTimeout(() => setNotice(null), 3000);
    return () => clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (!currentUser) return;
    getMember(currentUser.id)
      .then((data) => {
        const coursesData = (data.data?.courses ?? []) as Array<{
          id: string;
          enrollment_id: string;
          status: "enrolled" | "attended" | "missed";
        }>;
        const next: Record<string, { status: "enrolled" | "attended" | "missed"; enrollmentId: string }> = {};
        coursesData.forEach((course) => {
          if (course?.id) {
            next[course.id] = { status: course.status, enrollmentId: course.enrollment_id };
          }
        });
        setEnrolledCourses(next);
      })
      .catch(() => {
        setEnrolledCourses({});
      });
  }, [currentUser]);

  useEffect(() => {
    if (!modalOpen && !importModalOpen) return;
    if (members.length > 0) return;
    setMembersLoading(true);
    getMembers({ limit: 200 })
      .then((data) => {
        const list = (data.data ?? []) as Array<{ id: string; name: string }>;
        setMembers(list);
        if (!editingCourseId && !instructorId && list.length > 0) {
          setInstructorId(list[0].id);
        }
        if (importModalOpen && !importInstructorId && list.length > 0) {
          setImportInstructorId(list[0].id);
        }
      })
      .catch(() => {
        setMembers([]);
      })
      .finally(() => {
        setMembersLoading(false);
      });
  }, [modalOpen, importModalOpen, members.length, instructorId, importInstructorId]);

  useEffect(() => {
    if (!currentRole) return;
    setLoading(true);
    setError(null);
    getCourses({ status: statusFilter })
      .then((data) => {
        setCourses(data.data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [currentRole, statusFilter]);

  const handleEnroll = async (course: Course) => {
    if (!currentUser) return;
    if (
      currentUser.id === course.created_by ||
      currentUser.id === course.instructor?.id
    ) {
      setNotice({
        type: "info",
        message: "Você não pode se inscrever no curso que criou ou ministra.",
      });
      return;
    }
    if (enrolledCourses[course.id]) {
      setNotice({ type: "info", message: "Você já está inscrito neste curso." });
      return;
    }
    if (course.available_spots !== null && course.available_spots <= 0) {
      setNotice({ type: "info", message: "Turma cheia no momento." });
      return;
    }
    setEnrollingId(course.id);
    setNotice(null);
    try {
      await enrollInCourse(course.id, currentUser.id);
      const [data, profile] = await Promise.all([
        getCourses({ status: statusFilter }),
        getMember(currentUser.id),
      ]);
      setCourses(data.data);
      const coursesData = (profile.data?.courses ?? []) as Array<{
        id: string;
        enrollment_id: string;
        status: "enrolled" | "attended" | "missed";
      }>;
      const next: Record<string, { status: "enrolled" | "attended" | "missed"; enrollmentId: string }> = {};
      coursesData.forEach((entry) => {
        if (entry?.id) {
          next[entry.id] = { status: entry.status, enrollmentId: entry.enrollment_id };
        }
      });
      setEnrolledCourses(next);
      const googleConnected = !!(profile.data as { google_connected?: boolean })?.google_connected;
      if (googleConnected) {
        setNotice({ type: "success", message: "Vaga reservada! Evento adicionado ao seu Google Agenda." });
      } else {
        setNotice({ type: "success", message: "Vaga reservada com sucesso." });
      }
    } catch (err: unknown) {
      setNotice({
        type: "error",
        message: getErrorMessage(err, "Não foi possível pegar a vaga."),
      });
    } finally {
      setEnrollingId(null);
    }
  };

  const confirmUnenroll = async () => {
    if (!currentUser || !unenrollTarget) return;
    const course = unenrollTarget;
    const enrollment = enrolledCourses[course.id];
    if (!enrollment || enrollment.status !== "enrolled") return;
    setUnenrollingId(course.id);
    setNotice(null);
    try {
      await cancelEnrollment(course.id, enrollment.enrollmentId);
      const [data, profile] = await Promise.all([
        getCourses({ status: statusFilter }),
        getMember(currentUser.id),
      ]);
      setCourses(data.data);
      const coursesData = (profile.data?.courses ?? []) as Array<{
        id: string;
        enrollment_id: string;
        status: "enrolled" | "attended" | "missed";
      }>;
      const next: Record<string, { status: "enrolled" | "attended" | "missed"; enrollmentId: string }> = {};
      coursesData.forEach((entry) => {
        if (entry?.id) {
          next[entry.id] = { status: entry.status, enrollmentId: entry.enrollment_id };
        }
      });
      setEnrolledCourses(next);
      setNotice({ type: "success", message: "Você saiu do curso. A vaga foi liberada." });
    } catch (err: unknown) {
      setNotice({
        type: "error",
        message: getErrorMessage(err, "Não foi possível cancelar a inscrição."),
      });
    } finally {
      setUnenrollingId(null);
      setUnenrollTarget(null);
    }
  };

  const resetForm = () => {
    setEditingCourseId(null);
    setTitle("");
    setDescription("");
    setCourseDate("");
    setCourseTime("");
    setLocation("");
    setCapacity("");
    setUnlimitedVagas(false);
    setInstructorId(currentUser?.id ?? "");
    setFormError(null);
  };

  const openModal = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEditModal = async (courseId: string) => {
    setFormError(null);
    setEditingLoading(true);
    setModalOpen(true);
    try {
      const response = await getCourse(courseId);
      const data = response.data as CourseDetails;
      setEditingCourseId(courseId);
      setTitle(data.title ?? "");
      setDescription(data.description ?? "");
      const rawDate = data.course_date ?? "";
      const sep = rawDate.includes("T") ? "T" : " ";
      const [datePart = "", timeFull = ""] = rawDate.split(sep);
      setCourseDate(datePart);
      setCourseTime(timeFull.slice(0, 5) || "08:00");
      setLocation(data.location ?? "");
      if (data.capacity === null) {
        setUnlimitedVagas(true);
        setCapacity("");
      } else {
        setUnlimitedVagas(false);
        setCapacity(String(data.capacity ?? ""));
      }
      setInstructorId(data.instructor?.id ?? "");
    } catch (err: unknown) {
      setNotice({
        type: "error",
        message: getErrorMessage(err, "Não foi possível carregar o curso."),
      });
      setModalOpen(false);
    } finally {
      setEditingLoading(false);
    }
  };

  const openViewModal = async (course: Course) => {
    setViewCourse(course);
    setViewDetails(null);
    setViewError(null);
    setViewModalOpen(true);
    setViewLoading(true);
    try {
      const response = await getCourse(course.id);
      const data = response.data as CourseDetails;
      setViewDetails(data);
    } catch (err: unknown) {
      setViewError(getErrorMessage(err, "Não foi possível carregar os detalhes do curso."));
    } finally {
      setViewLoading(false);
    }
  };

  const openFinalizeModal = async (course: Course) => {
    setFinalizeModalOpen(true);
    setFinalizeLoading(true);
    setFinalizeCourseData(null);
    try {
      const response = await getCourse(course.id);
      const data = response.data as CourseDetails;
      setFinalizeCourseData({
        id: course.id,
        title: course.title,
        enrollments: (data.enrollments ?? []).map((e) => ({
          enrollmentId: e.id,
          memberId: e.member_id,
          memberName: e.member_name,
          status: "attended" as const,
        })),
      });
    } catch (err: unknown) {
      setNotice({
        type: "error",
        message: getErrorMessage(err, "Não foi possível carregar os inscritos."),
      });
      setFinalizeModalOpen(false);
    } finally {
      setFinalizeLoading(false);
    }
  };

  const toggleFinalizeStatus = (enrollmentId: string) => {
    if (!finalizeCourseData) return;
    setFinalizeCourseData({
      ...finalizeCourseData,
      enrollments: finalizeCourseData.enrollments.map((e) =>
        e.enrollmentId === enrollmentId
          ? { ...e, status: e.status === "attended" ? "missed" : "attended" }
          : e
      ),
    });
  };

  const handleFinalizeCourse = async () => {
    if (!finalizeCourseData || finalizing) return;
    setFinalizing(true);
    try {
      await finalizeCourse(
        finalizeCourseData.id,
        finalizeCourseData.enrollments.map((e) => ({
          enrollment_id: e.enrollmentId,
          status: e.status,
        }))
      );
      setNotice({
        type: "success",
        message: "Curso finalizado! Presenças registradas com sucesso.",
      });
      setFinalizeModalOpen(false);
      setFinalizeCourseData(null);
      const data = await getCourses({ status: statusFilter });
      setCourses(data.data);
    } catch (err: unknown) {
      setNotice({
        type: "error",
        message: getErrorMessage(err, "Não foi possível finalizar o curso."),
      });
    } finally {
      setFinalizing(false);
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setSaving(false);
    setFormError(null);
    setEditingCourseId(null);
  };

  const closeViewModal = () => {
    setViewModalOpen(false);
    setViewCourse(null);
    setViewDetails(null);
    setViewError(null);
    setViewLoading(false);
  };

  function resetImportModal() {
    setImportTitle("");
    setImportDescription("");
    setImportDate("");
    setImportTime("");
    setImportLocation("");
    setImportInstructorId(members[0]?.id ?? "");
    setImportSearch("");
    setImportParticipants([]);
    setImportFormError(null);
  }

  async function handleImportSubmit(e: React.FormEvent) {
    e.preventDefault();
    setImportFormError(null);

    if (!importTitle.trim()) {
      setImportFormError("Título é obrigatório");
      return;
    }
    if (!importDate || !importTime) {
      setImportFormError("Data e hora são obrigatórias");
      return;
    }
    if (!importInstructorId) {
      setImportFormError("Instrutor é obrigatório");
      return;
    }

    setImportSaving(true);
    try {
      await importCourse({
        title: importTitle.trim(),
        description: importDescription.trim() || undefined,
        course_date: `${importDate}T${importTime}`,
        location: importLocation.trim() || undefined,
        instructor_id: importInstructorId,
        members: importParticipants.map((p) => ({
          member_id: p.id,
          status: p.status,
        })),
      });
      setImportModalOpen(false);
      resetImportModal();
      setNotice({ type: "success", message: "Curso importado com sucesso!" });
      getCourses({ status: statusFilter }).then((data) => setCourses(data.data));
    } catch (err) {
      setImportFormError(getErrorMessage(err));
    } finally {
      setImportSaving(false);
    }
  }

  const handleCreateCourse = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setFormError(null);

    let parsedCapacity: number | undefined;
    if (!unlimitedVagas) {
      const n = Number(capacity);
      if (!Number.isInteger(n) || n <= 0) {
        setFormError("Informe um número válido de vagas.");
        setSaving(false);
        return;
      }
      parsedCapacity = n;
    }

    if (!courseDate || !courseTime) {
      setFormError("Informe a data e a hora do curso.");
      setSaving(false);
      return;
    }

    if (!instructorId) {
      setFormError("Selecione o instrutor do curso.");
      setSaving(false);
      return;
    }

    try {
      if (editingCourseId) {
        await updateCourse(editingCourseId, {
          title: title.trim(),
          description: description.trim() || undefined,
          course_date: `${courseDate}T${courseTime}`,
          location: location.trim() || undefined,
          capacity: unlimitedVagas ? null : parsedCapacity,
          instructor_id: instructorId,
        });
        setNotice({ type: "success", message: "Curso atualizado com sucesso." });
      } else {
        await createCourse({
          title: title.trim(),
          description: description.trim() || undefined,
          course_date: `${courseDate}T${courseTime}`,
          location: location.trim() || undefined,
          capacity: parsedCapacity,
          instructor_id: instructorId,
        });
        setNotice({ type: "success", message: "Curso criado com sucesso." });
      }
      closeModal();
      const data = await getCourses({ status: statusFilter });
      setCourses(data.data);
    } catch (err: unknown) {
      setFormError(getErrorMessage(err, "Erro ao salvar curso."));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCourse = (courseId: string, courseTitle: string) => {
    if (deletingId) return;
    setDeleteTarget({ id: courseId, title: courseTitle });
  };

  const confirmDeleteCourse = async () => {
    if (!deleteTarget || deletingId) return;
    setDeletingId(deleteTarget.id);
    setNotice(null);
    try {
      await deleteCourse(deleteTarget.id);
      setNotice({ type: "success", message: "Curso apagado com sucesso." });
      const data = await getCourses({ status: statusFilter });
      setCourses(data.data);
    } catch (err: unknown) {
      setNotice({
        type: "error",
        message: getErrorMessage(err, "Não foi possível apagar o curso."),
      });
    } finally {
      setDeletingId(null);
      setDeleteTarget(null);
    }
  };

  const filteredCourses = useMemo(() => {
    const term = normalizeString(searchTerm.trim());
    if (!term) return courses;
    return courses.filter((course) => normalizeString(course.title).includes(term));
  }, [courses, searchTerm]);

  const stats = useMemo(() => {
    const totalCourses = courses.length;
    const totalSpots = courses.reduce((acc, course) => acc + (course.capacity ?? 0), 0);
    const availableCourses = courses.filter((course) => course.available_spots === null || course.available_spots > 0).length;
    return { totalCourses, totalSpots, availableCourses };
  }, [courses]);

  const formatDateBR = (value: string) => {
    if (!value) return value;
    const [datePartRaw] = value.split("T");
    const datePart = datePartRaw.includes(" ")
      ? datePartRaw.split(" ")[0]
      : datePartRaw;
    const [year, month, day] = datePart.split("-");
    if (!year || !month || !day) {
      return value;
    }
    return `${day}/${month}/${year}`;
  };

  const formatTimeBR = (value: string) => {
    if (!value) return value;
    let timePart = "";
    if (value.includes("T")) {
      [, timePart] = value.split("T");
    } else if (value.includes(" ")) {
      [, timePart] = value.split(" ");
    }
    if (!timePart) return "";
    const [hour, minute] = timePart.split(":");
    if (!hour || !minute) return timePart;
    return `${hour}:${minute}`;
  };

  const formatCourseStatus = (status: "enrolled" | "attended" | "missed") => {
    if (status === "attended") return "Presente";
    if (status === "missed") return "Faltou";
    return "Inscrito";
  };

  return (
    <main className="app-page">
      <section className="shell reveal">
        <header className="page-header">
          <div>
            <h1 className="hero-title">Cursos</h1>
            <p className="hero-copy">Acompanhe turmas, vagas e datas principais.</p>
          </div>
          {(currentRole === "admin" || currentRole === "animador") && (
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button className="button" type="button" onClick={openModal}>
                + Novo Curso
              </button>
              <button
                type="button"
                className="button button-secondary"
                onClick={() => {
                  setImportInstructorId(members[0]?.id ?? "");
                  setImportModalOpen(true);
                }}
              >
                Importar Curso
              </button>
            </div>
          )}
        </header>

        <section className="report-panel">
          <div className="report-header">
            <div>
              <h2 className="section-title">Listagem de cursos</h2>
              <p>Busque por nome e veja disponibilidade.</p>
            </div>
            <div className="report-actions">
              <label className="field report-search">
                <input
                  type="text"
                  placeholder="Buscar por curso..."
                  className="input"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  aria-label="Buscar curso"
                />
              </label>
              <label className="field report-search">
                <select
                  className="input"
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter(e.target.value as "available" | "full" | "all" | "archived")
                  }
                  aria-label="Filtrar cursos por status"
                >
                  <option value="all">Todas as turmas</option>
                  <option value="available">Com vagas</option>
                  <option value="full">Lotadas</option>
                  <option value="archived">Finalizados</option>
                </select>
              </label>
            </div>
          </div>

          {notice && (
            <div className={`alert-card ${notice.type}`}>
              <span className="alert-icon" aria-hidden="true">
                <FiInfo />
              </span>
              <div>
                <strong className="alert-title">
                  {notice.type === "success"
                    ? "Tudo certo!"
                    : notice.type === "error"
                    ? "Algo deu errado"
                    : "Atenção"}
                </strong>
                <p className="alert-text">{notice.message}</p>
              </div>
            </div>
          )}

          {loading ? (
            <div className="empty-state" aria-live="polite" aria-atomic="true">
              <p>Carregando cursos...</p>
            </div>
          ) : error ? (
            <div className="empty-state">
              <p className="text-red-500" role="alert" aria-live="polite">Erro ao carregar cursos: {error}</p>
            </div>
          ) : filteredCourses.length > 0 ? (
            <div className="report-list">
              {filteredCourses.map((course) => {
                const enrolledEntry = enrolledCourses[course.id];
                const enrolledStatus = enrolledEntry?.status;
                const isRestricted =
                  currentUser &&
                  (currentUser.id === course.created_by ||
                    currentUser.id === course.instructor?.id);
                const canManageCourse =
                  currentUser &&
                  (currentRole === "admin" || course.created_by === currentUser.id);
                const isPastCourse = new Date() > new Date(course.course_date);
                const canFinalize =
                  isPastCourse &&
                  currentUser &&
                  (currentRole === "admin" ||
                    currentUser.id === course.instructor?.id);
                const restrictionLabel =
                  currentUser && currentUser.id === course.created_by
                    ? "Criador"
                    : currentUser && currentUser.id === course.instructor?.id
                    ? "Instrutor"
                    : null;
                return (
                  <article
                    className="report-item"
                    key={course.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => openViewModal(course)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openViewModal(course);
                      }
                    }}
                  >
                    <div className="report-meta">
                      <strong className="report-name">{course.title}</strong>
                      <span className="report-date">
                        Instrutor: {course.instructor?.name ?? "-"}
                      </span>
                      <span className="report-date">
                        Data: {formatDateBR(course.course_date)}
                      </span>
                      <span className="report-date">
                        {course.capacity === null
                          ? `Inscritos: ${course.enrolled_count}`
                          : `Vagas: ${course.enrolled_count}/${course.capacity}`}
                      </span>
                    </div>
                    <div className="course-actions">
                      {enrolledStatus && (
                        <span className="status-pill active">
                          {formatCourseStatus(enrolledStatus)}
                        </span>
                      )}
                      {restrictionLabel && (
                        <span className="status-pill inactive">{restrictionLabel}</span>
                      )}
                      {statusFilter === "archived" ? (
                        <span className="status-pill inactive">Finalizado</span>
                      ) : course.capacity === null ? (
                        <span className="status-pill active">Ilimitado</span>
                      ) : (
                        <span
                          className={`status-pill ${
                            (course.available_spots ?? 0) > 0 ? "active" : "inactive"
                          }`}
                        >
                          {(course.available_spots ?? 0) > 0
                            ? `${course.available_spots} vagas`
                            : "Lotado"}
                        </span>
                      )}
                      {statusFilter !== "archived" && (currentRole === "animador" ||
                        currentRole === "recreador") && enrolledStatus === "enrolled" && (
                        <button
                          type="button"
                          className="button danger"
                          onClick={(event) => {
                            event.stopPropagation();
                            setUnenrollTarget(course);
                          }}
                          disabled={unenrollingId === course.id}
                        >
                          {unenrollingId === course.id ? "Saindo..." : "Sair do Curso"}
                        </button>
                      )}
                      {statusFilter !== "archived" && (currentRole === "animador" ||
                        currentRole === "recreador") && !enrolledStatus && (
                        <button
                          type="button"
                          className="button secondary"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleEnroll(course);
                          }}
                          disabled={
                            (course.available_spots !== null && course.available_spots <= 0) ||
                            enrollingId === course.id ||
                            !!isRestricted
                          }
                        >
                          {isRestricted
                            ? "Indisponível"
                            : (course.available_spots !== null && course.available_spots <= 0)
                            ? "Turma cheia"
                            : enrollingId === course.id
                            ? "Reservando..."
                            : "Pegar vaga"}
                        </button>
                      )}
                      {statusFilter !== "archived" && canManageCourse && (
                        <>
                          <button
                            type="button"
                            className="button edit"
                            onClick={(event) => {
                              event.stopPropagation();
                              openEditModal(course.id);
                            }}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            className="button danger"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleDeleteCourse(course.id, course.title);
                            }}
                            disabled={deletingId === course.id}
                          >
                            {deletingId === course.id ? "Apagando..." : "Apagar"}
                          </button>
                        </>
                      )}
                      {statusFilter === "archived" && currentRole === "admin" && (
                        <button
                          type="button"
                          className="button danger"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleDeleteCourse(course.id, course.title);
                          }}
                          disabled={deletingId === course.id}
                          aria-label={`Deletar curso ${course.title}`}
                        >
                          <FiTrash2 style={{ marginRight: "4px" }} />
                          {deletingId === course.id ? "Apagando..." : "Apagar"}
                        </button>
                      )}
                      {statusFilter !== "archived" && canFinalize && (
                        <button
                          type="button"
                          className="button"
                          style={{ background: "linear-gradient(120deg, #28965a, #1a6b3e)" }}
                          onClick={(event) => {
                            event.stopPropagation();
                            openFinalizeModal(course);
                          }}
                        >
                          Finalizar Curso
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">
              <span className="empty-state-icon" aria-hidden="true">
                <FiArchive />
              </span>
              <p>Nenhum curso encontrado</p>
              <p className="helper">Crie a primeira turma para aparecer aqui.</p>
              {(currentRole === "admin" || currentRole === "animador") && (
                <button className="button" type="button" onClick={openModal}>
                  + Criar Curso
                </button>
              )}
            </div>
          )}
        </section>
      </section>

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
              setDeleteTarget(null);
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
                  Esta ação não pode ser desfeita.
                </p>
              </div>
              <button
                className="icon-button"
                type="button"
                aria-label="Fechar modal de exclusão de curso"
                onClick={() => setDeleteTarget(null)}
                disabled={deletingId === deleteTarget.id}
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
                  {statusFilter === "archived"
                    ? `Tem certeza que deseja deletar permanentemente o curso ${deleteTarget.title}?`
                    : `Tem certeza que deseja apagar o curso ${deleteTarget.title}?`}
                </p>
                <p className="confirm-muted">
                  {statusFilter === "archived"
                    ? "Esta ação não pode ser desfeita."
                    : "O curso será removido e todas as inscrições canceladas."}
                </p>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="button secondary"
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deletingId === deleteTarget.id}
              >
                Cancelar
              </button>
              <button
                className="button danger"
                type="button"
                onClick={confirmDeleteCourse}
                disabled={deletingId === deleteTarget.id}
              >
                {deletingId === deleteTarget.id ? "Apagando..." : "Apagar curso"}
              </button>
            </div>
          </div>
        </div>
      )}

      {unenrollTarget && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby={unenrollModalTitleId}
          aria-describedby={unenrollModalDescriptionId}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.stopPropagation();
              if (!unenrollingId) setUnenrollTarget(null);
            }
          }}
        >
          <div className="modal-card confirm-modal" ref={unenrollTrapRef}>
            <header className="modal-header">
              <div>
                <h2 className="section-title" id={unenrollModalTitleId}>
                  Sair do curso
                </h2>
                <p id={unenrollModalDescriptionId}>
                  Você perderá sua vaga e precisará se inscrever novamente.
                </p>
              </div>
              <button
                type="button"
                aria-label="Fechar modal de confirmação"
                onClick={() => setUnenrollTarget(null)}
                disabled={!!unenrollingId}
              >
                <FiX aria-hidden="true" />
              </button>
            </header>
            <div className="confirm-body">
              <div className="confirm-text">
                <p>
                  Tem certeza que deseja sair do curso{" "}
                  <strong>{unenrollTarget.title}</strong>?
                </p>
              </div>
              <button
                className="button secondary"
                type="button"
                onClick={() => setUnenrollTarget(null)}
                disabled={!!unenrollingId}
              >
                Cancelar
              </button>
              <button
                className="button danger"
                type="button"
                onClick={confirmUnenroll}
                disabled={!!unenrollingId}
              >
                {unenrollingId ? "Saindo..." : "Sair do curso"}
              </button>
            </div>
          </div>
        </div>
      )}

      {viewModalOpen && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`${modalTitleId}-view`}
          aria-describedby={`${modalDescriptionId}-view`}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.stopPropagation();
              closeViewModal();
            }
          }}
        >
          <div className="modal-card" ref={viewTrapRef}>
            <header className="modal-header">
              <div>
                <strong id={`${modalTitleId}-view`}>Detalhes do curso</strong>
                <p className="helper" id={`${modalDescriptionId}-view`}>
                  Visualização somente de leitura.
                </p>
              </div>
              <button className="button secondary" type="button" aria-label="Fechar modal de detalhes do curso" onClick={closeViewModal}>
                Fechar
              </button>
            </header>
            <div className="modal-body">
              {viewLoading ? (
                <p>Carregando detalhes...</p>
              ) : viewError ? (
                <p className="text-red-500" role="alert" aria-live="polite">{viewError}</p>
              ) : (
                <div className="form-grid">
                  <div className="field full">
                    <span>Título do curso</span>
                    <p className="helper">{viewDetails?.title ?? viewCourse?.title}</p>
                  </div>
                  <div className="field full">
                    <span>Descrição</span>
                    <p className="helper">
                      {viewDetails?.description || "Sem descrição informada."}
                    </p>
                  </div>
                  <div className="field full">
                    <span>Instrutor</span>
                    <p className="helper">
                      {viewDetails?.instructor?.name ??
                        viewCourse?.instructor?.name ??
                        "-"}
                    </p>
                  </div>
                  <div className="field">
                    <span>Data</span>
                    <p className="helper">
                      {formatDateBR(
                        viewDetails?.course_date ?? viewCourse?.course_date ?? "",
                      )}
                    </p>
                  </div>
                  <div className="field">
                    <span>Hora</span>
                    <p className="helper">
                      {formatTimeBR(
                        viewDetails?.course_date ?? viewCourse?.course_date ?? "",
                      ) || "-"}
                    </p>
                  </div>
                  <div className="field">
                    <span>Vagas</span>
                    <p className="helper">
                      {viewCourse
                        ? viewCourse.capacity === null
                          ? `${viewCourse.enrolled_count} inscritos (ilimitado)`
                          : `${viewCourse.enrolled_count}/${viewCourse.capacity}`
                        : viewDetails?.capacity === null
                        ? "Ilimitado"
                        : (viewDetails?.capacity ?? "-")}
                    </p>
                  </div>
                  <div className="field">
                    <span>Disponíveis</span>
                    <p className="helper">
                      {viewCourse?.available_spots === null
                        ? "Ilimitado"
                        : (viewCourse?.available_spots ?? "-")}
                    </p>
                  </div>
                  <div className="field full">
                    <span>Local</span>
                    <p className="helper">
                      {viewDetails?.location || "Local não informado."}
                    </p>
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="button secondary" type="button" aria-label="Fechar modal de detalhes do curso" onClick={closeViewModal}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {finalizeModalOpen && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby={finalizeModalTitleId}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.stopPropagation();
              if (!finalizing) {
                setFinalizeModalOpen(false);
                setFinalizeCourseData(null);
              }
            }
          }}
        >
          <div className="modal-card" ref={finalizeTrapRef}>
            <header className="modal-header">
              <div>
                <strong id={finalizeModalTitleId}>
                  Finalizar Curso
                </strong>
                <p className="helper">
                  {finalizeCourseData?.title ?? "Carregando..."}
                </p>
              </div>
              <button
                className="button secondary"
                type="button"
                aria-label="Fechar modal de finalização de curso"
                onClick={() => {
                  if (!finalizing) {
                    setFinalizeModalOpen(false);
                    setFinalizeCourseData(null);
                  }
                }}
                disabled={finalizing}
              >
                Fechar
              </button>
            </header>
            <div className="modal-body">
              {finalizeLoading ? (
                <p className="helper">Carregando inscritos...</p>
              ) : !finalizeCourseData || finalizeCourseData.enrollments.length === 0 ? (
                <div className="empty-state">
                  <p>Nenhum inscrito encontrado neste curso.</p>
                </div>
              ) : (
                <>
                  <p className="helper" style={{ marginBottom: 12 }}>
                    Marque quem <strong>não compareceu</strong>. Por padrão todos estão como presentes.
                  </p>
                  <div style={{ display: "grid", gap: 10 }}>
                    {finalizeCourseData.enrollments.map((enrollment) => (
                      <div
                        key={enrollment.enrollmentId}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 12,
                          padding: "12px 16px",
                          borderRadius: 12,
                          border: `1px solid ${enrollment.status === "attended" ? "rgba(40, 150, 90, 0.25)" : "rgba(208, 75, 75, 0.25)"}`,
                          background: enrollment.status === "attended" ? "#f1fbf4" : "#fff4f4",
                          transition: "background 0.2s ease, border-color 0.2s ease",
                        }}
                      >
                        <span style={{ fontWeight: 500, color: "var(--ink)" }}>
                          {enrollment.memberName}
                        </span>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            type="button"
                            className={`button small${enrollment.status === "attended" ? "" : " secondary"}`}
                            style={enrollment.status === "attended" ? { background: "linear-gradient(120deg, #28965a, #1a6b3e)", boxShadow: "none" } : {}}
                            aria-pressed={enrollment.status === "attended"}
                            onClick={() => {
                              if (enrollment.status !== "attended") {
                                toggleFinalizeStatus(enrollment.enrollmentId);
                              }
                            }}
                            disabled={finalizing}
                          >
                            Presente
                          </button>
                          <button
                            type="button"
                            className={`button small${enrollment.status === "missed" ? " danger" : " secondary"}`}
                            style={enrollment.status === "missed" ? { background: "linear-gradient(120deg, #d04b4b, #a83030)", color: "#fff", border: "none", boxShadow: "none" } : {}}
                            aria-pressed={enrollment.status === "missed"}
                            onClick={() => {
                              if (enrollment.status !== "missed") {
                                toggleFinalizeStatus(enrollment.enrollmentId);
                              }
                            }}
                            disabled={finalizing}
                          >
                            Faltou
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
            {!finalizeLoading && finalizeCourseData && finalizeCourseData.enrollments.length > 0 && (
              <div className="modal-footer">
                <button
                  className="button secondary"
                  type="button"
                  onClick={() => {
                    if (!finalizing) {
                      setFinalizeModalOpen(false);
                      setFinalizeCourseData(null);
                    }
                  }}
                  disabled={finalizing}
                >
                  Cancelar
                </button>
                <button
                  className="button"
                  type="button"
                  onClick={handleFinalizeCourse}
                  disabled={finalizing}
                >
                  {finalizing ? "Salvando..." : "Confirmar Presenças"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {modalOpen && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby={modalTitleId}
          aria-describedby={modalDescriptionId}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.stopPropagation();
              closeModal();
            }
          }}
        >
          <div className="modal-card" ref={createEditTrapRef}>
            <header className="modal-header">
              <div>
                <strong id={modalTitleId}>
                  {editingCourseId ? "Editar curso" : "Novo curso"}
                </strong>
                <p className="helper" id={modalDescriptionId}>
                  Preencha apenas as informações essenciais.
                </p>
              </div>
              <button className="button secondary" type="button" aria-label="Fechar modal de curso" onClick={closeModal}>
                Fechar
              </button>
            </header>
            <form className="modal-body" onSubmit={handleCreateCourse}>
              <div className="form-grid">
                <label className="field full" htmlFor="course-title">
                  <span>Título do curso</span>
                  <input
                    id="course-title"
                    className="input"
                    type="text"
                    placeholder="Ex: Curso de Pintura de Rosto"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    aria-required="true"
                    disabled={saving || editingLoading}
                  />
                </label>
                <label className="field full" htmlFor="course-description">
                  <span>Descrição (opcional)</span>
                  <textarea
                    id="course-description"
                    className="input"
                    rows={3}
                    placeholder="Resumo do conteúdo do curso"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={saving || editingLoading}
                  />
                </label>
                <label className="field full" htmlFor="course-instructor">
                  <span>Instrutor</span>
                  <select
                    id="course-instructor"
                    className="input"
                    value={instructorId}
                    onChange={(e) => setInstructorId(e.target.value)}
                    required
                    aria-required="true"
                    disabled={saving || membersLoading || editingLoading}
                  >
                    {membersLoading && <option>Carregando...</option>}
                    {!membersLoading && members.length === 0 && (
                      <option value="">Nenhum membro encontrado</option>
                    )}
                    {!membersLoading &&
                      members.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.name}
                        </option>
                      ))}
                  </select>
                </label>
                <label className="field" htmlFor="course-date">
                  <span>Data do curso</span>
                  <input
                    id="course-date"
                    className="input"
                    type="date"
                    value={courseDate}
                    onChange={(e) => setCourseDate(e.target.value)}
                    required
                    aria-required="true"
                    disabled={saving || editingLoading}
                  />
                </label>
                <label className="field" htmlFor="course-time">
                  <span>Hora do curso</span>
                  <input
                    id="course-time"
                    className="input"
                    type="time"
                    value={courseTime}
                    onChange={(e) => setCourseTime(e.target.value)}
                    required
                    aria-required="true"
                    disabled={saving || editingLoading}
                  />
                </label>
                <label className="field" htmlFor="course-capacity-type">
                  <span>Tipo de vagas</span>
                  <select
                    id="course-capacity-type"
                    className="input"
                    value={unlimitedVagas ? "unlimited" : "limited"}
                    onChange={(e) => {
                      const isUnlimited = e.target.value === "unlimited";
                      setUnlimitedVagas(isUnlimited);
                      if (isUnlimited) setCapacity("");
                    }}
                    disabled={saving || editingLoading}
                  >
                    <option value="limited">Vagas limitadas</option>
                    <option value="unlimited">Vagas ilimitadas</option>
                  </select>
                </label>
                {!unlimitedVagas && (
                  <label className="field" htmlFor="course-capacity">
                    <span>Quantidade de vagas</span>
                    <input
                      id="course-capacity"
                      className="input"
                      type="number"
                      min={1}
                      placeholder="Ex: 25"
                      value={capacity}
                      onChange={(e) => setCapacity(e.target.value)}
                      required
                      aria-required="true"
                      disabled={saving || editingLoading}
                    />
                  </label>
                )}
                <label className="field full" htmlFor="course-location">
                  <span>Local</span>
                  <input
                    id="course-location"
                    className="input"
                    type="text"
                    placeholder="Endereço do local"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    disabled={saving || editingLoading}
                  />
                </label>
              </div>
              {formError && (
                <p className="text-red-500" role="alert" aria-live="polite">
                  {formError}
                </p>
              )}
              <div className="modal-footer">
                <button className="button secondary" type="button" onClick={closeModal}>
                  Cancelar
                </button>
                <button
                  className="button"
                  type="submit"
                  disabled={saving || editingLoading}
                >
                  {saving
                    ? "Salvando..."
                    : editingCourseId
                    ? "Atualizar curso"
                    : "Salvar curso"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal: Importar Curso Histórico */}
      {importModalOpen && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby={importModalTitleId}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setImportModalOpen(false);
              resetImportModal();
            }
          }}
        >
          <div className="modal-card modal-lg import-modal" ref={importTrapRef}>
            <header className="modal-header">
              <h2 className="section-title" id={importModalTitleId}>
                Importar Curso Histórico
              </h2>
              <button
                type="button"
                className="icon-button"
                aria-label="Fechar modal"
                onClick={() => {
                  setImportModalOpen(false);
                  resetImportModal();
                }}
              >
                <FiX aria-hidden="true" />
              </button>
            </header>

            <div className="modal-body">
              <form id="import-course-form" onSubmit={handleImportSubmit}>
                <div className="form-group">
                  <label htmlFor="import-title">Título *</label>
                  <input
                    id="import-title"
                    type="text"
                    className="form-input"
                    value={importTitle}
                    onChange={(e) => setImportTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="import-description">Descrição</label>
                  <input
                    id="import-description"
                    type="text"
                    className="form-input"
                    value={importDescription}
                    onChange={(e) => setImportDescription(e.target.value)}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="import-date">Data *</label>
                    <input
                      id="import-date"
                      type="date"
                      className="form-input"
                      value={importDate}
                      onChange={(e) => setImportDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="import-time">Hora *</label>
                    <input
                      id="import-time"
                      type="time"
                      className="form-input"
                      value={importTime}
                      onChange={(e) => setImportTime(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="import-location">Local</label>
                  <input
                    id="import-location"
                    type="text"
                    className="form-input"
                    value={importLocation}
                    onChange={(e) => setImportLocation(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="import-instructor">Instrutor *</label>
                  <select
                    id="import-instructor"
                    className="form-input"
                    value={importInstructorId}
                    onChange={(e) => setImportInstructorId(e.target.value)}
                    required
                  >
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-section-divider">Participantes</div>

                <div className="form-group">
                  <label htmlFor="import-search">Buscar membro</label>
                  <input
                    id="import-search"
                    type="text"
                    className="form-input"
                    placeholder="Digite o nome para pesquisar..."
                    value={importSearch}
                    onChange={(e) => setImportSearch(e.target.value)}
                  />
                </div>

                {importSearch.trim() && (
                  <ul className="member-search-results">
                    {members
                      .filter((m) => {
                        const fullName = [m.name, m.last_name].filter(Boolean).join(" ");
                        return normalizeString(fullName).includes(normalizeString(importSearch));
                      })
                      .slice(0, 8)
                      .map((m) => {
                        const alreadyAdded = importParticipants.some((p) => p.id === m.id);
                        return (
                          <li key={m.id} className="member-search-item">
                            <span>{[m.name, m.last_name].filter(Boolean).join(" ")}</span>
                            <button
                              type="button"
                              className="button button-sm button-secondary"
                              disabled={alreadyAdded}
                              onClick={() => {
                                if (!alreadyAdded) {
                                  setImportParticipants((prev) => [
                                    ...prev,
                                    { id: m.id, name: m.name, status: "attended" },
                                  ]);
                                  setImportSearch("");
                                }
                              }}
                            >
                              {alreadyAdded ? "Adicionado" : "Adicionar"}
                            </button>
                          </li>
                        );
                      })}
                  </ul>
                )}

                {importParticipants.length > 0 && (
                  <div className="import-participants-list">
                    <p className="form-label">
                      Participantes ({importParticipants.length})
                    </p>
                    <ul>
                      {importParticipants.map((p) => (
                        <li key={p.id} className="import-participant-item">
                          <span>{p.name}</span>
                          <div className="participant-controls">
                            <button
                              type="button"
                              className={`button button-sm ${p.status === "attended" ? "" : "button-ghost"}`}
                              onClick={() =>
                                setImportParticipants((prev) =>
                                  prev.map((x) =>
                                    x.id === p.id ? { ...x, status: "attended" } : x
                                  )
                                )
                              }
                            >
                              Compareceu
                            </button>
                            <button
                              type="button"
                              className={`button button-sm ${p.status === "missed" ? "button-danger" : "button-ghost"}`}
                              onClick={() =>
                                setImportParticipants((prev) =>
                                  prev.map((x) =>
                                    x.id === p.id ? { ...x, status: "missed" } : x
                                  )
                                )
                              }
                            >
                              Faltou
                            </button>
                            <button
                              type="button"
                              className="icon-button"
                              aria-label={`Remover ${p.name}`}
                              onClick={() =>
                                setImportParticipants((prev) =>
                                  prev.filter((x) => x.id !== p.id)
                                )
                              }
                            >
                              <FiX aria-hidden="true" />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {importFormError && (
                  <p className="form-error" role="alert">
                    {importFormError}
                  </p>
                )}
              </form>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="button button-ghost"
                onClick={() => {
                  setImportModalOpen(false);
                  resetImportModal();
                }}
                disabled={importSaving}
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="import-course-form"
                className="button"
                disabled={importSaving}
              >
                {importSaving ? "Importando..." : "Importar Curso"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
