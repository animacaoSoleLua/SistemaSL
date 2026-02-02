"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getCourses } from "../../lib/api";
import { getDefaultRoute, getStoredUser, isRoleAllowed, type Role } from "../../lib/auth";

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
  const [courses, setCourses] = useState<Course[]>([]);
  const [statusFilter, setStatusFilter] = useState<"available" | "full" | "all">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const user = getStoredUser();
    if (!user) {
      router.push("/login");
      return;
    }
    if (!isRoleAllowed(user.role, ["admin", "animador"])) {
      router.push(getDefaultRoute(user.role));
      return;
    }
    setCurrentRole(user.role);
  }, [router]);

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

  return (
    <main className="app-page">
      <section className="shell reveal">
        <header className="page-header">
          <div>
            <h1 className="hero-title">Cursos</h1>
            <p className="hero-copy">Acompanhe turmas, vagas e datas principais.</p>
          </div>
          {currentRole === "admin" && (
            <Link className="button" href="/novo-curso">
              + Novo Curso
            </Link>
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
              {filteredCourses.map((course) => (
                <article className="report-item" key={course.id}>
                  <div className="report-meta">
                    <strong className="report-name">{course.title}</strong>
                    <span className="report-date">Data: {course.course_date}</span>
                    <span className="report-date">
                      Vagas: {course.enrolled_count}/{course.capacity}
                    </span>
                  </div>
                  <div className="course-actions">
                    <span
                      className={`status-pill ${
                        course.available_spots > 0 ? "active" : "inactive"
                      }`}
                    >
                      {course.available_spots > 0
                        ? `${course.available_spots} vagas`
                        : "Lotado"}
                    </span>
                  </div>
                </article>
              ))}
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
              {currentRole === "admin" && (
                <Link className="button" href="/novo-curso">
                  + Criar Curso
                </Link>
              )}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
