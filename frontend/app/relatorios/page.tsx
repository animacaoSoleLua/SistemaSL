"use client";

import './page.css';
import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FiAlertTriangle, FiDownload, FiFileText, FiMaximize2, FiX } from "react-icons/fi";
import {
  API_ORIGIN,
  deleteReport,
  getReportById,
  getReports,
  resolveApiAssetUrl,
} from "../../lib/api";
import { getDefaultRoute, getStoredUser, isRoleAllowed, type Role } from "../../lib/auth";
import { displayToIsoWithShortYear, formatDateInput } from "../../lib/dateValidators";
import { normalizeString } from "../../lib/validators";

interface Report {
  id: string;
  contractor_name: string;
  event_date: string;
  author_name?: string | null;
  title_schedule?: string | null;
}

interface ReportDetail {
  id: string;
  event_date: string;
  created_at?: string;
  contractor_name: string;
  birthday_age?: number | null;
  title_schedule: string;
  transport_type?: string | null;
  uber_go_value?: number | null;
  uber_return_value?: number | null;
  other_car_responsible?: string | null;
  has_extra_hours?: boolean | null;
  extra_hours_details?: number | null;
  outside_brasilia: boolean;
  exclusive_event: boolean;
  team_summary: string;
  team_general_description?: string | null;
  team_general_score?: number | null;
  event_difficulties?: string | null;
  event_difficulty_score?: number | null;
  event_quality_score?: number | null;
  quality_sound?: number | null;
  quality_microphone?: number | null;
  speaker_number?: number | null;
  electronics_notes?: string | null;
  notes?: string | null;
  author_id: string;
  author_name?: string | null;
  media: Array<{
    id: string;
    url: string;
    media_type: "image" | "video";
    size_bytes: number;
    topic?: string | null;
  }>;
  feedbacks: Array<{
    member_id: string;
    member_name?: string | null;
    feedback: string;
  }>;
}

function formatDateBR(value?: string | null) {
  if (!value) return "-";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString("pt-BR");
}

function formatDateTimeBR(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString("pt-BR");
}

