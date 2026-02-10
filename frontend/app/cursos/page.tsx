"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createCourse,
  deleteCourse,
  enrollInCourse,
  getCourse,
  getCourses,
  getMember,
  getMembers,
  updateCourse,
} from "../../lib/api";
import {
  getDefaultRoute,
  getStoredUser,
  isRoleAllowed,
  type Role,
  type StoredUser,
} from "../../lib/auth";

interface Course {
  id: string;
  title: string;
  course_date: string;
  capacity: number;
  created_by: string;
  instructor: { id: string; name: string };
  enrolled_count: number;
  available_spots: number;
}

interface CourseDetails {
  id: string;
  title: string;
  description?: string | null;
  course_date: string;
  location?: string | null;
  capacity: number;
  instructor: { id: string; name: string };
}

export default function CursosPage() {
  const router = useRouter();
  const modalTitleId = useId();
  const modalDescriptionId = useId();
  const deleteModalTitleId = useId();
  const deleteModalDescriptionId = useId();
  const [currentRole, setCurrentRole] = useState<Role | null>(null);
  const [currentUser, setCurrentUser] = useState<StoredUser | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrolledCourses, setEnrolledCourses] = useState<
    Record<string, "enrolled" | "attended" | "missed">
  >({});
  const [statusFilter, setStatusFilter] = useState<"available" | "full" | "all">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [enrollingId, setEnrollingId] = useState<string | null>(null);
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
  const [instructorId, setInstructorId] = useState("");
  const [members, setMembers] = useState<Array<{ id: string; name: string }>>([]);
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
  const [error, setError] = useState<string | null>(null);

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
    if (!currentUser) return;
    getMember(currentUser.id)
      .then((data) => {
        const coursesData = (data.data?.courses ?? []) as Array<{
          id: string;
          status: "enrolled" | "attended" | "missed";
        }>;
        const next: Record<string, "enrolled" | "attended" | "missed"> = {};
        coursesData.forEach((course) => {
          if (course?.id) {
            next[course.id] = course.status;
          }
        });
        setEnrolledCourses(next);
      })
      .catch(() => {
        setEnrolledCourses({});
      });
  }, [currentUser]);

  useEffect(() => {
    if (!modalOpen) return;
    if (members.length > 0) return;
    setMembersLoading(true);
    getMembers({ limit: 200 })
      .then((data) => {
        const list = (data.data ?? []) as Array<{ id: string; name: string }>;
        setMembers(list);
        if (!instructorId && list.length > 0) {
          setInstructorId(list[0].id);
        }
      })
      .catch(() => {
        setMembers([]);
      })
      .finally(() => {
        setMembersLoading(false);
      });
  }, [modalOpen, members.length, instructorId]);

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
    if (course.available_spots <= 0) {
      setNotice({ type: "info", message: "Turma cheia no momento." });
      return;
    }
    setEnrollingId(course.id);
    setNotice(null);
    try {
      await enrollInCourse(course.id, currentUser.id);
      setNotice({ type: "success", message: "Vaga reservada com sucesso." });
      const data = await getCourses({ status: statusFilter });
      setCourses(data.data);
      const profile = await getMember(currentUser.id);
      const coursesData = (profile.data?.courses ?? []) as Array<{
        id: string;
        status: "enrolled" | "attended" | "missed";
      }>;
      const next: Record<string, "enrolled" | "attended" | "missed"> = {};
      coursesData.forEach((entry) => {
        if (entry?.id) {
          next[entry.id] = entry.status;
        }
      });
      setEnrolledCourses(next);
    } catch (err: any) {
      setNotice({
        type: "error",
        message: err.message || "Não foi possível pegar a vaga.",
      });
    } finally {
      setEnrollingId(null);
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
      setCourseDate(data.course_date ?? "");
      setCourseTime("08:00");
      setLocation(data.location ?? "");
      setCapacity(String(data.capacity ?? ""));
      setInstructorId(data.instructor?.id ?? "");
    } catch (err: any) {
      setNotice({
        type: "error",
        message: err.message || "Não foi possível carregar o curso.",
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
    } catch (err: any) {
      setViewError(err.message || "Não foi possível carregar os detalhes do curso.");
    } finally {
      setViewLoading(false);
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

  const handleCreateCourse = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setFormError(null);

    const parsedCapacity = Number(capacity);
    if (!Number.isInteger(parsedCapacity) || parsedCapacity <= 0) {
      setFormError("Informe um número válido de vagas.");
      setSaving(false);
      return;
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
          capacity: parsedCapacity,
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
    } catch (err: any) {
      setFormError(err.message || "Erro ao salvar curso.");
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
    } catch (err: any) {
      setNotice({
        type: "error",
        message: err.message || "Não foi possível apagar o curso.",
      });
    } finally {
      setDeletingId(null);
      setDeleteTarget(null);
    }
  };

  const filteredCourses = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return courses;
    return courses.filter((course) => course.title.toLowerCase().includes(term));
  }, [courses, searchTerm]);

  const stats = useMemo(() => {
    const totalCourses = courses.length;
    const totalSpots = courses.reduce((acc, course) => acc + course.capacity, 0);
    const availableCourses = courses.filter((course) => course.available_spots > 0).length;
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
            <button className="button" type="button" onClick={openModal}>
              + Novo Curso
            </button>
          )}
        </header>

        <section className="stats">
          <article className="stat">
            <span>Total de cursos</span>
            <strong>{stats.totalCourses}</strong>
          </article>
          <article className="stat">
            <span>Vagas ofertadas</span>
            <strong>{stats.totalSpots}</strong>
          </article>
          <article className="stat">
            <span>Turmas com vagas</span>
            <strong>{stats.availableCourses}</strong>
          </article>
        </section>

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
                    setStatusFilter(e.target.value as "available" | "full" | "all")
                  }
                  aria-label="Filtrar cursos por status"
                >
                  <option value="all">Todas as turmas</option>
                  <option value="available">Com vagas</option>
                  <option value="full">Lotadas</option>
                </select>
              </label>
            </div>
          </div>

          {notice && (
            <div className={`alert-card ${notice.type}`}>
              <span className="alert-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 5a1.2 1.2 0 1 1 0 2.4A1.2 1.2 0 0 1 12 7zm1.5 10h-3v-2h1v-3h-1V10h3v5h1v2z" />
                </svg>
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
            <div className="empty-state">
              <p>Carregando cursos...</p>
            </div>
          ) : error ? (
            <div className="empty-state">
              <p className="text-red-500">Erro ao carregar cursos: {error}</p>
            </div>
          ) : filteredCourses.length > 0 ? (
            <div className="report-list">
              {filteredCourses.map((course) => {
                const enrolledStatus = enrolledCourses[course.id];
                const isRestricted =
                  currentUser &&
                  (currentUser.id === course.created_by ||
                    currentUser.id === course.instructor?.id);
                const canManageCourse =
                  currentUser &&
                  (currentRole === "admin" || course.created_by === currentUser.id);
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
                        Vagas: {course.enrolled_count}/{course.capacity}
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
                      <span
                        className={`status-pill ${
                          course.available_spots > 0 ? "active" : "inactive"
                        }`}
                      >
                        {course.available_spots > 0
                          ? `${course.available_spots} vagas`
                          : "Lotado"}
                      </span>
                      {(currentRole === "animador" ||
                        currentRole === "recreador") && (
                        <button
                          type="button"
                          className="button secondary"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleEnroll(course);
                          }}
                          disabled={
                            course.available_spots <= 0 ||
                            enrollingId === course.id ||
                            !!enrolledStatus ||
                            !!isRestricted
                          }
                        >
                          {enrolledStatus
                            ? "Inscrito"
                            : isRestricted
                            ? "Indisponível"
                            : course.available_spots <= 0
                            ? "Turma cheia"
                            : enrollingId === course.id
                            ? "Reservando..."
                            : "Pegar vaga"}
                        </button>
                      )}
                      {canManageCourse && (
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
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">
              <span className="empty-state-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M7 4h10l2 4v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V8l2-4zm0 0h10" />
                </svg>
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
          <div className="modal-card">
            <header className="modal-header">
              <div>
                <strong id={deleteModalTitleId}>Apagar curso</strong>
                <p className="helper" id={deleteModalDescriptionId}>
                  Esta ação não pode ser desfeita. Curso:{" "}
                  <strong>{deleteTarget.title}</strong>
                </p>
              </div>
              <button
                className="button secondary"
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deletingId === deleteTarget.id}
              >
                Fechar
              </button>
            </header>
            <div className="modal-body">
              <p className="helper">
                Ao apagar, o curso sai da lista e as inscrições são removidas.
              </p>
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
          <div className="modal-card">
            <header className="modal-header">
              <div>
                <strong id={`${modalTitleId}-view`}>Detalhes do curso</strong>
                <p className="helper" id={`${modalDescriptionId}-view`}>
                  Visualização somente de leitura.
                </p>
              </div>
              <button className="button secondary" type="button" onClick={closeViewModal}>
                Fechar
              </button>
            </header>
            <div className="modal-body">
              {viewLoading ? (
                <p>Carregando detalhes...</p>
              ) : viewError ? (
                <p className="text-red-500">{viewError}</p>
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
                        ? `${viewCourse.enrolled_count}/${viewCourse.capacity}`
                        : viewDetails?.capacity ?? "-"}
                    </p>
                  </div>
                  <div className="field">
                    <span>Disponíveis</span>
                    <p className="helper">
                      {viewCourse?.available_spots ?? "-"}
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
              <button className="button secondary" type="button" onClick={closeViewModal}>
                Fechar
              </button>
            </div>
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
          <div className="modal-card">
            <header className="modal-header">
              <div>
                <strong id={modalTitleId}>
                  {editingCourseId ? "Editar curso" : "Novo curso"}
                </strong>
                <p className="helper" id={modalDescriptionId}>
                  Preencha apenas as informações essenciais.
                </p>
              </div>
              <button className="button secondary" type="button" onClick={closeModal}>
                Fechar
              </button>
            </header>
            <form className="modal-body" onSubmit={handleCreateCourse}>
              <div className="form-grid">
                <label className="field full">
                  <span>Título do curso</span>
                  <input
                    className="input"
                    type="text"
                    placeholder="Ex: Curso de Pintura de Rosto"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    disabled={saving || editingLoading}
                  />
                </label>
                <label className="field full">
                  <span>Descrição (opcional)</span>
                  <textarea
                    className="input"
                    rows={3}
                    placeholder="Resumo do conteúdo do curso"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={saving || editingLoading}
                  />
                </label>
                <label className="field full">
                  <span>Instrutor</span>
                  <select
                    className="input"
                    value={instructorId}
                    onChange={(e) => setInstructorId(e.target.value)}
                    required
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
                <label className="field">
                  <span>Data do curso</span>
                  <input
                    className="input"
                    type="date"
                    value={courseDate}
                    onChange={(e) => setCourseDate(e.target.value)}
                    required
                    disabled={saving || editingLoading}
                  />
                </label>
                <label className="field">
                  <span>Hora do curso</span>
                  <input
                    className="input"
                    type="time"
                    value={courseTime}
                    onChange={(e) => setCourseTime(e.target.value)}
                    required
                    disabled={saving || editingLoading}
                  />
                </label>
                <label className="field">
                  <span>Quantidade de vagas</span>
                  <input
                    className="input"
                    type="number"
                    min={1}
                    placeholder="Ex: 25"
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    required
                    disabled={saving || editingLoading}
                  />
                </label>
                <label className="field full">
                  <span>Local</span>
                  <input
                    className="input"
                    type="text"
                    placeholder="Endereço do local"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    disabled={saving || editingLoading}
                  />
                </label>
              </div>
              {formError && <p className="text-red-500">{formError}</p>}
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
    </main>
  );
}
