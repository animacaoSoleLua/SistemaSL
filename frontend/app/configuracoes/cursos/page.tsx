"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getErrorMessage, getMember } from "../../../lib/api";
import { getStoredUser } from "../../../lib/auth";

interface CourseItem {
  id: string;
  title: string;
  course_date: string;
  status: "enrolled" | "attended" | "missed";
}

export default function ConfiguracoesCursos() {
  const router = useRouter();
  const [courses, setCourses] = useState<CourseItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const user = getStoredUser();
    if (!user) {
      router.push("/login");
      return;
    }
    const load = async () => {
      try {
        const response = await getMember(user.id);
        setCourses(response.data.courses as CourseItem[]);
      } catch (err: unknown) {
        setError(getErrorMessage(err, "Erro ao carregar cursos."));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [router]);

  const formatDateBR = (value: string) => {
    const [year, month, day] = value.split("-");
    if (!year || !month || !day) return value;
    return `${day}/${month}/${year}`;
  };

  const formatStatus = (status: "enrolled" | "attended" | "missed") => {
    if (status === "attended") return "Presente";
    if (status === "missed") return "Faltou";
    return "Inscrito";
  };

  if (loading) return <div className="empty-state"><p>Carregando...</p></div>;
  if (error) return <div className="empty-state"><p className="text-red-500">{error}</p></div>;

  return (
    <section className="report-panel">
      <div className="report-header">
        <div>
          <h2 className="section-title">Meus cursos</h2>
          <p>Total de cursos: {courses?.length ?? 0}</p>
        </div>
      </div>
      {courses && courses.length > 0 ? (
        <div className="warning-list">
          <article className="warning-card">
            <div className="warning-header">
              <div className="warning-meta">
                <strong className="warning-name">Cursos inscritos</strong>
                <span className="warning-count">{courses.length} curso(s)</span>
              </div>
            </div>
            <ul className="warning-items" style={{ maxHeight: "500px", overflowY: "auto" }}>
              {courses.map((course) => (
                <li key={course.id} className="warning-item">
                  <span className="warning-date">{formatDateBR(course.course_date)}</span>
                  <span className="warning-desc">{course.title} · {formatStatus(course.status)}</span>
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
  );
}
