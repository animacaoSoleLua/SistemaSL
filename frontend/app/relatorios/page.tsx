"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FiAlertTriangle, FiFileText, FiX } from "react-icons/fi";
import {
  deleteReport,
  getReportById,
  getReports,
  resolveApiAssetUrl,
} from "../../lib/api";
import { getDefaultRoute, getStoredUser, isRoleAllowed, type Role } from "../../lib/auth";

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
  location: string;
  title_schedule?: string | null;
  transport_type?: string | null;
  uber_go_value?: number | null;
  uber_return_value?: number | null;
  other_car_responsible?: string | null;
  has_extra_hours?: boolean | null;
  extra_hours_details?: string | null;
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
  if (value === "outro") return "Outro";
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
    getReports()
      .then((data) => {
        setReports(data.data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [currentRole]);

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

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredReports = reports.filter((report) => {
    if (!normalizedSearch) {
      return true;
    }

    return (
      report.contractor_name.toLowerCase().includes(normalizedSearch) ||
      (report.title_schedule?.toLowerCase().includes(normalizedSearch) ?? false) ||
      (report.author_name?.toLowerCase().includes(normalizedSearch) ?? false)
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
            </div>
            <label className="field report-search">
              <input
                type="text"
                placeholder="Buscar por contratante, título ou autor..."
                className="input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                aria-label="Buscar relatório"
              />
            </label>
          </div>

          {loading ? (
            <div className="empty-state">
              <p>Carregando relatórios...</p>
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
                    <span>
                      Aniversariante/Contratante:{" "}
                      <strong className="report-name">{report.contractor_name}</strong>
                    </span>
                    <span className="report-subtitle">{getText(report.title_schedule)}</span>
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
              <div>
                <strong id={modalTitleId}>Detalhes do relatório</strong>
              </div>
              <button className="button secondary" type="button" onClick={closeViewModal}>
                Fechar
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
                      hasText(selectedReport.extra_hours_details);
                    const showExtraHoursDetails = hasText(selectedReport.extra_hours_details);

                    return (
                  <div className="form-grid">
                    <div className="field full">
                      <strong>
                        <h3>Autor do relatório</h3>
                        </strong>
                      <p className="helper">
                        {getText(selectedReport.author_name)}
                        </p>
                    </div>
                    <div className="field">
                      <span>Data do evento</span>
                      <p className="helper">{formatDateBR(selectedReport.event_date)}</p>
                    </div>
                    <div className="field">
                      <span>Aniversariante / Contratante</span>
                      <p className="helper">{getText(selectedReport.contractor_name)}</p>
                    </div>
                    <div className="field full">
                      <span>Título / Cronograma</span>
                      <p className="helper">{getText(selectedReport.title_schedule)}</p>
                    </div>
                    <div className="field">
                      <span>Locomoção</span>
                      <p className="helper">{formatTransportType(selectedReport.transport_type)}</p>
                    </div>
                    <div className="field">
                      <span>Evento fora de Brasília</span>
                      <p className="helper">{formatBoolean(selectedReport.outside_brasilia)}</p>
                    </div>
                    <div className="field">
                      <span>Exclusividade</span>
                      <p className="helper">{formatBoolean(selectedReport.exclusive_event)}</p>
                    </div>
                    <div className="field">
                      <span>Hora extra</span>
                      <p className="helper">{formatBoolean(hasExtraHours)}</p>
                    </div>
                    {showUberValues && (
                      <>
                        <div className="field">
                          <span>Uber ida</span>
                          <p className="helper">{formatMoneyBRL(selectedReport.uber_go_value)}</p>
                        </div>
                        <div className="field">
                          <span>Uber volta</span>
                          <p className="helper">{formatMoneyBRL(selectedReport.uber_return_value)}</p>
                        </div>
                      </>
                    )}
                    {showOtherCarResponsible && (
                      <div className="field full">
                        <span>Responsável do carro</span>
                        <p className="helper">{getText(selectedReport.other_car_responsible)}</p>
                      </div>
                    )}
                    {showExtraHoursDetails && (
                      <div className="field full">
                        <span>Detalhes da hora extra</span>
                        <p className="helper">{getText(selectedReport.extra_hours_details)}</p>
                      </div>
                    )}
                    <div className="field full">
                      <span>Descrição geral da equipe</span>
                      <p className="helper">
                        {getText(selectedReport.team_general_description)}
                      </p>
                    </div>
                    <div className="field">
                      <span>Nota geral da equipe</span>
                      <p className="helper">{formatRating(selectedReport.team_general_score)}</p>
                    </div>
                    <div className="field full">
                      <span>Dificuldades do evento</span>
                      <p className="helper">{getText(selectedReport.event_difficulties)}</p>
                    </div>

                    <div className="field">
                      <span>Nota de dificuldade do evento</span>
                      <p className="helper">
                        {formatRating(selectedReport.event_difficulty_score)}
                      </p>
                    </div>

                    <div className="field">
                      <span>Nota de qualidade do evento</span>
                      <p className="helper">{formatRating(selectedReport.event_quality_score)}</p>
                    </div>


                    <div className="field">
                      <span>Qualidade da caixa de som</span>
                      <p className="helper">{formatRating(selectedReport.quality_sound)}</p>
                    </div>

                    <div className="field">
                      <span>Qualidade do microfone</span>
                      <p className="helper">{formatRating(selectedReport.quality_microphone)}</p>
                    </div>

                    <div className="field">
                      <span>Número da Caixa de Som</span>
                      <p className="helper">
                        {selectedReport.speaker_number ?? "-"}
                      </p>
                    </div>
                    
                    <div className="field full">
                      <span>Observações sobre eletrônicos</span>
                      <p className="helper">{getText(selectedReport.electronics_notes)}</p>
                    </div>
                    <div className="field full">
                      <span>Criado em</span>
                      <p className="helper">{formatDateTimeBR(selectedReport.created_at)}</p>
                    </div>
                  </div>
                    );
                  })()}

                  <div className="report-detail-group">
                    <strong>Mídias anexadas</strong>
                    {selectedReport.media.length === 0 ? (
                      <p className="helper">Sem mídias anexadas.</p>
                    ) : (
                      <ul className="report-detail-list">
                        {selectedReport.media.map((item) => (
                          <li key={item.id}>
                            <a
                              href={resolveApiAssetUrl(item.url)}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {item.media_type === "image" ? "Imagem" : "Vídeo"} ({item.size_bytes}{" "}
                              bytes)
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="report-detail-group">
                    <strong>Feedbacks individuais</strong>
                    {selectedReport.feedbacks.length === 0 ? (
                      <p className="helper">Sem feedbacks.</p>
                    ) : (
                      <ul className="report-detail-list">
                        {selectedReport.feedbacks.map((item, index) => (
                          <li key={`${item.member_id}-${index}`}>
                            <strong>{getText(item.member_name ?? item.member_id)}:</strong> {item.feedback}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
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
