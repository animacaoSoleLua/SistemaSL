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
  FiVolume2,
  FiXCircle,
} from "react-icons/fi";
import { getCourses, getEnrolledMembers, getFeedbacks, getMembers, getReports, getReportsStats, getWarnings } from "../../lib/api";
import {
  getDefaultRoute,
  getStoredUser,
  isRoleAllowed,
  type Role,
} from "../../lib/auth";
import TooltipIcon from "../../components/TooltipIcon";

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
    uberCostTotal: 0,
    avgSoundQuality: 0,
    avgEventQuality: 0,
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
      try {
        const membersRes = await getMembers({ limit: 1000 });
        const allMembers: MemberItem[] = membersRes.data ?? [];

        // Calculate 30-day window (today - 30 days)
        const thirtyDaysAgo = new Date(now);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().slice(0, 10);

        // 1. Saúde Disciplinar: % members without active warnings
        let disciplinaryScore = 0;
        if (allMembers.length > 0) {
          const warningsRes = await getWarnings({ limit: 1000 });
          const activeWarnings = (warningsRes.data ?? []) as any[];
          const membersWithWarnings = new Set(activeWarnings.map((w) => w.member_id));
          const membersWithoutWarnings = allMembers.length - membersWithWarnings.size;
          disciplinaryScore = Math.round((membersWithoutWarnings / allMembers.length) * 100);
        }

        // 2. Satisfação do Cliente: % positive feedback in last 30 days
        let satisfactionScore = 0;
        const feedbacksRes = await getFeedbacks({ limit: 1000 });
        const allFeedbacks = (feedbacksRes.data ?? []) as any[];
        const feedbacksLast30d = allFeedbacks.filter((f) => {
          const feedbackDate = f.event_date || f.created_at;
          return feedbackDate && feedbackDate >= thirtyDaysAgoStr;
        });
        if (feedbacksLast30d.length > 0) {
          const positiveFeedbacks = feedbacksLast30d.filter((f) => f.type === "positive").length;
          satisfactionScore = Math.round((positiveFeedbacks / feedbacksLast30d.length) * 100);
        }

        // 3 & 4. Taxa de Assiduidade & Cancelamento: from course enrollments last 30 days
        let attendanceScore = 0;
        let cancelationScore = 0;
        const [activeCoursesRes, archivedCoursesRes] = await Promise.all([
          getCourses({ status: "all", limit: 1000 }),
          getCourses({ status: "archived", limit: 1000 }),
        ]);
        const allCourses = [
          ...((activeCoursesRes.data ?? []) as CourseItem[]),
          ...((archivedCoursesRes.data ?? []) as CourseItem[]),
        ];

        let totalEnrollmentsLast30d = 0;
        let attendedCount = 0;
        let missedCount = 0;

        for (const course of allCourses) {
          try {
            const enrollmentsRes = await getEnrolledMembers(course.id);
            const enrollments = (enrollmentsRes ?? []) as any[];

            for (const enrollment of enrollments) {
              const enrollmentDate = enrollment.createdAt || enrollment.created_at;
              if (enrollmentDate && enrollmentDate >= thirtyDaysAgoStr) {
                totalEnrollmentsLast30d++;
                if (enrollment.status === "attended") attendedCount++;
                else if (enrollment.status === "missed") missedCount++;
              }
            }
          } catch (error) {
            console.error(`Failed to fetch enrollments for course ${course.id}:`, error);
          }
        }

        if (totalEnrollmentsLast30d > 0) {
          attendanceScore = Math.round((attendedCount / totalEnrollmentsLast30d) * 100);
          cancelationScore = Math.round((missedCount / totalEnrollmentsLast30d) * 100);
        }

        setMembersStats({
          disciplinary: disciplinaryScore,
          satisfaction: satisfactionScore,
          attendance: attendanceScore,
          cancelation: cancelationScore,
        });
      } catch (error) {
        console.error("Error loading members stats:", error);
      }
    };

    const loadReportsStats = async () => {
      try {
        const json = await getReportsStats(reportsMonth, reportsYear);
        const d = json.data ?? {};
        setReportsStats({
          total: Number(d.total) || 0,
          uberCostTotal: Number(d.uberCostTotal) || 0,
          avgSoundQuality: Number(d.avgSoundQuality) || 0,
          avgEventQuality: Number(d.avgEventQuality) || 0,
        });
      } catch (error) {
        console.error("Error loading reports stats:", error);
        setReportsStats({
          total: 0,
          uberCostTotal: 0,
          avgSoundQuality: 0,
          avgEventQuality: 0,
        });
      }
    };

    const loadCoursesStats = async () => {
      const [activeRes, archivedRes] = await Promise.all([
        getCourses({ status: "all", period_start: start, period_end: end, limit: 1000 }),
        getCourses({ status: "archived", period_start: start, period_end: end, limit: 1000 }),
      ]);
      const courses = [
        ...((activeRes.data ?? []) as CourseItem[]),
        ...((archivedRes.data ?? []) as CourseItem[]),
      ];

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
  }, [canLoad, activeTab, reportsMonth, reportsYear, coursesMonth, coursesYear]);

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
    Promise.all([
      getCourses({ status: "all", period_start: start, period_end: end, limit: 1000 }),
      getCourses({ status: "archived", period_start: start, period_end: end, limit: 1000 }),
    ])
      .then(([activeRes, archivedRes]) =>
        setCourseItems([...(activeRes.data ?? []), ...(archivedRes.data ?? [])])
      )
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
              <span className="stat-label">
                <span className="stat-label-text">Saúde Disciplinar</span>
                <TooltipIcon
                  label="Saúde Disciplinar"
                  content="Porcentagem de membros que não possuem nenhuma advertência ativa no sistema. Calculado em tempo real baseado no registro de advertências."
                  position="top"
                />
              </span>
            </div>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <span className="stat-icon stat-icon--warning"><FiSmile aria-hidden="true" /></span>
            <div className="stat-body">
              <span className="stat-value">{statsLoading ? "—" : membersStats.satisfaction}%</span>
              <span className="stat-label">
                <span className="stat-label-text">Satisfação do Cliente</span>
                <TooltipIcon
                  label="Satisfação do Cliente"
                  content="Porcentagem de feedbacks positivos coletados nos últimos 30 dias. Baseado em pesquisas de satisfação preenchidas após eventos."
                  position="top"
                />
              </span>
            </div>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <span className="stat-icon stat-icon--info"><FiTrendingUp aria-hidden="true" /></span>
            <div className="stat-body">
              <span className="stat-value">{statsLoading ? "—" : membersStats.attendance}%</span>
              <span className="stat-label">
                <span className="stat-label-text">Taxa de Assiduidade</span>
                <TooltipIcon
                  label="Taxa de Assiduidade"
                  content="Porcentagem de participantes que compareceram aos cursos nos últimos 30 dias. Calculado a partir do status de presença registrado no sistema."
                  position="top"
                />
              </span>
            </div>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <span className="stat-icon stat-icon--danger"><FiXCircle aria-hidden="true" /></span>
            <div className="stat-body">
              <span className="stat-value">{statsLoading ? "—" : membersStats.cancelation}%</span>
              <span className="stat-label">
                <span className="stat-label-text">Taxa de Cancelamento</span>
                <TooltipIcon
                  label="Taxa de Cancelamento"
                  content="Porcentagem de inscritos que não compareceram aos cursos nos últimos 30 dias. Complementa a taxa de assiduidade."
                  position="top"
                />
              </span>
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
              <span className="stat-label">
                <span className="stat-label-text">Total de Relatórios</span>
                <TooltipIcon
                  label="Total de Relatórios"
                  content="Número total de eventos com relatórios registrados no período selecionado."
                  position="top"
                />
              </span>
            </div>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <span className="stat-icon stat-icon--amber"><FiDownload aria-hidden="true" /></span>
            <div className="stat-body">
              <span className="stat-value">{statsLoading ? "—" : `R$ ${reportsStats.uberCostTotal.toFixed(2)}`}</span>
              <span className="stat-label">
                <span className="stat-label-text">Gastos de Uber mensal</span>
                <TooltipIcon
                  label="Gastos de Uber mensal"
                  content="Soma de todas as corridas Uber (GO + retorno) registradas no período. Baseado nos valores informados nos relatórios."
                  position="top"
                />
              </span>
            </div>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <span className="stat-icon stat-icon--purple"><FiVolume2 aria-hidden="true" /></span>
            <div className="stat-body">
              <span className="stat-value">{statsLoading ? "—" : `${reportsStats.avgSoundQuality}`}</span>
              <span className="stat-label">
                <span className="stat-label-text">Qualidade Média da Caixa de Som</span>
                <TooltipIcon
                  label="Qualidade Média da Caixa de Som"
                  content="Avaliação média (0-10) da qualidade da caixa de som e eletrônica durante os eventos do período."
                  position="top"
                />
              </span>
            </div>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <span className="stat-icon stat-icon--blue"><FiFileText aria-hidden="true" /></span>
            <div className="stat-body">
              <span className="stat-value">{statsLoading ? "—" : `${reportsStats.avgEventQuality}`}</span>
              <span className="stat-label">
                <span className="stat-label-text">Qualidade Média de Eventos</span>
                <TooltipIcon
                  label="Qualidade Média de Eventos"
                  content="Média aritmética das notas de qualidade (0-10) atribuídas aos eventos no período."
                  position="top"
                />
              </span>
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
              <span className="stat-label">
                <span className="stat-label-text">Total de Cursos</span>
                <TooltipIcon
                  label="Total de Cursos"
                  content="Número total de cursos realizados no período selecionado."
                  position="top"
                />
              </span>
            </div>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <span className="stat-icon stat-icon--green"><FiUsers aria-hidden="true" /></span>
            <div className="stat-body">
              <span className="stat-value">{statsLoading ? "—" : coursesStats.enrollments}</span>
              <span className="stat-label">
                <span className="stat-label-text">Total de Inscrições</span>
                <TooltipIcon
                  label="Total de Inscrições"
                  content="Soma de todas as inscrições em cursos durante o período. Um participante pode se inscrever em múltiplos cursos."
                  position="top"
                />
              </span>
            </div>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <span className="stat-icon stat-icon--amber"><FiBookOpen aria-hidden="true" /></span>
            <div className="stat-body">
              <span className="stat-value">{statsLoading ? "—" : coursesStats.avgOccupancy}%</span>
              <span className="stat-label">
                <span className="stat-label-text">Ocupação Média</span>
                <TooltipIcon
                  label="Ocupação Média"
                  content="Porcentagem média de vagas preenchidas nos cursos do período. Calculado apenas para cursos com capacidade definida."
                  position="top"
                />
              </span>
            </div>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <span className="stat-icon stat-icon--purple"><FiUsers aria-hidden="true" /></span>
            <div className="stat-body">
              <span className="stat-value">{statsLoading ? "—" : coursesStats.activeInstructors}</span>
              <span className="stat-label">
                <span className="stat-label-text">Instrutores Ativos</span>
                <TooltipIcon
                  label="Instrutores Ativos"
                  content="Número de instrutores únicos que ministraram cursos no período selecionado."
                  position="top"
                />
              </span>
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
            <span>Membros</span>
          </button>
          <button
            type="button"
            className={`gerencia-tab${activeTab === "relatorios" ? " active" : ""}`}
            onClick={() => setActiveTab("relatorios")}
          >
            <FiFileText aria-hidden="true" />
            <span>Relatórios</span>
          </button>
          <button
            type="button"
            className={`gerencia-tab${activeTab === "cursos" ? " active" : ""}`}
            onClick={() => setActiveTab("cursos")}
          >
            <FiBookOpen aria-hidden="true" />
            <span>Cursos</span>
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
          <section className="gerencia-section" data-section="membros" key="membros">
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
          <section className="gerencia-section" data-section="relatorios" key="relatorios">
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
                    <th>Aniversariante</th>
                    <th>Título do Evento</th>
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
          <section className="gerencia-section" data-section="cursos" key="cursos">
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
