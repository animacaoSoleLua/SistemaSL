"use client";

import './page.css';
import type { FormEvent } from "react";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getDefaultRoute, getStoredUser, isRoleAllowed } from "../../lib/auth";
import {
  createReport,
  getMembers,
  getReportById,
  updateReport,
  uploadReportMedia,
} from "../../lib/api";
import { getMediaValidationError } from "../../lib/mediaValidators";
import { normalizeString } from "../../lib/validators";
import { displayToIsoWithShortYear, formatDateInput, isoToDisplay } from "../../lib/dateValidators";

type TransportType = "" | "uber99" | "carro_empresa" | "outro";
type YesNo = "" | "sim" | "nao";
type Score = "" | "0" | "1" | "2" | "3" | "4" | "5";

type MemberOption = {
  id: string;
  name: string;
  last_name?: string | null;
};

type TeamMemberFeedback = {
  id: string;
  name: string;
  feedback: string;
};

const MAX_EVENT_PHOTOS_PER_TOPIC = 5;

type ReportMedia = {
  id: string;
  url: string;
  media_type: "image" | "video";
  topic?: string | null;
  size_bytes: number;
};

type ReportDetail = {
  event_date: string;
  contractor_name: string;
  title_schedule: string;
  birthday_age?: string | null;
  transport_type?: TransportType | null;
  uber_go_value?: number | null;
  uber_return_value?: number | null;
  other_car_responsible?: string | null;
  has_extra_hours?: boolean | null;
  extra_hours_details?: string | null;
  outside_brasilia: boolean;
  exclusive_event: boolean;
  team_general_description?: string | null;
  team_general_score?: number | null;
  event_difficulties?: string | null;
  event_difficulty_score?: number | null;
  event_quality_score?: number | null;
  quality_sound?: number | null;
  quality_microphone?: number | null;
  speaker_number?: number | null;
  electronics_notes?: string | null;
  media?: ReportMedia[];
  feedbacks?: Array<{
    member_id: string;
    member_name?: string | null;
    feedback: string;
  }>;
};

const STAR_STEPS = [1, 2, 3, 4, 5] as const;

function formatMemberName(member: MemberOption) {
  return member.last_name ? `${member.name} ${member.last_name}` : member.name;
}

function scoreToNumber(score: Score): number | undefined {
  if (score === "") {
    return undefined;
  }
  return Number(score);
}

function numberToScore(score?: number | null): Score {
  if (score === undefined || score === null) {
    return "";
  }
  if (score >= 0 && score <= 5) {
    return String(score) as Score;
  }
  return "";
}

function toFiles(files: FileList | null): File[] {
  if (!files || files.length === 0) {
    return [];
  }
  return Array.from(files);
}

function areSameFile(fileA: File, fileB: File) {
  return (
    fileA.name === fileB.name &&
    fileA.size === fileB.size &&
    fileA.type === fileB.type &&
    fileA.lastModified === fileB.lastModified
  );
}

function StarScoreField(props: {
  id: string;
  label: string;
  value: Score;
  onChange: (value: Score) => void;
  required?: boolean;
}) {
  const numericValue = scoreToNumber(props.value) ?? 0;

  return (
    <div className="field">
      <span>{props.label}</span>
      <div className="score-field">
        <div className="score-stars" role="radiogroup" aria-label={props.label}>
          <button
            type="button"
            className={`score-zero ${numericValue === 0 ? "active" : ""}`}
            onClick={() => props.onChange("0")}
            aria-label="Nota 0"
          >
            0
          </button>
          {STAR_STEPS.map((step) => (
            <button
              key={`${props.id}-${step}`}
              type="button"
              role="radio"
              aria-checked={numericValue === step}
              className={`score-star ${numericValue >= step ? "active" : ""}`}
              onClick={() => props.onChange(String(step) as Score)}
              aria-label={`Nota ${step}`}
            >
              ★
            </button>
          ))}
        </div>
        <strong className="score-value">{numericValue}/5</strong>
      </div>
      {props.required && props.value === "" ? (
        <span className="helper">Escolha uma nota para continuar.</span>
      ) : null}
    </div>
  );
}

