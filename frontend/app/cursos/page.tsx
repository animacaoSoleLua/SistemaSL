"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createCourse, enrollInCourse, getCourses, getMember } from "../../lib/api";
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
  enrolled_count: number;
  available_spots: number;
}

export default function CursosPage() {
  const router = useRouter();
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
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [courseDate, setCourseDate] = useState("");
  const [courseTime, setCourseTime] = useState("");
  const [location, setLocation] = useState("");
  const [capacity, setCapacity] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{
    type: "success" | "error" | "info";
    message: string;
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
    setTitle("");
    setDescription("");
    setCourseDate("");
    setCourseTime("");
    setLocation("");
    setCapacity("");
    setFormError(null);
  };

  const openModal = () => {
    resetForm();
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSaving(false);
    setFormError(null);
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

    try {
      await createCourse({
        title: title.trim(),
        description: description.trim() || undefined,
        course_date: `${courseDate}T${courseTime}`,
        location: location.trim() || undefined,
        capacity: parsedCapacity,
      });
      setNotice({ type: "success", message: "Curso criado com sucesso." });
      closeModal();
      const data = await getCourses({ status: statusFilter });
      setCourses(data.data);
    } catch (err: any) {
      setFormError(err.message || "Erro ao salvar curso.");
    } finally {
      setSaving(false);
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
                />
              </label>
              <label className="field report-search">
                <select
                  className="input"
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter(e.target.value as "available" | "full" | "all")
                  }
                >
                  <option value="all">Todas as turmas</option>
                  <option value="available">Com vagas</option>
                  <option value="full">Lotadas</option>
                </select>
              </label>
            </div>
          </div>

          {notice && (
            <div className="empty-state">
              <p
                className={
                  notice.type === "error"
                    ? "text-red-500"
                    : notice.type === "success"
                    ? "text-emerald-600"
                    : "text-amber-600"
                }
              >
                {notice.message}
              </p>
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
                return (
                  <article className="report-item" key={course.id}>
                    <div className="report-meta">
                      <strong className="report-name">{course.title}</strong>
                      <span className="report-date">Data: {course.course_date}</span>
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
                          onClick={() => handleEnroll(course)}
                          disabled={
                            course.available_spots <= 0 ||
                            enrollingId === course.id ||
                            !!enrolledStatus
                          }
                        >
                          {enrolledStatus
                            ? "Inscrito"
                            : course.available_spots <= 0
                            ? "Turma cheia"
                            : enrollingId === course.id
                            ? "Reservando..."
                            : "Pegar vaga"}
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

      {modalOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card">
            <header className="modal-header">
              <div>
                <strong>Novo curso</strong>
                <p className="helper">Preencha apenas as informações essenciais.</p>
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
                    disabled={saving}
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
                    disabled={saving}
                  />
                </label>
                <label className="field">
                  <span>Data do curso</span>
                  <input
                    className="input"
                    type="date"
                    value={courseDate}
                    onChange={(e) => setCourseDate(e.target.value)}
                    required
                    disabled={saving}
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
                    disabled={saving}
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
                    disabled={saving}
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
                    disabled={saving}
                  />
                </label>
              </div>
              {formError && <p className="text-red-500">{formError}</p>}
              <div className="modal-footer">
                <button className="button secondary" type="button" onClick={closeModal}>
                  Cancelar
                </button>
                <button className="button" type="submit" disabled={saving}>
                  {saving ? "Salvando..." : "Salvar curso"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
