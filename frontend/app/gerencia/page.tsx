"use client";

import "./page.css";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FiBookOpen,
  FiDownload,
  FiFileText,
  FiUserX,
  FiUsers,
} from "react-icons/fi";
import { getCourses, getMembers, getReports } from "../../lib/api";
import {
  getDefaultRoute,
  getStoredUser,
  isRoleAllowed,
  type Role,
} from "../../lib/auth";

const allowedRoles: Role[] = ["admin"];

interface MemberItem {
  id: string;
  name: string;
  last_name?: string | null;
  cpf?: string | null;
  birth_date?: string | null;
  role: string;
}

interface ReportItem {
  id: string;
  event_date: string;
  contractor_name: string;
  title_schedule?: string | null;
  author_name?: string | null;
}

interface CourseItem {
  id: string;
  title: string;
  course_date: string;
  instructor: { id: string; name: string };
  capacity?: number | null;
  enrolled_count: number;
}

const MONTH_NAMES = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  animador: "Animador",
  recreador: "Recreador",
};

function getMonthBounds(month: number, year: number) {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { start, end };
}

function formatPeriodLabel(month: number, year: number) {
  return `${MONTH_NAMES[month - 1]}/${year}`;
}

function formatDateBR(value: string) {
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("pt-BR");
}