function MediaUploadField(props: {
  id: string;
  name: string;
  label?: string;
  files: File[];
  existingMedia?: ReportMedia[];
  onAddFiles: (files: FileList | null) => void;
  onRemoveFile: (index: number) => void;
  onRemoveExistingMedia?: (mediaId: string) => void;
  accept?: string;
  helperText?: string;
  maxFiles?: number;
}) {
  const existingMedia = props.existingMedia ?? [];
  const totalMediaCount = props.files.length + existingMedia.length;

  const handlePreviewFile = (file: File) => {
    const previewUrl = URL.createObjectURL(file);
    window.open(previewUrl, "_blank", "noopener,noreferrer");
    setTimeout(() => {
      URL.revokeObjectURL(previewUrl);
    }, 60_000);
  };

  const handlePreviewUrl = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const isAtLimit = props.maxFiles !== undefined && totalMediaCount >= props.maxFiles;

  return (
    <div className="field full">
      {props.label ? <span style={{ fontWeight: 700, fontSize: "1.05rem" }}>{props.label}</span> : null}
      <div className="media-upload-row">
        {!isAtLimit && (
          <label className="profile-photo-upload" htmlFor={props.id}>
            <span>Adicionar mídia</span>
            <input
              id={props.id}
              name={props.name}
              className="profile-photo-input"
              type="file"
              accept={props.accept}
              multiple
              onChange={(event) => {
                if (!event.target.files?.length) return;
                props.onAddFiles(event.target.files);
                event.target.value = "";
              }}
              onInput={(event) => {
                // Fallback para Android/MIUI que dispara 'input' mas não 'change'
                const input = event.target as HTMLInputElement;
                if (!input.files?.length) return;
                props.onAddFiles(input.files);
                input.value = "";
              }}
            />
          </label>
        )}
        {props.helperText ? <small className="helper">{props.helperText}</small> : null}
        {props.files.length === 0 && existingMedia.length === 0 ? (
          <small className="helper media-upload-file-name">Nenhuma foto adicionada.</small>
        ) : (
          <ul className="media-upload-list">
            {/* Existing media */}
            {existingMedia.map((media) => (
              <li key={`existing-${media.id}`} className="media-upload-item">
                <span className="media-upload-file-name">{media.url.split("/").pop()}</span>
                <div className="media-upload-actions">
                  <button
                    type="button"
                    className="button secondary small"
                    onClick={() => handlePreviewUrl(media.url)}
                  >
                    Visualizar
                  </button>
                  <button
                    type="button"
                    className="button secondary small"
                    onClick={() => props.onRemoveExistingMedia?.(media.id)}
                  >
                    Remover
                  </button>
                </div>
              </li>
            ))}
            {/* New files */}
            {props.files.map((file, index) => (
              <li key={`${file.name}-${file.lastModified}-${index}`} className="media-upload-item">
                <span className="media-upload-file-name">{file.name}</span>
                <div className="media-upload-actions">
                  <button
                    type="button"
                    className="button secondary small"
                    onClick={() => handlePreviewFile(file)}
                  >
                    Visualizar
                  </button>
                  <button
                    type="button"
                    className="button secondary small"
                    onClick={() => props.onRemoveFile(index)}
                  >
                    Remover
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function NovoRelatorioContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reportIdToEdit = searchParams.get("editar");
  const isEditMode = Boolean(reportIdToEdit);
  const [eventDate, setEventDate] = useState("");
  const [titleSchedule, setTitleSchedule] = useState("");
  const [birthdayContractor, setBirthdayContractor] = useState("");
  const [birthdayAge, setBirthdayAge] = useState("");

  const [transportType, setTransportType] = useState<TransportType>("uber99");
  const [uberGoValue, setUberGoValue] = useState("");
  const [uberReturnValue, setUberReturnValue] = useState("");
  const [otherCarResponsible, setOtherCarResponsible] = useState("");

  const [hasExtraHours, setHasExtraHours] = useState<YesNo>("nao");
  const [extraHoursDetails, setExtraHoursDetails] = useState("");

  const [outsideBrasilia, setOutsideBrasilia] = useState(false);
  const [exclusiveEvent, setExclusiveEvent] = useState(false);

  const [teamGeneralDescription, setTeamGeneralDescription] = useState("");
  const [teamGeneralScore, setTeamGeneralScore] = useState<Score>("");
  const [memberSearch, setMemberSearch] = useState("");
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState("");
  const [teamMemberFeedbacks, setTeamMemberFeedbacks] = useState<TeamMemberFeedback[]>([]);

  const [eventDifficulties, setEventDifficulties] = useState("");
  const [eventDifficultyScore, setEventDifficultyScore] = useState<Score>("");
  const [eventQualityScore, setEventQualityScore] = useState<Score>("");

  const [soundQualityScore, setSoundQualityScore] = useState<Score>("");
  const [microphoneQualityScore, setMicrophoneQualityScore] = useState<Score>("");
  const [speakerNumber, setSpeakerNumber] = useState("");
  const [electronicsNotes, setElectronicsNotes] = useState("");
  const [damageImages, setDamageImages] = useState<File[]>([]);
  const [existingDamageMedia, setExistingDamageMedia] = useState<ReportMedia[]>([]);

  const [paintingFiles, setPaintingFiles] = useState<File[]>([]);
  const [existingPaintingMedia, setExistingPaintingMedia] = useState<ReportMedia[]>([]);

  const [balloonFiles, setBalloonFiles] = useState<File[]>([]);
  const [existingBalloonMedia, setExistingBalloonMedia] = useState<ReportMedia[]>([]);

  const [animationFiles, setAnimationFiles] = useState<File[]>([]);
  const [existingAnimationMedia, setExistingAnimationMedia] = useState<ReportMedia[]>([]);

  const [charactersFiles, setCharactersFiles] = useState<File[]>([]);
  const [existingCharactersMedia, setExistingCharactersMedia] = useState<ReportMedia[]>([]);

  const [workshopsFiles, setWorkshopsFiles] = useState<File[]>([]);
  const [existingWorkshopsMedia, setExistingWorkshopsMedia] = useState<ReportMedia[]>([]);

  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingReport, setLoadingReport] = useState(false);

  useEffect(() => {
    const user = getStoredUser();
    if (!user) {
      router.push("/login");
      return;
    }
    if (!isRoleAllowed(user.role, ["admin", "animador"])) {
      router.push(getDefaultRoute(user.role));
    }
  }, [router]);

  useEffect(() => {
    if (!reportIdToEdit) return;

    let mounted = true;
    setLoadingReport(true);
    setSubmitError("");

    getReportById(reportIdToEdit)
      .then((response) => {
        if (!mounted) return;
        const report = response?.data as ReportDetail;
        setEventDate(report.event_date ? isoToDisplay(report.event_date) : "");
        setTitleSchedule(report.title_schedule ?? "");
        setBirthdayContractor(report.contractor_name ?? "");
        setBirthdayAge(report.birthday_age ?? "");
        setTransportType((report.transport_type as TransportType) ?? "uber99");
        setUberGoValue(report.uber_go_value != null ? String(report.uber_go_value) : "");
        setUberReturnValue(
          report.uber_return_value != null ? String(report.uber_return_value) : ""
        );
        setOtherCarResponsible(report.other_car_responsible ?? "");
        setHasExtraHours(
          report.has_extra_hours === true ||
            Boolean(report.extra_hours_details && report.extra_hours_details.trim())
            ? "sim"
            : "nao"
        );
        setExtraHoursDetails(report.extra_hours_details ?? "");
        setOutsideBrasilia(Boolean(report.outside_brasilia));
        setExclusiveEvent(Boolean(report.exclusive_event));
        setTeamGeneralDescription(report.team_general_description ?? "");
        setTeamGeneralScore(numberToScore(report.team_general_score));
        setEventDifficulties(report.event_difficulties ?? "");
        setEventDifficultyScore(numberToScore(report.event_difficulty_score));
        setEventQualityScore(numberToScore(report.event_quality_score));
        setSoundQualityScore(numberToScore(report.quality_sound));
        setMicrophoneQualityScore(numberToScore(report.quality_microphone));
        setSpeakerNumber(
          report.speaker_number !== undefined && report.speaker_number !== null
            ? String(report.speaker_number)
            : ""
        );
        setElectronicsNotes(report.electronics_notes ?? "");
        setTeamMemberFeedbacks(
          (report.feedbacks ?? []).map((item) => ({
            id: item.member_id,
            name: item.member_name?.trim() || item.member_id,
            feedback: item.feedback,
          }))
        );

        // Restore existing media
        const media = report.media ?? [];
        setExistingDamageMedia(media.filter((m) => !m.topic));
        setExistingPaintingMedia(media.filter((m) => m.topic === "Pintura"));
        setExistingBalloonMedia(media.filter((m) => m.topic === "Balão"));
        setExistingAnimationMedia(media.filter((m) => m.topic === "Animação"));
        setExistingCharactersMedia(media.filter((m) => m.topic === "Personagens"));
        setExistingWorkshopsMedia(media.filter((m) => m.topic === "Oficinas"));
      })
      .catch((error) => {
        if (!mounted) return;
        setSubmitError(
          error instanceof Error
            ? error.message
            : "Não foi possível carregar o relatório para edição."
        );
      })
      .finally(() => {
        if (!mounted) return;
        setLoadingReport(false);
      });

    return () => {
      mounted = false;
    };
  }, [reportIdToEdit]);

  useEffect(() => {
    let mounted = true;
    setMembersLoading(true);
    setMembersError("");
    getMembers({ limit: 200 })
      .then((response) => {
        if (!mounted) return;
        const list = Array.isArray(response?.data) ? (response.data as MemberOption[]) : [];
        setMembers(list);
      })
      .catch(() => {
        if (!mounted) return;
        setMembersError("Não foi possível carregar os membros da equipe.");
      })
      .finally(() => {
        if (!mounted) return;
        setMembersLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const selectedMemberIds = useMemo(
    () => new Set(teamMemberFeedbacks.map((member) => member.id)),
    [teamMemberFeedbacks]
  );

  const filteredMembers = useMemo(() => {
    const search = normalizeString(memberSearch.trim());
    return members
      .filter((member) => !selectedMemberIds.has(member.id))
      .filter((member) => {
        if (!search) return true;
        return normalizeString(formatMemberName(member)).includes(search);
      });
  }, [memberSearch, members, selectedMemberIds]);

  const handleSelectMember = (member: MemberOption) => {
    setTeamMemberFeedbacks((prev) => [
      ...prev,
      { id: member.id, name: formatMemberName(member), feedback: "" },
    ]);
    setMemberSearch("");
  };

  const handleChangeMemberFeedback = (memberId: string, feedback: string) => {
    setTeamMemberFeedbacks((prev) =>
      prev.map((member) => (member.id === memberId ? { ...member, feedback } : member))
    );
  };

  const handleRemoveMemberFeedback = (memberId: string) => {
    setTeamMemberFeedbacks((prev) => prev.filter((member) => member.id !== memberId));
  };

  const addFilesWithoutDuplicates = (currentFiles: File[], incomingFiles: FileList | File[] | null) => {
    const nextFiles = [...currentFiles];
    const incomingFileArray = Array.isArray(incomingFiles) ? incomingFiles : toFiles(incomingFiles);
    for (const incomingFile of incomingFileArray) {
      const alreadyAdded = nextFiles.some((existingFile) => areSameFile(existingFile, incomingFile));
      if (!alreadyAdded) {
        nextFiles.push(incomingFile);
      }
    }
    return nextFiles;
  };

  const handleEventPhotosTopicAdd = (
    topicName: string,
    files: FileList | null,
    currentFiles: File[],
    setFiles: (nextFiles: File[]) => void
  ) => {
    const fileArray = toFiles(files);

    // Validate each file
    for (const file of fileArray) {
      const error = getMediaValidationError(file);
      if (error) {
        setSubmitError(error);
        return;
      }
    }

    const nextFiles = addFilesWithoutDuplicates(currentFiles, fileArray);
    if (nextFiles.length > MAX_EVENT_PHOTOS_PER_TOPIC) {
      setSubmitError(
        `${topicName}: o máximo permitido é ${MAX_EVENT_PHOTOS_PER_TOPIC} imagens por tópico.`
      );
      return;
    }
    setSubmitError("");
    setFiles(nextFiles);
  };

  const handleDamageImagesAdd = (files: FileList | null) => {
    const fileArray = toFiles(files);

    // Validate each file
    for (const file of fileArray) {
      const error = getMediaValidationError(file);
      if (error) {
        setSubmitError(error);
        return;
      }
    }

    setSubmitError("");
    setDamageImages((prev) => addFilesWithoutDuplicates(prev, fileArray));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitError("");
    setIsSubmitting(true);

    const reportPayload = {
      event_date: displayToIsoWithShortYear(eventDate),
      contractor_name: birthdayContractor.trim(),
      title_schedule: titleSchedule.trim(),
      birthday_age: birthdayAge.trim() || undefined,
      transport_type: transportType,
      uber_go_value:
        transportType === "uber99" && uberGoValue.trim()
          ? Number(uberGoValue)
          : undefined,
      uber_return_value:
        transportType === "uber99" && uberReturnValue.trim()
          ? Number(uberReturnValue)
          : undefined,
      other_car_responsible:
        transportType === "outro" && otherCarResponsible.trim()
          ? otherCarResponsible.trim()
          : undefined,
      has_extra_hours:
        hasExtraHours === "" ? undefined : hasExtraHours === "sim",
      extra_hours_details:
        hasExtraHours === "sim" && extraHoursDetails.trim()
          ? extraHoursDetails.trim()
          : undefined,
      outside_brasilia: outsideBrasilia,
      exclusive_event: exclusiveEvent,
      team_summary: teamGeneralDescription.trim() || "Nao informado",
      team_general_description: teamGeneralDescription.trim() || undefined,
      team_general_score: scoreToNumber(teamGeneralScore),
      event_difficulties: eventDifficulties.trim() || undefined,
      event_difficulty_score: scoreToNumber(eventDifficultyScore),
      event_quality_score: scoreToNumber(eventQualityScore),
      quality_sound: scoreToNumber(soundQualityScore),
      quality_microphone: scoreToNumber(microphoneQualityScore),
      speaker_number: speakerNumber.trim() ? Number(speakerNumber) : undefined,
      electronics_notes: electronicsNotes.trim() || undefined,
      feedbacks: teamMemberFeedbacks
        .filter((member) => member.feedback.trim())
        .map((member) => ({
          member_id: member.id,
          feedback: member.feedback.trim(),
        })),
    };

    const eventPhotoTopics = [
      { topic: "Pintura", files: paintingFiles },
      { topic: "Balão", files: balloonFiles },
      { topic: "Animação", files: animationFiles },
      { topic: "Personagens", files: charactersFiles },
      { topic: "Oficinas", files: workshopsFiles },
    ];

    const topicOverLimit = eventPhotoTopics.find(
      ({ files }) => files.length > MAX_EVENT_PHOTOS_PER_TOPIC
    );

    if (topicOverLimit) {
      setSubmitError(
        `${topicOverLimit.topic}: o máximo permitido é ${MAX_EVENT_PHOTOS_PER_TOPIC} imagens por tópico.`
      );
      setIsSubmitting(false);
      return;
    }

    const mediaFilesWithTopic: Array<{ file: File; topic?: string }> = [
      ...damageImages.map((file) => ({ file, topic: undefined })),
      ...eventPhotoTopics.flatMap(({ topic, files }) =>
        files.map((file) => ({ file, topic }))
      ),
    ];

    // Debug logging
    console.log(`[SUBMIT] Total media files: ${mediaFilesWithTopic.length}, Painting files: ${paintingFiles.length}, Damage files: ${damageImages.length}`, mediaFilesWithTopic.map(m => ({ name: m.file.name, topic: m.topic })));

    const invalidFiles = mediaFilesWithTopic.filter(({ file }) => {
      const mimeType = (file.type || "").toLowerCase();
      return !mimeType.startsWith("image/") && !mimeType.startsWith("video/");
    });

    if (invalidFiles.length > 0) {
      const invalidNames = invalidFiles.map(({ file }) => file.name).join(", ");
      setSubmitError(
        `Alguns arquivos nao sao imagem/video: ${invalidNames}. Remova esses arquivos e tente novamente.`
      );
      setIsSubmitting(false);
      return;
    }

    try {
      let reportId = reportIdToEdit ?? undefined;

      if (isEditMode && reportIdToEdit) {
        await updateReport(reportIdToEdit, reportPayload);
      } else {
        const createResponse = await createReport(reportPayload);
        reportId = createResponse?.data?.id as string | undefined;
        if (!reportId) {
          throw new Error("Relatorio criado sem identificador.");
        }
      }

      if (!reportId) {
        throw new Error("Relatorio sem identificador.");
      }

      await Promise.all(
        mediaFilesWithTopic.map(({ file, topic }) => uploadReportMedia(reportId, file, topic))
      );

      router.push("/relatorios");
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Não foi possível salvar o relatório."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="app-page">
      <section className="shell reveal">
        <header className="page-header">
          <div>
            <h1 className="hero-title">
              {isEditMode ? "Editar Relatório" : "Novo Relatório"}
            </h1>
          </div>
          <Link className="button secondary" href="/relatorios">
            Voltar
          </Link>
        </header>

        {loadingReport ? (
          <div className="empty-state">
            <p>Carregando relatório para edição...</p>
          </div>
        ) : null}

        {!loadingReport && (
        <form className="form-layout" onSubmit={handleSubmit}>
          <article className="form-card">
            <div className="form-card-head">
              <h2 className="section-title">Informações do Evento</h2>
              <p>Dados principais do evento.</p>
            </div>
            <div className="form-grid">
              <label className="field" htmlFor="eventDate">
                <span>Data do evento (obrigatório)</span>
                <input
                  id="eventDate"
                  name="eventDate"
                  className="input"
                  type="text"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="DD/MM/AAAA"
                  value={eventDate}
                  onChange={(event) => setEventDate(formatDateInput(event.target.value))}
                  required
                />
              </label>

              <label className="field" htmlFor="titleSchedule">
                <span>Título / Cronograma (obrigatório)</span>
                <input
                  id="titleSchedule"
                  name="titleSchedule"
                  className="input"
                  type="text"
                  maxLength={300}
                  value={titleSchedule}
                  onChange={(event) => setTitleSchedule(event.target.value)}
                  required
                />
              </label>

              <div className="field">
                <label htmlFor="birthdayContractor">
                  <span>Aniversariante (obrigatório)</span>
                </label>
                <small className="helper">Caso não tenha aniversariante, colocar contratante ou empresa responsável</small>
                <input
                  id="birthdayContractor"
                  name="birthdayContractor"
                  className="input"
                  type="text"
                  maxLength={250}
                  value={birthdayContractor}
                  onChange={(event) => setBirthdayContractor(event.target.value)}
                  required
                />
              </div>

              <label className="field" htmlFor="birthdayAge" style={{ alignContent: "end" }}>
                <span>Idade do aniversariante</span>
                <input
                  id="birthdayAge"
                  name="birthdayAge"
                  className="input"
                  type="text"
                  value={birthdayAge}
                  onChange={(event) => setBirthdayAge(event.target.value)}
                />
              </label>
            </div>
          </article>

          <article className="form-card">
            <div className="form-card-head">
              <h2 className="section-title">Locomoção</h2>
            </div>
            <div className="form-grid">
              <label className="field" htmlFor="transportType">
                <span>Tipo de locomoção</span>
                <select
                  id="transportType"
                  name="transportType"
                  className="input"
                  value={transportType}
                  onChange={(event) => setTransportType(event.target.value as TransportType)}
                  required
                >
                  <option value="uber99">Uber/99</option>
                  <option value="carro_empresa">Carro da Empresa</option>
                  <option value="outro">Carro Pessoal</option>
                </select>
              </label>

              <label className="field" htmlFor="hasExtraHours">
                <span>Teve hora extra?</span>
                <select
                  id="hasExtraHours"
                  name="hasExtraHours"
                  className="input"
                  value={hasExtraHours}
                  onChange={(event) => setHasExtraHours(event.target.value as YesNo)}
                >
                  <option value="sim">Sim</option>
                  <option value="nao">Não</option>
                </select>
              </label>

              {transportType === "uber99" && (
                <>
                  <label className="field" htmlFor="uberGoValue">
                    <span>Valor do Uber na ida</span>
                    <input
                      id="uberGoValue"
                      name="uberGoValue"
                      className="input"
                      type="number"
                      step="0.01"
                      min="0"
                      value={uberGoValue}
                      onChange={(event) => setUberGoValue(event.target.value)}
                      required
                    />
                  </label>
                  <label className="field" htmlFor="uberReturnValue">
                    <span>Valor do Uber na volta</span>
                    <input
                      id="uberReturnValue"
                      name="uberReturnValue"
                      className="input"
                      type="number"
                      step="0.01"
                      min="0"
                      value={uberReturnValue}
                      onChange={(event) => setUberReturnValue(event.target.value)}
                      required
                    />
                  </label>
                </>
              )}

              {transportType === "outro" && (
                <label className="field full" htmlFor="otherCarResponsible">
                  <span>Responsável pelo carro</span>
                  <input
                    id="otherCarResponsible"
                    name="otherCarResponsible"
                    className="input"
                    type="text"
                    maxLength={150}
                    value={otherCarResponsible}
                    onChange={(event) => setOtherCarResponsible(event.target.value)}
                    required
                  />
                </label>
              )}

              {hasExtraHours === "sim" && (
                <label className="field full" htmlFor="extraHoursDetails">
                  <span>Quantas horas extras</span>
                  <input
                    id="extraHoursDetails"
                    name="extraHoursDetails"
                    className="input"
                    type="text"
                    value={extraHoursDetails}
                    onChange={(event) => setExtraHoursDetails(event.target.value)}
                    required
                  />
                </label>
              )}
            </div>

            <div className="toggle-row">
              <label className="toggle-card" htmlFor="outsideBrasilia">
                <span>Fora de Brasília</span>
                <span className="switch">
                  <input
                    id="outsideBrasilia"
                    type="checkbox"
                    checked={outsideBrasilia}
                    onChange={(event) => setOutsideBrasilia(event.target.checked)}
                  />
                  <span className="slider" />
                </span>
              </label>
              <label className="toggle-card" htmlFor="exclusiveEvent">
                <span>Exclusividade</span>
                <span className="switch">
                  <input
                    id="exclusiveEvent"
                    type="checkbox"
                    checked={exclusiveEvent}
                    onChange={(event) => setExclusiveEvent(event.target.checked)}
                  />
                  <span className="slider" />
                </span>
              </label>
            </div>
          </article>

          <article className="form-card">
            <div className="form-card-head team-feedback-title-head">
              <h2 className="section-title team-feedback-title">Feedback da Equipe</h2>
            </div>
            <div className="team-feedback-summary">
              <label className="field full" htmlFor="teamGeneralDescription">
                <span>Descrição geral da equipe (obrigatório)</span>
                <textarea
                  id="teamGeneralDescription"
                  name="teamGeneralDescription"
                  className="input"
                  rows={5}
                  value={teamGeneralDescription}
                  onChange={(event) => setTeamGeneralDescription(event.target.value)}
                  required
                />
              </label>
              <StarScoreField
                id="teamGeneralScore"
                label="Avaliação geral da equipe (0 a 5)"
                value={teamGeneralScore}
                onChange={setTeamGeneralScore}
              />
            </div>

            <div className="form-card-head team-feedback-individual-head">
              <h3 className="section-title">Aba de feedback individual por membro</h3>
              <p>Busque membros da equipe, selecione e escreva feedback para cada um.</p>
            </div>

            <label className="field full" htmlFor="memberSearch">
              <span>Buscar membro</span>
              <input
                id="memberSearch"
                name="memberSearch"
                className="input"
                type="text"
                placeholder="Digite o nome do membro"
                value={memberSearch}
                onChange={(event) => setMemberSearch(event.target.value)}
              />
            </label>

            {membersError && <p className="text-red-500">{membersError}</p>}
            {membersLoading && <p className="helper">Carregando membros...</p>}
            {!membersLoading && memberSearch.trim().length > 0 && (
              <div className="member-autocomplete" aria-label="Resultados da busca de membros">
                {filteredMembers.length === 0 ? (
                  <div className="member-autocomplete-empty">Nenhum membro encontrado.</div>
                ) : (
                  filteredMembers.slice(0, 8).map((member) => (
                    <button
                      key={member.id}
                      type="button"
                      className="member-autocomplete-item"
                      onClick={() => handleSelectMember(member)}
                    >
                      {formatMemberName(member)}
                    </button>
                  ))
                )}
              </div>
            )}

            <div className="team-feedback-list">
              {teamMemberFeedbacks.length === 0 ? (
                <p className="helper">Nenhum membro selecionado para feedback individual.</p>
              ) : (
                teamMemberFeedbacks.map((member) => (
                  <div key={member.id} className="team-feedback-item">
                    <div className="team-feedback-item-head">
                      <strong>{member.name}</strong>
                      <button
                        className="button secondary"
                        type="button"
                        onClick={() => handleRemoveMemberFeedback(member.id)}
                      >
                        Remover
                      </button>
                    </div>
                    <textarea
                      className="input"
                      rows={3}
                      placeholder="Escreva o feedback individual"
                      value={member.feedback}
                      onChange={(event) =>
                        handleChangeMemberFeedback(member.id, event.target.value)
                      }
                    />
                  </div>
                ))
              )}
            </div>
          </article>

          <article className="form-card">
            <div className="form-card-head">
              <h2 className="section-title">Descrição do Evento</h2>
            </div>
            <div className="form-grid">
              <label className="field full" htmlFor="eventDifficulties">
                <span>Dificuldades e problemas do evento</span>
                <textarea
                  id="eventDifficulties"
                  name="eventDifficulties"
                  className="input"
                  rows={5}
                  value={eventDifficulties}
                  onChange={(event) => setEventDifficulties(event.target.value)}
                />
              </label>
              <StarScoreField
                id="eventDifficultyScore"
                label="Dificuldade do evento (0 a 5)"
                value={eventDifficultyScore}
                onChange={setEventDifficultyScore}
              />
              <StarScoreField
                id="eventQualityScore"
                label="Qualidade do evento (0 a 5)"
                value={eventQualityScore}
                onChange={setEventQualityScore}
              />
            </div>
          </article>

          <article className="form-card">
            <div className="form-card-head">
              <h2 className="section-title">Eletrônicos</h2>
            </div>
            <div className="form-grid">
              <StarScoreField
                id="soundQualityScore"
                label="Qualidade da caixa de som (0 a 5)"
                value={soundQualityScore}
                onChange={setSoundQualityScore}
              />
              <StarScoreField
                id="microphoneQualityScore"
                label="Qualidade do microfone (0 a 5)"
                value={microphoneQualityScore}
                onChange={setMicrophoneQualityScore}
              />
              <label className="field" htmlFor="speakerNumber">
                <span>Número da caixa de som</span>
                <input
                  id="speakerNumber"
                  name="speakerNumber"
                  className="input"
                  type="number"
                  min="0"
                  step="1"
                  value={speakerNumber}
                  onChange={(event) => setSpeakerNumber(event.target.value)}
                />
              </label>
              <label className="field full" htmlFor="electronicsNotes">
                <span>Observações (Opcional)</span>
                <textarea
                  id="electronicsNotes"
                  name="electronicsNotes"
                  className="input"
                  rows={4}
                  value={electronicsNotes}
                  onChange={(event) => setElectronicsNotes(event.target.value)}
                />
              </label>
              <MediaUploadField
                id="damageImages"
                name="damageImages"
                label="Imagens de avaria no material (caso tenha)"
                files={damageImages}
                existingMedia={existingDamageMedia}
                onAddFiles={handleDamageImagesAdd}
                onRemoveFile={(index) =>
                  setDamageImages((prev) => prev.filter((_, fileIndex) => fileIndex !== index))
                }
                onRemoveExistingMedia={(mediaId) =>
                  setExistingDamageMedia((prev) => prev.filter((m) => m.id !== mediaId))
                }
                accept="image/*,video/*"
              />
            </div>
          </article>

          <article className="form-card">
            <div className="form-card-head">
              <h2 className="section-title">Fotos do Evento</h2>
            </div>
            <div className="form-grid">
              <MediaUploadField
                id="paintingFiles"
                name="paintingFiles"
                label="Pintura (caso tenha)"
                files={paintingFiles}
                existingMedia={existingPaintingMedia}
                onAddFiles={(files) =>
                  handleEventPhotosTopicAdd("Pintura", files, paintingFiles, setPaintingFiles)
                }
                onRemoveFile={(index) =>
                  setPaintingFiles((prev) => prev.filter((_, fileIndex) => fileIndex !== index))
                }
                onRemoveExistingMedia={(mediaId) =>
                  setExistingPaintingMedia((prev) => prev.filter((m) => m.id !== mediaId))
                }
                accept="image/*,video/*"
                helperText={`Máximo de ${MAX_EVENT_PHOTOS_PER_TOPIC} fotos.`}
                maxFiles={MAX_EVENT_PHOTOS_PER_TOPIC}
              />
              <MediaUploadField
                id="balloonFiles"
                name="balloonFiles"
                label="Balão (caso tenha)"
                files={balloonFiles}
                existingMedia={existingBalloonMedia}
                onAddFiles={(files) =>
                  handleEventPhotosTopicAdd("Balão", files, balloonFiles, setBalloonFiles)
                }
                onRemoveFile={(index) =>
                  setBalloonFiles((prev) => prev.filter((_, fileIndex) => fileIndex !== index))
                }
                onRemoveExistingMedia={(mediaId) =>
                  setExistingBalloonMedia((prev) => prev.filter((m) => m.id !== mediaId))
                }
                accept="image/*,video/*"
                helperText={`Máximo de ${MAX_EVENT_PHOTOS_PER_TOPIC} fotos.`}
                maxFiles={MAX_EVENT_PHOTOS_PER_TOPIC}
              />
              <MediaUploadField
                id="animationFiles"
                name="animationFiles"
                label="Animação (caso tenha)"
                files={animationFiles}
                existingMedia={existingAnimationMedia}
                onAddFiles={(files) =>
                  handleEventPhotosTopicAdd("Animação", files, animationFiles, setAnimationFiles)
                }
                onRemoveFile={(index) =>
                  setAnimationFiles((prev) => prev.filter((_, fileIndex) => fileIndex !== index))
                }
                onRemoveExistingMedia={(mediaId) =>
                  setExistingAnimationMedia((prev) => prev.filter((m) => m.id !== mediaId))
                }
                accept="image/*,video/*"
                helperText={`Máximo de ${MAX_EVENT_PHOTOS_PER_TOPIC} fotos.`}
                maxFiles={MAX_EVENT_PHOTOS_PER_TOPIC}
              />
              <MediaUploadField
                id="charactersFiles"
                name="charactersFiles"
                label="Personagens (caso tenha)"
                files={charactersFiles}
                existingMedia={existingCharactersMedia}
                onAddFiles={(files) =>
                  handleEventPhotosTopicAdd(
                    "Personagens",
                    files,
                    charactersFiles,
                    setCharactersFiles
                  )
                }
                onRemoveFile={(index) =>
                  setCharactersFiles((prev) => prev.filter((_, fileIndex) => fileIndex !== index))
                }
                onRemoveExistingMedia={(mediaId) =>
                  setExistingCharactersMedia((prev) => prev.filter((m) => m.id !== mediaId))
                }
                accept="image/*,video/*"
                helperText={`Máximo de ${MAX_EVENT_PHOTOS_PER_TOPIC} fotos.`}
                maxFiles={MAX_EVENT_PHOTOS_PER_TOPIC}
              />
              <MediaUploadField
                id="workshopsFiles"
                name="workshopsFiles"
                label="Oficinas (caso tenha)"
                files={workshopsFiles}
                existingMedia={existingWorkshopsMedia}
                onAddFiles={(files) =>
                  handleEventPhotosTopicAdd("Oficinas", files, workshopsFiles, setWorkshopsFiles)
                }
                onRemoveFile={(index) =>
                  setWorkshopsFiles((prev) => prev.filter((_, fileIndex) => fileIndex !== index))
                }
                onRemoveExistingMedia={(mediaId) =>
                  setExistingWorkshopsMedia((prev) => prev.filter((m) => m.id !== mediaId))
                }
                accept="image/*,video/*"
                helperText={`Máximo de ${MAX_EVENT_PHOTOS_PER_TOPIC} fotos.`}
                maxFiles={MAX_EVENT_PHOTOS_PER_TOPIC}
              />
            </div>
          </article>

          <div className="form-actions">
            <div>
              <p className="helper">Revise as informações antes de salvar.</p>
              {submitError ? <p className="text-red-500">{submitError}</p> : null}
            </div>
            <div className="form-buttons">
              <Link className="button secondary" href="/relatorios">
                Cancelar
              </Link>
              <button type="submit" className="button" disabled={isSubmitting}>
                {isSubmitting
                  ? "Salvando..."
                  : isEditMode
                    ? "Salvar alterações"
                    : "Salvar"}
              </button>
            </div>
          </div>
        </form>
        )}
      </section>
    </main>
  );
}

export default function NovoRelatorioPage() {
  return (
    <Suspense>
      <NovoRelatorioContent />
    </Suspense>
  );
}
