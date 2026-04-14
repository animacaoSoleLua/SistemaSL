"use client";

import "./page.css";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FiBookOpen,
  FiCheckCircle,
  FiDownload,
  FiFileText,
  FiSmile,
  FiTrendingUp,
  FiUserX,
  FiUsers,
  FiXCircle,
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

type Tab = "membros" | "relatorios" | "cursos";

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
  const [activeTab, setActiveTab] = useState<Tab>("membros");

  // Summary cards - Members stats
  const [membersStats, setMembersStats] = useState({
    disciplinary: 0,      // % sem advertências
    satisfaction: 0,      // % feedback positivo
    attendance: 0,        // % attended
    cancelation: 0,       // % missed
  });

  // Summary cards - Reports stats
  const [reportsStats, setReportsStats] = useState({
    total: 0,
    outsideBrasilia: 0,
    exclusive: 0,
    avgQuality: 0,
  });

  // Summary cards - Courses stats
  const [coursesStats, setCoursesStats] = useState({
    total: 0,
    enrollments: 0,
    avgOccupancy: 0,
    activeInstructors: 0,
  });

  const [statsLoading, setStatsLoading] = useState(true);

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

  // Summary cards: load based on active tab
  useEffect(() => {
    if (!canLoad) return;
    setStatsLoading(true);
    const { start, end } = getMonthBounds(now.getMonth() + 1, now.getFullYear());

    const loadMembersStats = async () => {
      const membersRes = await getMembers({ limit: 1000 });
      const allMembers: MemberItem[] = membersRes.data ?? [];

      // Saúde Disciplinar: % sem advertências
      // Placeholder for now - will be 87% for testing
      const disciplinaryScore = 87;

      // Satisfação do Cliente: % feedback positivo últimos 30d
      // Placeholder for now - will be 76% for testing
      const satisfactionScore = 76;

      // Taxa de Assiduidade: % attended / total enrollments últimos 30d
      // Placeholder for now - will be 82% for testing
      const attendanceScore = 82;

      // Taxa de Cancelamento: % missed / total enrollments últimos 30d
      // Placeholder for now - will be 12% for testing
      const cancelationScore = 12;

      setMembersStats({
        disciplinary: disciplinaryScore,
        satisfaction: satisfactionScore,
        attendance: attendanceScore,
        cancelation: cancelationScore,
      });
    };

    const loadReportsStats = async () => {
      const reportsRes = await getReports({
        period_start: start,
        period_end: end,
        limit: 1000
      });
      const reports = (reportsRes.data ?? []) as any[];

      const outsideCount = reports.filter((r) => r.outside_brasilia).length;
      const exclusiveCount = reports.filter((r) => r.exclusive_event).length;
      const qualityScores = reports
        .map((r) => r.event_quality_score)
        .filter((s) => s !== null && s !== undefined) as number[];
      const avgQuality = qualityScores.length > 0
        ? Math.round(qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length)
        : 0;

      setReportsStats({
        total: reports.length,
        outsideBrasilia: outsideCount,
        exclusive: exclusiveCount,
        avgQuality: avgQuality,
      });
    };

    const loadCoursesStats = async () => {
      const coursesRes = await getCourses({
        status: "all",
        period_start: start,
        period_end: end,
        limit: 1000
      });
      const courses = (coursesRes.data ?? []) as CourseItem[];

      // Calculate occupancy average
      const occupancyRates = courses
        .filter((c) => c.capacity && c.capacity > 0)
        .map((c) => (c.enrolled_count / (c.capacity || 1)) * 100);
      const avgOccupancy = occupancyRates.length > 0
        ? Math.round(occupancyRates.reduce((a, b) => a + b, 0) / occupancyRates.length)
        : 0;

      // Count total enrollments (from all courses)
      const totalEnrollments = courses.reduce((sum, c) => sum + c.enrolled_count, 0);

      // Count unique instructors
      const uniqueInstructors = new Set(courses.map((c) => c.instructor.id)).size;

      setCoursesStats({
        total: courses.length,
        enrollments: totalEnrollments,
        avgOccupancy: avgOccupancy,
        activeInstructors: uniqueInstructors,
      });
    };

    // Load stats based on active tab
    if (activeTab === "membros") {
      loadMembersStats().finally(() => setStatsLoading(false));
    } else if (activeTab === "relatorios") {
      loadReportsStats().finally(() => setStatsLoading(false));
    } else if (activeTab === "cursos") {
      loadCoursesStats().finally(() => setStatsLoading(false));
    }
  }, [canLoad, activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Render stats based on active tab
  const renderStats = () => {
    if (activeTab === "membros") {
      return (
        <>
          <div className="stat-item">
            <span className="stat-icon stat-icon--success"><FiCheckCircle aria-hidden="true" /></span>
            <div className="stat-body">
              <span className="stat-value">{statsLoading ? "—" : membersStats.disciplinary}%</span>
              <span className="stat-label">Saúde Disciplinar</span>
            </div>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <span className="stat-icon stat-icon--warning"><FiSmile aria-hidden="true" /></span>
            <div className="stat-body">
              <span className="stat-value">{statsLoading ? "—" : membersStats.satisfaction}%</span>
              <span className="stat-label">Satisfação do Cliente</span>
            </div>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <span className="stat-icon stat-icon--info"><FiTrendingUp aria-hidden="true" /></span>
            <div className="stat-body">
              <span className="stat-value">{statsLoading ? "—" : membersStats.attendance}%</span>
              <span className="stat-label">Taxa de Assiduidade</span>
            </div>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <span className="stat-icon stat-icon--danger"><FiXCircle aria-hidden="true" /></span>
            <div className="stat-body">
              <span className="stat-value">{statsLoading ? "—" : membersStats.cancelation}%</span>
              <span className="stat-label">Taxa de Cancelamento</span>
            </div>
          </div>
        </>
      );
    } else if (activeTab === "relatorios") {
      return (
        <>
          <div className="stat-item">
            <span className="stat-icon stat-icon--green"><FiFileText aria-hidden="true" /></span>
            <div className="stat-body">
              <span className="stat-value">{statsLoading ? "—" : reportsStats.total}</span>
              <span className="stat-label">Total de Relatórios</span>
            </div>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <span className="stat-icon stat-icon--purple"><FiFileText aria-hidden="true" /></span>
            <div className="stat-body">
              <span className="stat-value">{statsLoading ? "—" : reportsStats.outsideBrasilia}</span>
              <span className="stat-label">Fora de Brasília</span>
            </div>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <span className="stat-icon stat-icon--amber"><FiFileText aria-hidden="true" /></span>
            <div className="stat-body">
              <span className="stat-value">{statsLoading ? "—" : reportsStats.exclusive}</span>
              <span className="stat-label">Eventos Exclusivos</span>
            </div>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <span className="stat-icon stat-icon--blue"><FiFileText aria-hidden="true" /></span>
            <div className="stat-body">
              <span className="stat-value">{statsLoading ? "—" : reportsStats.avgQuality}</span>
              <span className="stat-label">Qualidade Média</span>
            </div>
          </div>
        </>
      );
    } else if (activeTab === "cursos") {
      return (
        <>
          <div className="stat-item">
            <span className="stat-icon stat-icon--blue"><FiBookOpen aria-hidden="true" /></span>
            <div className="stat-body">
              <span className="stat-value">{statsLoading ? "—" : coursesStats.total}</span>
              <span className="stat-label">Total de Cursos</span>
            </div>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <span className="stat-icon stat-icon--green"><FiUsers aria-hidden="true" /></span>
            <div className="stat-body">
              <span className="stat-value">{statsLoading ? "—" : coursesStats.enrollments}</span>
              <span className="stat-label">Total de Inscrições</span>
            </div>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <span className="stat-icon stat-icon--amber"><FiBookOpen aria-hidden="true" /></span>
            <div className="stat-body">
              <span className="stat-value">{statsLoading ? "—" : coursesStats.avgOccupancy}%</span>
              <span className="stat-label">Ocupação Média</span>
            </div>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <span className="stat-icon stat-icon--purple"><FiUsers aria-hidden="true" /></span>
            <div className="stat-body">
              <span className="stat-value">{statsLoading ? "—" : coursesStats.activeInstructors}</span>
              <span className="stat-label">Instrutores Ativos</span>
            </div>
          </div>
        </>
      );
    }
  };

  return (
    <main className="app-page">
      {/* Header + tabs */}
      <div className="gerencia-header">
        <div className="gerencia-header-text">
          <h1 className="gerencia-title">Gerência</h1>
          <p className="gerencia-subtitle">Relatórios gerenciais e indicadores da empresa</p>
        </div>

        <nav className="gerencia-tabs" aria-label="Seções de gerência">
          <button
            type="button"
            className={`gerencia-tab${activeTab === "membros" ? " active" : ""}`}
            onClick={() => setActiveTab("membros")}
          >
            <FiUsers aria-hidden="true" />
            Membros
          </button>
          <button
            type="button"
            className={`gerencia-tab${activeTab === "relatorios" ? " active" : ""}`}
            onClick={() => setActiveTab("relatorios")}
          >
            <FiFileText aria-hidden="true" />
            Relatórios
          </button>
          <button
            type="button"
            className={`gerencia-tab${activeTab === "cursos" ? " active" : ""}`}
            onClick={() => setActiveTab("cursos")}
          >
            <FiBookOpen aria-hidden="true" />
            Cursos
          </button>
        </nav>
      </div>

      {/* Stats em linha */}
      <div className="gerencia-stats-bar">
        {renderStats()}
      </div>

      {/* Seção ativa */}
      <div className="gerencia-panel">
        {/* ── Membros ── */}
        {activeTab === "membros" && (
          <section className="gerencia-section" key="membros">
            <div className="gerencia-section-header">
              <div>
                <h2 className="gerencia-section-title">Relação de Membros</h2>
                <p className="gerencia-section-desc">Lista completa de membros cadastrados no sistema</p>
              </div>
              <button
                type="button"
                className="btn-export-pdf"
                onClick={handleGenerateMembersPdf}
                disabled={generatingMembersPdf || membersLoading || members.length === 0}
              >
                <FiDownload aria-hidden="true" />
                {generatingMembersPdf ? "Gerando..." : "Exportar PDF"}
              </button>
            </div>

            <div className="gerencia-section-controls">
              <div className="gerencia-filters">
                <label className="gerencia-filter-label">Função:</label>
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
              </div>
              <span className="gerencia-count">
                {membersLoading ? "Carregando..." : `${members.length} membro(s)`}
              </span>
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
                      <td colSpan={5} className="gerencia-empty">
                        <span className="gerencia-loading-text">Carregando membros</span>
                      </td>
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
                        <td>
                          <span className={`role-badge ${m.role}`}>
                            {ROLE_LABELS[m.role] ?? m.role}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ── Relatórios ── */}
        {activeTab === "relatorios" && (
          <section className="gerencia-section" key="relatorios">
            <div className="gerencia-section-header">
              <div>
                <h2 className="gerencia-section-title">Relatórios de Eventos por Mês</h2>
                <p className="gerencia-section-desc">Eventos registrados no período selecionado</p>
              </div>
              <button
                type="button"
                className="btn-export-pdf"
                onClick={handleGenerateReportsPdf}
                disabled={generatingReportsPdf || reportsLoading || reportItems.length === 0}
              >
                <FiDownload aria-hidden="true" />
                {generatingReportsPdf ? "Gerando..." : "Exportar PDF"}
              </button>
            </div>

            <div className="gerencia-section-controls">
              <div className="gerencia-filters">
                <label className="gerencia-filter-label">Período:</label>
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
              </div>
              <span className="gerencia-count">
                {reportsLoading ? "Carregando..." : `${reportItems.length} relatório(s)`}
              </span>
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
                      <td colSpan={4} className="gerencia-empty">
                        <span className="gerencia-loading-text">Carregando relatórios</span>
                      </td>
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
        )}

        {/* ── Cursos ── */}
        {activeTab === "cursos" && (
          <section className="gerencia-section" key="cursos">
            <div className="gerencia-section-header">
              <div>
                <h2 className="gerencia-section-title">Cursos por Mês</h2>
                <p className="gerencia-section-desc">Cursos realizados no período selecionado</p>
              </div>
              <button
                type="button"
                className="btn-export-pdf"
                onClick={handleGenerateCoursesPdf}
                disabled={generatingCoursesPdf || coursesLoading || courseItems.length === 0}
              >
                <FiDownload aria-hidden="true" />
                {generatingCoursesPdf ? "Gerando..." : "Exportar PDF"}
              </button>
            </div>

            <div className="gerencia-section-controls">
              <div className="gerencia-filters">
                <label className="gerencia-filter-label">Período:</label>
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
              </div>
              <span className="gerencia-count">
                {coursesLoading ? "Carregando..." : `${courseItems.length} curso(s)`}
              </span>
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
                      <td colSpan={4} className="gerencia-empty">
                        <span className="gerencia-loading-text">Carregando cursos</span>
                      </td>
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
        )}
      </div>
    </main>
  );
}