function calcAge(birthDate: string): number {
  const today = new Date();
  const birth = new Date(`${birthDate}T00:00:00`);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

async function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function GerenciaPage() {
  const router = useRouter();
  const [canLoad, setCanLoad] = useState(false);

  // Summary cards
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [totalMembers, setTotalMembers] = useState(0);
  const [minorCount, setMinorCount] = useState(0);
  const [reportsThisMonth, setReportsThisMonth] = useState(0);
  const [coursesThisMonth, setCoursesThisMonth] = useState(0);

  // Members section
  const [membersLoading, setMembersLoading] = useState(false);
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [membersRoleFilter, setMembersRoleFilter] = useState("all");
  const [generatingMembersPdf, setGeneratingMembersPdf] = useState(false);

  // Reports section
  const now = new Date();
  const [reportsMonth, setReportsMonth] = useState(now.getMonth() + 1);
  const [reportsYear, setReportsYear] = useState(now.getFullYear());
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportItems, setReportItems] = useState<ReportItem[]>([]);
  const [generatingReportsPdf, setGeneratingReportsPdf] = useState(false);

  // Courses section
  const [coursesMonth, setCoursesMonth] = useState(now.getMonth() + 1);
  const [coursesYear, setCoursesYear] = useState(now.getFullYear());
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [courseItems, setCourseItems] = useState<CourseItem[]>([]);
  const [generatingCoursesPdf, setGeneratingCoursesPdf] = useState(false);

  const currentYear = now.getFullYear();
  const years = Array.from({ length: currentYear - 2022 + 2 }, (_, i) => 2022 + i);

  // Auth check
  useEffect(() => {
    const user = getStoredUser();
    if (!user) {
      router.replace("/login");
      return;
    }
    if (!isRoleAllowed(user.role, allowedRoles)) {
      router.replace(getDefaultRoute(user.role));
      return;
    }
    setCanLoad(true);
  }, [router]);

  // Summary cards: load once on mount
  useEffect(() => {
    if (!canLoad) return;
    setSummaryLoading(true);
    const { start, end } = getMonthBounds(now.getMonth() + 1, now.getFullYear());
    Promise.all([
      getMembers({ limit: 1000 }),
      getReports({ period_start: start, period_end: end, limit: 1000 }),
      getCourses({ status: "all", period_start: start, period_end: end, limit: 1000 }),
    ])
      .then(([membersRes, reportsRes, coursesRes]) => {
        const allMembers: MemberItem[] = membersRes.data ?? [];
        setTotalMembers(allMembers.length);
        setMinorCount(
          allMembers.filter((m) => m.birth_date && calcAge(m.birth_date) < 18).length
        );
        setReportsThisMonth((reportsRes.data ?? []).length);
        setCoursesThisMonth((coursesRes.data ?? []).length);
      })
      .finally(() => setSummaryLoading(false));
  }, [canLoad]); // eslint-disable-line react-hooks/exhaustive-deps

  // Members section: reload when role filter changes
  useEffect(() => {
    if (!canLoad) return;
    setMembersLoading(true);
    getMembers({
      role: membersRoleFilter === "all" ? undefined : membersRoleFilter,
      limit: 1000,
    })
      .then((res) => setMembers(res.data ?? []))
      .finally(() => setMembersLoading(false));
  }, [canLoad, membersRoleFilter]);

  // Reports section: reload when month/year changes
  useEffect(() => {
    if (!canLoad) return;
    setReportsLoading(true);
    const { start, end } = getMonthBounds(reportsMonth, reportsYear);
    getReports({ period_start: start, period_end: end, limit: 1000 })
      .then((res) => setReportItems(res.data ?? []))
      .finally(() => setReportsLoading(false));
  }, [canLoad, reportsMonth, reportsYear]);

  // Courses section: reload when month/year changes
  useEffect(() => {
    if (!canLoad) return;
    setCoursesLoading(true);
    const { start, end } = getMonthBounds(coursesMonth, coursesYear);
    getCourses({ status: "all", period_start: start, period_end: end, limit: 1000 })
      .then((res) => setCourseItems(res.data ?? []))
      .finally(() => setCoursesLoading(false));
  }, [canLoad, coursesMonth, coursesYear]);

  const handleGenerateMembersPdf = async () => {
    setGeneratingMembersPdf(true);
    try {
      const [{ pdf }, { MembersPdf }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("./pdf/MembersPdf"),
      ]);
      const roleLabel =
        membersRoleFilter === "all"
          ? "todos"
          : (ROLE_LABELS[membersRoleFilter] ?? membersRoleFilter).toLowerCase();
      const blob = await pdf(
        <MembersPdf
          members={members}
          roleFilter={membersRoleFilter}
          generatedAt={new Date().toLocaleString("pt-BR")}
        />
      ).toBlob();
      await triggerDownload(blob, `membros-${roleLabel}.pdf`);
    } finally {
      setGeneratingMembersPdf(false);
    }
  };

  const handleGenerateReportsPdf = async () => {
    setGeneratingReportsPdf(true);
    try {
      const [{ pdf }, { ReportsPdf }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("./pdf/ReportsPdf"),
      ]);
      const period = formatPeriodLabel(reportsMonth, reportsYear);
      const blob = await pdf(
        <ReportsPdf
          reports={reportItems}
          period={period}
          generatedAt={new Date().toLocaleString("pt-BR")}
        />
      ).toBlob();
      await triggerDownload(blob, `relatorios-${period.toLowerCase().replace("/", "-")}.pdf`);
    } finally {
      setGeneratingReportsPdf(false);
    }
  };

  const handleGenerateCoursesPdf = async () => {
    setGeneratingCoursesPdf(true);
    try {
      const [{ pdf }, { CoursesPdf }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("./pdf/CoursesPdf"),
      ]);
      const period = formatPeriodLabel(coursesMonth, coursesYear);
      const blob = await pdf(
        <CoursesPdf
          courses={courseItems}
          period={period}
          generatedAt={new Date().toLocaleString("pt-BR")}
        />
      ).toBlob();
      await triggerDownload(blob, `cursos-${period.toLowerCase().replace("/", "-")}.pdf`);
    } finally {
      setGeneratingCoursesPdf(false);
    }
  };

  if (!canLoad) return null;

  const minorPercent =
    totalMembers > 0 ? Math.round((minorCount / totalMembers) * 100) : 0;

  return (
    <main className="page">
      <div className="gerencia-header">
        <h1 className="gerencia-title">Gerência</h1>
        <p className="gerencia-subtitle">Relatórios gerenciais e indicadores da empresa</p>
      </div>

      {/* Cards de resumo */}
      <div className="gerencia-summary-grid">
        <div className="summary-card">
          <div className="summary-head">
            <span className="summary-label">Total de Membros</span>
            <span className="summary-icon">
              <FiUsers aria-hidden="true" />
            </span>
          </div>
          <div className="summary-value">
            {summaryLoading ? "—" : totalMembers}
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-head">
            <span className="summary-label">Menores de Idade</span>
            <span className="summary-icon">
              <FiUserX aria-hidden="true" />
            </span>
          </div>
          <div className="summary-value">
            {summaryLoading ? "—" : minorCount}
          </div>
          {!summaryLoading && totalMembers > 0 && (
            <span className="summary-note">{minorPercent}% do total</span>
          )}
        </div>

        <div className="summary-card">
          <div className="summary-head">
            <span className="summary-label">Relatórios este Mês</span>
            <span className="summary-icon">
              <FiFileText aria-hidden="true" />
            </span>
          </div>
          <div className="summary-value">
            {summaryLoading ? "—" : reportsThisMonth}
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-head">
            <span className="summary-label">Cursos este Mês</span>
            <span className="summary-icon">
              <FiBookOpen aria-hidden="true" />
            </span>
          </div>
          <div className="summary-value">
            {summaryLoading ? "—" : coursesThisMonth}
          </div>
        </div>
      </div>

      {/* Seção: Membros */}
      <section className="gerencia-section">
        <h2 className="gerencia-section-title">Relação de Membros</h2>
        <div className="gerencia-section-controls">
          <div className="gerencia-filters">
            <select
              className="input"
              value={membersRoleFilter}
              onChange={(e) => setMembersRoleFilter(e.target.value)}
              aria-label="Filtrar por função"
            >
              <option value="all">Todos</option>
              <option value="admin">Admin</option>
              <option value="animador">Animador</option>
              <option value="recreador">Recreador</option>
            </select>
            <span className="gerencia-count">
              {membersLoading ? "Carregando..." : `${members.length} membro(s)`}
            </span>
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleGenerateMembersPdf}
            disabled={generatingMembersPdf || membersLoading || members.length === 0}
          >
            <FiDownload aria-hidden="true" />
            {generatingMembersPdf ? "Gerando..." : "Gerar PDF"}
          </button>
        </div>

        <div className="gerencia-table-wrapper">
          <table className="gerencia-table">
            <thead>
              <tr>
                <th>Nome Completo</th>
                <th>CPF</th>
                <th>Data de Nascimento</th>
                <th>Idade</th>
                <th>Função</th>
              </tr>
            </thead>
            <tbody>
              {membersLoading ? (
                <tr>
                  <td colSpan={5} className="gerencia-empty">Carregando...</td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan={5} className="gerencia-empty">Nenhum membro encontrado.</td>
                </tr>
              ) : (
                members.map((m) => (
                  <tr key={m.id}>
                    <td>{m.name}{m.last_name ? ` ${m.last_name}` : ""}</td>
                    <td>{m.cpf ?? "—"}</td>
                    <td>{m.birth_date ? formatDateBR(m.birth_date) : "—"}</td>
                    <td>{m.birth_date ? calcAge(m.birth_date) : "—"}</td>
                    <td>{ROLE_LABELS[m.role] ?? m.role}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Seção: Relatórios de Eventos */}
      <section className="gerencia-section">
        <h2 className="gerencia-section-title">Relatórios de Eventos por Mês</h2>
        <div className="gerencia-section-controls">
          <div className="gerencia-filters">
            <select
              className="input"
              value={reportsMonth}
              onChange={(e) => setReportsMonth(Number(e.target.value))}
              aria-label="Mês dos relatórios"
            >
              {MONTH_NAMES.map((name, i) => (
                <option key={i + 1} value={i + 1}>{name}</option>
              ))}
            </select>
            <select
              className="input"
              value={reportsYear}
              onChange={(e) => setReportsYear(Number(e.target.value))}
              aria-label="Ano dos relatórios"
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <span className="gerencia-count">
              {reportsLoading ? "Carregando..." : `${reportItems.length} relatório(s)`}
            </span>
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleGenerateReportsPdf}
            disabled={generatingReportsPdf || reportsLoading || reportItems.length === 0}
          >
            <FiDownload aria-hidden="true" />
            {generatingReportsPdf ? "Gerando..." : "Gerar PDF"}
          </button>
        </div>

        <div className="gerencia-table-wrapper">
          <table className="gerencia-table">
            <thead>
              <tr>
                <th>Data do Evento</th>
                <th>Contratante</th>
                <th>Título do Roteiro</th>
                <th>Autor</th>
              </tr>
            </thead>
            <tbody>
              {reportsLoading ? (
                <tr>
                  <td colSpan={4} className="gerencia-empty">Carregando...</td>
                </tr>
              ) : reportItems.length === 0 ? (
                <tr>
                  <td colSpan={4} className="gerencia-empty">Nenhum relatório encontrado neste período.</td>
                </tr>
              ) : (
                reportItems.map((r) => (
                  <tr key={r.id}>
                    <td>{formatDateBR(r.event_date)}</td>
                    <td>{r.contractor_name}</td>
                    <td>{r.title_schedule ?? "—"}</td>
                    <td>{r.author_name ?? "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Seção: Cursos */}
      <section className="gerencia-section">
        <h2 className="gerencia-section-title">Cursos por Mês</h2>
        <div className="gerencia-section-controls">
          <div className="gerencia-filters">
            <select
              className="input"
              value={coursesMonth}
              onChange={(e) => setCoursesMonth(Number(e.target.value))}
              aria-label="Mês dos cursos"
            >
              {MONTH_NAMES.map((name, i) => (
                <option key={i + 1} value={i + 1}>{name}</option>
              ))}
            </select>
            <select
              className="input"
              value={coursesYear}
              onChange={(e) => setCoursesYear(Number(e.target.value))}
              aria-label="Ano dos cursos"
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <span className="gerencia-count">
              {coursesLoading ? "Carregando..." : `${courseItems.length} curso(s)`}
            </span>
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleGenerateCoursesPdf}
            disabled={generatingCoursesPdf || coursesLoading || courseItems.length === 0}
          >
            <FiDownload aria-hidden="true" />
            {generatingCoursesPdf ? "Gerando..." : "Gerar PDF"}
          </button>
        </div>

        <div className="gerencia-table-wrapper">
          <table className="gerencia-table">
            <thead>
              <tr>
                <th>Curso</th>
                <th>Data</th>
                <th>Instrutor</th>
                <th>Inscritos / Vagas</th>
              </tr>
            </thead>
            <tbody>
              {coursesLoading ? (
                <tr>
                  <td colSpan={4} className="gerencia-empty">Carregando...</td>
                </tr>
              ) : courseItems.length === 0 ? (
                <tr>
                  <td colSpan={4} className="gerencia-empty">Nenhum curso encontrado neste período.</td>
                </tr>
              ) : (
                courseItems.map((c) => (
                  <tr key={c.id}>
                    <td>{c.title}</td>
                    <td>{formatDateBR(c.course_date)}</td>
                    <td>{c.instructor.name}</td>
                    <td>{c.enrolled_count} / {c.capacity ?? "Ilimitado"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
