"use client";

import './page.css';
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FiCalendar, FiFileText, FiMapPin, FiStar } from "react-icons/fi";
import {
  getDashboardQuality,
  getDashboardSummary,
  getReports,
} from "../../lib/api";
import { getDefaultRoute, getStoredUser, isRoleAllowed } from "../../lib/auth";

const allowedRoles = ["admin"] as const;

interface DashboardSummary {
  total_events: number;
  total_reports: number;
  avg_quality: number;
  outside_brasilia_events: number;
}

interface DashboardQuality {
  sound: number;
  microphone: number;
  event_quality: number;
  event_difficulty: number;
}

interface ReportListItem {
  id: string;
  contractor_name: string;
  event_date: string;
  title_schedule?: string | null;
}

function formatDateBR(value?: string | null) {
  if (!value) return "-";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString("pt-BR");
}

function formatScore(value?: number | null) {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return "0.0";
  }
  return value.toFixed(1);
}

export default function DashboardPage() {
  const router = useRouter();
  const [canLoad, setCanLoad] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<DashboardSummary>({
    total_events: 0,
    total_reports: 0,
    avg_quality: 0,
    outside_brasilia_events: 0,
  });
  const [quality, setQuality] = useState<DashboardQuality>({
    sound: 0,
    microphone: 0,
    event_quality: 0,
    event_difficulty: 0,
  });
  const [reports, setReports] = useState<ReportListItem[]>([]);

  useEffect(() => {
    const user = getStoredUser();
    if (!user) {
      router.push("/login");
      return;
    }
    if (!isRoleAllowed(user.role, [...allowedRoles])) {
      router.push(getDefaultRoute(user.role));
      return;
    }
    setCanLoad(true);
  }, [router]);

  useEffect(() => {
    if (!canLoad) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([getDashboardSummary(), getDashboardQuality(), getReports()])
      .then(([summaryResponse, qualityResponse, reportsResponse]) => {
        if (cancelled) return;
        setSummary(summaryResponse.data as DashboardSummary);
        setQuality(qualityResponse.data as DashboardQuality);
        setReports((reportsResponse.data as ReportListItem[]) ?? []);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Erro ao carregar dashboard.");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [canLoad]);

  const monthlyReports = useMemo(() => {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();

    return reports.filter((report) => {
      if (!report.event_date) return false;
      const date = new Date(`${report.event_date}T00:00:00`);
      if (Number.isNaN(date.getTime())) return false;
      return date.getMonth() === month && date.getFullYear() === year;
    }).length;
  }, [reports]);

  const recentReports = reports.slice(0, 6);

  return (
    <main className="app-page">
      <section className="shell reveal">
        <header className="page-header">
          <div>
            <h1 className="hero-title">Dashboard</h1>
            <p>Dados dos últimos 90 dias</p>
          </div>
        </header>

        <p className="sr-only" aria-live="polite" aria-atomic="true">
          {loading ? "Carregando dashboard..." : ""}
        </p>
        {loading ? (
          <section className="dashboard-grid" aria-hidden="true">
            {Array.from({ length: 8 }).map((_, i) => (
              <article key={i} className="summary-card">
                <div className="summary-head">
                  <span className="skeleton" style={{ width: "60%", height: 14 }} />
                  <span className="skeleton" style={{ width: 28, height: 28, borderRadius: "50%" }} />
                </div>
                <div className="skeleton" style={{ width: "40%", height: 36, marginTop: 8 }} />
                <div className="skeleton" style={{ width: "70%", height: 12, marginTop: 8 }} />
              </article>
            ))}
          </section>
        ) : (
        <section className="dashboard-grid">
          <article className="summary-card">
            <div className="summary-head">
              <span className="summary-label">Total de Relatórios</span>
              <span className="summary-icon">
                <FiFileText aria-hidden="true" />
              </span>
            </div>
            <strong className="summary-value">{summary.total_reports}</strong>
            <p className="summary-note">{summary.total_reports} cadastrados</p>
          </article>
          <article className="summary-card">
            <div className="summary-head">
              <span className="summary-label">Relatórios do Mês</span>
              <span className="summary-icon">
                <FiCalendar aria-hidden="true" />
              </span>
            </div>
            <strong className="summary-value">{monthlyReports}</strong>
            <p className="summary-note">Eventos realizados no mês atual</p>
          </article>

          <article className="summary-card">
            <div className="summary-head">
              <span className="summary-label">Eventos Fora de Brasília</span>
              <span className="summary-icon">
                <FiMapPin aria-hidden="true" />
              </span>
            </div>
            <strong className="summary-value">{summary.outside_brasilia_events}</strong>
            <p className="summary-note">Quantidade de eventos marcados fora de Brasília</p>
          </article>

          <article className="summary-card">
            <div className="summary-head">
              <span className="summary-label">Avaliação Média da Equipe</span>
              <span className="summary-icon gold">
                <FiStar aria-hidden="true" />
              </span>
            </div>
            <strong className="summary-value">{formatScore(summary.avg_quality)}</strong>
          </article>

          <article className="summary-card">
            <div className="summary-head">
              <span className="summary-label">Qualidade Média do Som</span>
              <span className="summary-icon gold">
                <FiStar aria-hidden="true" />
              </span>
            </div>
            <strong className="summary-value">{formatScore(quality.sound)}</strong>
            <p className="summary-note">Avaliação do som nos eventos</p>
          </article>

          <article className="summary-card">
            <div className="summary-head">
              <span className="summary-label">Qualidade Média do Microfone</span>
              <span className="summary-icon gold">
                <FiStar aria-hidden="true" />
              </span>
            </div>
            <strong className="summary-value">{formatScore(quality.microphone)}</strong>
            <p className="summary-note">Avaliação do microfone nos eventos</p>
          </article>

          <article className="summary-card">
            <div className="summary-head">
              <span className="summary-label">Qualidade Média do Evento</span>
              <span className="summary-icon gold">
                <FiStar aria-hidden="true" />
              </span>
            </div>
            <strong className="summary-value">{formatScore(quality.event_quality)}</strong>
            <p className="summary-note">Nota média de qualidade geral do evento</p>
          </article>
          <article className="summary-card">
            <div className="summary-head">
              <span className="summary-label">Dificuldade Média do Evento</span>
              <span className="summary-icon gold">
                <FiStar aria-hidden="true" />
              </span>
            </div>
            <strong className="summary-value">{formatScore(quality.event_difficulty)}</strong>
            <p className="summary-note">Nota média de dificuldade dos eventos</p>
          </article>
        </section>
        )}

        <section className="report-panel">
          <div className="report-header">
            <div>
              <h2 className="section-title">Relatórios Recentes</h2>
              <p>Lista simplificada dos últimos eventos</p>
            </div>
          </div>

          {loading ? (
            <ul aria-hidden="true" style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {Array.from({ length: 4 }).map((_, i) => (
                <li key={i} style={{ padding: "12px 0", display: "flex", flexDirection: "column", gap: 6 }}>
                  <div className="skeleton" style={{ width: "45%", height: 16 }} />
                  <div className="skeleton" style={{ width: "25%", height: 12 }} />
                </li>
              ))}
            </ul>
          ) : error ? (
            <div className="empty-state">
              <p className="text-red-500">Erro ao carregar dados: {error}</p>
            </div>
          ) : recentReports.length === 0 ? (
            <div className="empty-state">
              <p>Nenhum relatório cadastrado ainda</p>
            </div>
          ) : (
            <ul className="dashboard-report-list" aria-label="Lista de relatórios recentes">
              {recentReports.map((report) => (
                <li key={report.id} className="dashboard-report-item">
                  <strong>{report.contractor_name}</strong>
                  <span>{formatDateBR(report.event_date)}</span>
                  {report.title_schedule ? (
                    <span className="report-subtitle">{report.title_schedule}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </section>
    </main>
  );
}