function formatMoneyBRL(value?: number | null) {
  if (value === undefined || value === null) return "-";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatRating(value?: number | null) {
  if (value === undefined || value === null) return "-";
  return `${value}/5`;
}

function formatBoolean(value?: boolean | null) {
  return value ? "Sim" : "Não";
}

function getText(value?: string | null) {
  if (!value || !value.trim()) return "-";
  return value;
}

function hasText(value?: string | null) {
  return Boolean(value && value.trim());
}

function formatTransportType(value?: string | null) {
  if (!value) return "-";
  if (value === "uber99") return "Uber/99";
  if (value === "outro") return "Carro Pessoal";
  if (value === "carro_empresa") return "Carro da Empresa";
  return value;
}

export default function RelatoriosPage() {
  const router = useRouter();
  const modalTitleId = useId();
  const modalDescriptionId = useId();
  const deleteModalTitleId = useId();
  const deleteModalDescriptionId = useId();
  const [currentRole, setCurrentRole] = useState<Role | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateStartDisplay, setDateStartDisplay] = useState("");
  const [dateEndDisplay, setDateEndDisplay] = useState("");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<ReportDetail | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewError, setViewError] = useState<string | null>(null);
  const [deletingReportId, setDeletingReportId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Report | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [lightboxMediaId, setLightboxMediaId] = useState<string | null>(null);

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
    getReports({
      period_start: dateStart || undefined,
      period_end: dateEnd || undefined,
      limit: 500,
    })
      .then((data) => {
        setReports(data.data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [currentRole, dateStart, dateEnd]);

  useEffect(() => {
    if (!viewModalOpen || !selectedReportId) return;

    let cancelled = false;
    setViewLoading(true);
    setViewError(null);
    setSelectedReport(null);

    getReportById(selectedReportId)
      .then((data) => {
        if (cancelled) return;
        setSelectedReport(data.data as ReportDetail);
        setViewLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setViewError(err instanceof Error ? err.message : "Erro ao carregar relatório.");
        setViewLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [viewModalOpen, selectedReportId]);

  const handleDateStartChange = (raw: string) => {
    const formatted = formatDateInput(raw);
    setDateStartDisplay(formatted);
    if (formatted.length === 0) setDateStart("");
    else if (formatted.length === 10) setDateStart(displayToIsoWithShortYear(formatted));
  };

  const handleDateEndChange = (raw: string) => {
    const formatted = formatDateInput(raw);
    setDateEndDisplay(formatted);
    if (formatted.length === 0) setDateEnd("");
    else if (formatted.length === 10) setDateEnd(displayToIsoWithShortYear(formatted));
  };

  const normalizedSearch = normalizeString(searchTerm.trim());
  const filteredReports = reports.filter((report) => {
    if (!normalizedSearch) {
      return true;
    }

    return (
      normalizeString(report.contractor_name).includes(normalizedSearch) ||
      (report.title_schedule ? normalizeString(report.title_schedule).includes(normalizedSearch) : false) ||
      (report.author_name ? normalizeString(report.author_name).includes(normalizedSearch) : false)
    );
  });

  const openViewModal = (reportId: string) => {
    setSelectedReportId(reportId);
    setViewModalOpen(true);
  };

  const closeViewModal = () => {
    setViewModalOpen(false);
    setSelectedReportId(null);
    setSelectedReport(null);
    setViewLoading(false);
    setViewError(null);
  };

  const openDeleteModal = (report: Report) => {
    setError(null);
    setDeleteTarget(report);
  };

  const closeDeleteModal = () => {
    if (deletingReportId) {
      return;
    }
    setDeleteTarget(null);
  };

  const confirmDeleteReport = async () => {
    if (!deleteTarget) {
      return;
    }

    setDeletingReportId(deleteTarget.id);
    try {
      await deleteReport(deleteTarget.id);
      setReports((prev) => prev.filter((report) => report.id !== deleteTarget.id));
      if (selectedReportId === deleteTarget.id) {
        closeViewModal();
      }
      setDeleteTarget(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erro ao excluir relatório.";
      setError(message);
    } finally {
      setDeletingReportId(null);
    }
  };

  const handleEditReport = (reportId: string) => {
    closeViewModal();
    router.push(`/novo-relatorio?editar=${reportId}`);
  };

  const handleDownload = async (reportId: string, mediaId: string, filename: string) => {
    try {
      const res = await fetch(`${API_ORIGIN}/api/v1/relatorios/${reportId}/media/${mediaId}/download`, { credentials: "include" });
      if (!res.ok) throw new Error("download_failed");
      const { url } = await res.json();
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch {
      // silently fail
    }
  };

  return (
    <main className="app-page">
      <section className="shell reveal">
        <header className="page-header">
          <div>
            <h1 className="hero-title">Relatórios</h1>
          </div>
          {currentRole && (
            <Link className="button" href="/novo-relatorio">
              + Novo Relatório
            </Link>
          )}
        </header>

        <section className="report-panel">
          <div className="report-header">
            <div>
              <h2 className="section-title">Listagem de relatórios</h2>
              <p>Dos últimos 90 dias</p>
            </div>
            <div className="report-filters">
              <label className="field report-search">
                <input
                  type="text"
                  placeholder="Buscar por animador ou título..."
                  className="input"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  aria-label="Buscar relatório"
                />
              </label>
              <div className="report-date-filters">
                <label className="report-date-field">
                  <span>De</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    className="input"
                    maxLength={10}
                    placeholder="DD/MM/AAAA"
                    value={dateStartDisplay}
                    onChange={(e) => handleDateStartChange(e.target.value)}
                    aria-label="Data inicial"
                  />
                </label>
                <label className="report-date-field">
                  <span>Até</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    className="input"
                    maxLength={10}
                    placeholder="DD/MM/AAAA"
                    value={dateEndDisplay}
                    onChange={(e) => handleDateEndChange(e.target.value)}
                    aria-label="Data final"
                  />
                </label>
              </div>
            </div>
          </div>

          <p className="sr-only" aria-live="polite" aria-atomic="true">
            {loading ? "Carregando relatórios..." : ""}
          </p>
          {loading ? (
            <div className="report-list" aria-hidden="true">
              {Array.from({ length: 5 }).map((_, i) => (
                <article key={i} className="report-item">
                  <div className="report-meta">
                    <div className="skeleton" style={{ width: "50%", height: 16 }} />
                    <div className="skeleton" style={{ width: "35%", height: 13, marginTop: 6 }} />
                    <div className="skeleton" style={{ width: "30%", height: 13, marginTop: 4 }} />
                  </div>
                  <div className="member-row-actions">
                    <div className="skeleton" style={{ width: 56, height: 32, borderRadius: 8 }} />
                    <div className="skeleton" style={{ width: 72, height: 32, borderRadius: 8 }} />
                  </div>
                </article>
              ))}
            </div>
          ) : error ? (
            <div className="empty-state">
              <p className="text-red-500">Erro ao carregar relatórios: {error}</p>
            </div>
          ) : filteredReports.length > 0 ? (
            <div className="report-list">
              {filteredReports.map((report) => (
                <article className="report-item" key={report.id}>
                  <div className="report-meta">
                    <strong className="report-name">{getText(report.title_schedule)}</strong>
                    <span className="report-subtitle">
                      Aniversariante: {report.contractor_name}
                    </span>
                    <span className="report-date">Criado por: {getText(report.author_name)}</span>
                    <span className="report-date">
                      Data do evento: {formatDateBR(report.event_date)}
                    </span>
                  </div>
                  <div className="member-row-actions">
                    <button
                      className="button secondary small"
                      type="button"
                      onClick={() => openViewModal(report.id)}
                    >
                      Ver
                    </button>
                    {currentRole === "animador" && (
                      <button
                        className="button secondary small"
                        type="button"
                        onClick={() => handleEditReport(report.id)}
                      >
                        Editar
                      </button>
                    )}
                    <button
                      className="button danger small"
                      type="button"
                      onClick={() => openDeleteModal(report)}
                      disabled={deletingReportId === report.id}
                    >
                      {deletingReportId === report.id ? "Excluindo..." : "Excluir"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <span className="empty-state-icon" aria-hidden="true">
                <FiFileText />
              </span>
              <p>Nenhum relatório encontrado</p>
              <p className="helper">Comece criando seu primeiro relatório de evento.</p>
              <Link className="button" href="/novo-relatorio">
                + Criar Relatório
              </Link>
            </div>
          )}
        </section>
      </section>

      {viewModalOpen && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby={modalTitleId}
          aria-describedby={modalDescriptionId}
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeViewModal();
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.stopPropagation();
              closeViewModal();
            }
          }}
        >
          <div className="modal-card report-modal">
            <header className="modal-header">
              <strong id={modalTitleId} className="modal-title">Detalhes do relatório</strong>
              <button className="icon-button" type="button" onClick={closeViewModal} aria-label="Fechar">
                <FiX />
              </button>
            </header>

            <div className="modal-body report-modal-body">
              {viewLoading ? (
                <p>Carregando detalhes...</p>
              ) : viewError ? (
                <p className="text-red-500">{viewError}</p>
              ) : selectedReport ? (
                <>
                  {(() => {
                    const transportType = selectedReport.transport_type ?? "";
                    const showUberValues = transportType === "uber99";
                    const showOtherCarResponsible = transportType === "outro";
                    const hasExtraHours =
                      selectedReport.has_extra_hours === true ||
                      (selectedReport.extra_hours_details != null && selectedReport.extra_hours_details > 0);
                    const showExtraHoursDetails =
                      selectedReport.extra_hours_details != null && selectedReport.extra_hours_details > 0;

                    const topicOrder = [null, "Pintura", "Balão", "Animação", "Personagens", "Oficinas"];
                    const topicLabels: Record<string, string> = {
                      Pintura: "Pintura",
                      "Balão": "Balão",
                      "Animação": "Animação",
                      Personagens: "Personagens",
                      Oficinas: "Oficinas",
                    };
                    const groupedMedia = topicOrder
                      .map((topic) => ({
                        topic,
                        label: topic ? topicLabels[topic] : "Avaria no Material",
                        items: selectedReport.media.filter((m) => (m.topic ?? null) === topic),
                      }))
                      .filter((g) => g.items.length > 0);

                    const renderMediaItem = (item: typeof selectedReport.media[0]) => {
                      const assetUrl = resolveApiAssetUrl(item.url);
                      const filename = item.url.split("/").pop() ?? (item.media_type === "image" ? "imagem.jpg" : "video.mp4");
                      if (item.media_type === "image") {
                        return (
                          <div key={item.id} className="media-thumb-wrap">
                            <button
                              type="button"
                              className="media-thumb-btn"
                              onClick={() => { setLightboxUrl(assetUrl); setLightboxMediaId(item.id); }}
                              aria-label="Ampliar imagem"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={assetUrl}
                                alt="Mídia do relatório"
                                className="media-thumb"
                                loading="lazy"
                              />
                              <span className="media-thumb-overlay" aria-hidden="true">
                                <FiMaximize2 />
                              </span>
                            </button>
                            <button
                              type="button"
                              className="media-download-btn"
                              aria-label="Baixar imagem"
                              onClick={() => handleDownload(selectedReport.id, item.id, filename)}
                            >
                              <FiDownload />
                            </button>
                          </div>
                        );
                      }
                      return (
                        <div key={item.id} className="media-thumb-wrap media-thumb-wrap--video">
                          <a
                            href={assetUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="media-video-link"
                          >
                            Vídeo
                          </a>
                          <button
                            type="button"
                            className="media-download-btn"
                            aria-label="Baixar vídeo"
                            onClick={() => handleDownload(selectedReport.id, item.id, filename)}
                          >
                            <FiDownload />
                          </button>
                        </div>
                      );
                    };

                    return (
                      <div className="report-sections">

                        {/* ── Informações do Evento ── */}
                        <div className="report-section">
                          <div className="report-section-header">
                            <h3 className="report-section-title">Informações do Evento</h3>
                          </div>
                          <div className="form-grid">
                            <div className="field">
                              <span>Data do evento</span>
                              <p className="report-value">{formatDateBR(selectedReport.event_date)}</p>
                            </div>
                            <div className="field full">
                              <span>Título / Cronograma</span>
                              <p className="report-value">{getText(selectedReport.title_schedule)}</p>
                            </div>
                            <div className="field">
                              <span>Aniversariante / Contratante</span>
                              <p className="report-value">{getText(selectedReport.contractor_name)}</p>
                            </div>
                            <div className="field">
                              <span>Idade do aniversariante</span>
                              <p className="report-value">{selectedReport.birthday_age ?? "-"}</p>
                            </div>
                            <div className="field">
                              <span>Evento fora de Brasília</span>
                              <p className="report-value">{formatBoolean(selectedReport.outside_brasilia)}</p>
                            </div>
                            <div className="field">
                              <span>Exclusividade</span>
                              <p className="report-value">{formatBoolean(selectedReport.exclusive_event)}</p>
                            </div>
                            <div className="field">
                              <span>Hora extra</span>
                              <p className="report-value">{formatBoolean(hasExtraHours)}</p>
                            </div>
                            {showExtraHoursDetails && (
                              <div className="field full">
                                <span>Detalhes da hora extra</span>
                                <p className="report-value">{selectedReport.extra_hours_details} minutos</p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* ── Locomoção ── */}
                        <div className="report-section">
                          <div className="report-section-header">
                            <h3 className="report-section-title">Locomoção</h3>
                          </div>
                          <div className="form-grid">
                            <div className="field">
                              <span>Tipo de locomoção</span>
                              <p className="report-value">{formatTransportType(selectedReport.transport_type)}</p>
                            </div>
                            {showUberValues && (
                              <>
                                <div className="field">
                                  <span>Uber ida</span>
                                  <p className="report-value">{formatMoneyBRL(selectedReport.uber_go_value)}</p>
                                </div>
                                <div className="field">
                                  <span>Uber volta</span>
                                  <p className="report-value">{formatMoneyBRL(selectedReport.uber_return_value)}</p>
                                </div>
                              </>
                            )}
                            {showOtherCarResponsible && (
                              <div className="field full">
                                <span>Responsável do carro</span>
                                <p className="report-value">{getText(selectedReport.other_car_responsible)}</p>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* ── Feedback da Equipe ── */}
                        <div className="report-section">
                          <div className="report-section-header">
                            <h3 className="report-section-title">Feedback da Equipe</h3>
                          </div>
                          <div className="form-grid">
                            <div className="field full">
                              <span>Descrição geral da equipe</span>
                              <p className="report-value">{getText(selectedReport.team_general_description)}</p>
                            </div>
                            <div className="field">
                              <span>Nota geral da equipe</span>
                              <p className="report-value">{formatRating(selectedReport.team_general_score)}</p>
                            </div>
                          </div>
                          {selectedReport.feedbacks.length === 0 ? (
                            <p className="helper">Sem feedbacks individuais.</p>
                          ) : (
                            <ul className="report-detail-list">
                              {selectedReport.feedbacks.map((item, index) => (
                                <li key={`${item.member_id}-${index}`}>
                                  <strong>{getText(item.member_name ?? item.member_id)}</strong>
                                  <span>{item.feedback}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>

                        {/* ── Descrição do Evento ── */}
                        <div className="report-section">
                          <div className="report-section-header">
                            <h3 className="report-section-title">Descrição do Evento</h3>
                          </div>
                          <div className="form-grid">
                            <div className="field full">
                              <span>Dificuldades do evento</span>
                              <p className="report-value">{getText(selectedReport.event_difficulties)}</p>
                            </div>
                            <div className="field">
                              <span>Nota de dificuldade</span>
                              <p className="report-value">{formatRating(selectedReport.event_difficulty_score)}</p>
                            </div>
                            <div className="field">
                              <span>Nota de qualidade</span>
                              <p className="report-value">{formatRating(selectedReport.event_quality_score)}</p>
                            </div>
                          </div>
                        </div>

                        {/* ── Eletrônicos ── */}
                        <div className="report-section">
                          <div className="report-section-header">
                            <h3 className="report-section-title">Eletrônicos</h3>
                          </div>
                          <div className="form-grid">
                            <div className="field">
                              <span>Qualidade da caixa de som</span>
                              <p className="report-value">{formatRating(selectedReport.quality_sound)}</p>
                            </div>
                            <div className="field">
                              <span>Qualidade do microfone</span>
                              <p className="report-value">{formatRating(selectedReport.quality_microphone)}</p>
                            </div>
                            <div className="field">
                              <span>Número da caixa de som</span>
                              <p className="report-value">{selectedReport.speaker_number ?? "-"}</p>
                            </div>
                            <div className="field full">
                              <span>Observações sobre eletrônicos</span>
                              <p className="report-value">{getText(selectedReport.electronics_notes)}</p>
                            </div>
                          </div>
                        </div>

                        {/* ── Fotos do Evento ── */}
                        <div className="report-section">
                          <div className="report-section-header">
                            <h3 className="report-section-title">Fotos do Evento</h3>
                          </div>
                          {selectedReport.media.length === 0 ? (
                            <p className="helper">Sem mídias anexadas.</p>
                          ) : (
                            <div className="media-topics">
                              {groupedMedia.map((group) => (
                                <div key={group.topic ?? "__damage__"} className="media-topic-group">
                                  <span className="media-topic-label">{group.label}</span>
                                  <div className="media-grid">
                                    {group.items.map(renderMediaItem)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* ── Metadados ── */}
                        <div className="report-section">
                          <div className="report-section-header">
                            <h3 className="report-section-title">Informações do Registro</h3>
                          </div>
                          <div className="form-grid">
                            <div className="field">
                              <span>Autor do relatório</span>
                              <p className="report-value">{getText(selectedReport.author_name)}</p>
                            </div>
                            <div className="field">
                              <span>Criado em</span>
                              <p className="report-value">{formatDateTimeBR(selectedReport.created_at)}</p>
                            </div>
                          </div>
                        </div>

                      </div>
                    );
                  })()}
                </>
              ) : (
                <p className="helper">Nenhum relatório selecionado.</p>
              )}
            </div>

            <div className="modal-footer">
              {currentRole === "animador" && selectedReportId && (
                <button
                  className="button"
                  type="button"
                  onClick={() => handleEditReport(selectedReportId)}
                >
                  Editar relatório
                </button>
              )}
              <button className="button secondary" type="button" onClick={closeViewModal}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {lightboxUrl && (
        <div
          className="lightbox-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Visualizar imagem"
          onClick={() => { setLightboxUrl(null); setLightboxMediaId(null); }}
          onKeyDown={(e) => { if (e.key === "Escape") { setLightboxUrl(null); setLightboxMediaId(null); } }}
        >
          <button
            type="button"
            className="lightbox-close"
            aria-label="Fechar"
            onClick={() => { setLightboxUrl(null); setLightboxMediaId(null); }}
          >
            <FiX />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxUrl}
            alt="Imagem ampliada"
            className="lightbox-img"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            className="lightbox-download"
            onClick={(e) => { e.stopPropagation(); if (selectedReport && lightboxMediaId) handleDownload(selectedReport.id, lightboxMediaId, lightboxUrl?.split("/").pop() ?? "imagem.jpg"); }}
            aria-label="Baixar imagem"
          >
            <FiDownload /> Baixar
          </button>
        </div>
      )}

      {deleteTarget && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby={deleteModalTitleId}
          aria-describedby={deleteModalDescriptionId}
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeDeleteModal();
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.stopPropagation();
              closeDeleteModal();
            }
          }}
        >
          <div className="modal-card confirm-modal">
            <header className="modal-header">
              <div>
                <h2 className="section-title" id={deleteModalTitleId}>
                  Confirmar exclusão
                </h2>
                <p id={deleteModalDescriptionId}>
                  Esta ação apaga o relatório e não pode ser desfeita.
                </p>
              </div>
              <button
                className="icon-button"
                type="button"
                aria-label="Fechar"
                onClick={closeDeleteModal}
                disabled={Boolean(deletingReportId)}
              >
                <FiX />
              </button>
            </header>

            <div className="modal-body confirm-body">
              <div className="confirm-icon" aria-hidden="true">
                <FiAlertTriangle />
              </div>
              <div className="confirm-text">
                <p>
                  Excluir relatório de <strong>{deleteTarget.contractor_name}</strong>?
                </p>
                <p className="confirm-muted">Essa ação não poderá ser desfeita.</p>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="button secondary"
                type="button"
                onClick={closeDeleteModal}
                disabled={Boolean(deletingReportId)}
              >
                Cancelar
              </button>
              <button
                className="button danger"
                type="button"
                onClick={confirmDeleteReport}
                disabled={Boolean(deletingReportId)}
              >
                {deletingReportId ? "Excluindo..." : "Excluir relatório"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
