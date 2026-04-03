"use client";

import "./page.css";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { DateSelectArg, DatesSetArg, EventClickArg } from "@fullcalendar/core";
import ptBrLocale from "@fullcalendar/core/locales/pt-br";
import {
  type AgendaEvent,
  type AgendaEventInput,
  createAgendaEvent,
  deleteAgendaEvent,
  getAgendaEvents,
  getErrorMessage,
  updateAgendaEvent,
} from "../../lib/api";
import { getDefaultRoute, getStoredUser, isRoleAllowed, type Role } from "../../lib/auth";

interface EventForm {
  title: string;
  start: string;
  end: string;
  description: string;
  attendees: string;
}

const EMPTY_FORM: EventForm = {
  title: "",
  start: "",
  end: "",
  description: "",
  attendees: "",
};

function toDatetimeLocal(iso: string): string {
  if (!iso) return "";
  // ISO 8601 → datetime-local input value (YYYY-MM-DDTHH:mm)
  return iso.slice(0, 16);
}

function toFullCalendarEvents(events: AgendaEvent[]) {
  return events.map((e) => ({
    id: e.id,
    title: e.title,
    start: e.start,
    end: e.end,
    extendedProps: {
      description: e.description,
      attendees: e.attendees,
    },
  }));
}

export default function AgendaPage() {
  const router = useRouter();
  const calendarRef = useRef<FullCalendar>(null);
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [form, setForm] = useState<EventForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  useEffect(() => {
    const user = getStoredUser();
    if (!user) {
      router.push("/login");
      return;
    }
    if (!isRoleAllowed(user.role as Role, ["recreador", "animador", "admin"])) {
      router.push(getDefaultRoute(user.role as Role));
    }
  }, [router]);

  const loadEvents = async (timeMin: string, timeMax: string) => {
    try {
      const data = await getAgendaEvents(timeMin, timeMax);
      setEvents(data);
    } catch {
      setEvents([]);
    }
  };

  const handleDatesSet = (info: DatesSetArg) => {
    loadEvents(info.startStr, info.endStr);
  };

  const openCreateModal = (info: DateSelectArg) => {
    setEditingEventId(null);
    setModalError(null);
    setForm({
      title: "",
      start: toDatetimeLocal(info.startStr),
      end: toDatetimeLocal(info.endStr),
      description: "",
      attendees: "",
    });
    setModalOpen(true);
  };

  const openEditModal = (info: EventClickArg) => {
    setEditingEventId(info.event.id);
    setModalError(null);
    setForm({
      title: info.event.title,
      start: toDatetimeLocal(info.event.startStr),
      end: toDatetimeLocal(info.event.endStr),
      description: info.event.extendedProps.description ?? "",
      attendees: (info.event.extendedProps.attendees as string[] ?? []).join(", "),
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      setModalError("Título é obrigatório.");
      return;
    }
    if (!form.start || !form.end) {
      setModalError("Data/hora de início e fim são obrigatórias.");
      return;
    }

    const attendeeList = form.attendees
      ? form.attendees.split(",").map((e) => e.trim()).filter(Boolean)
      : [];

    const payload: AgendaEventInput = {
      title: form.title.trim(),
      start: form.start,
      end: form.end,
      description: form.description.trim() || undefined,
      attendees: attendeeList.length > 0 ? attendeeList : undefined,
    };

    setSaving(true);
    setModalError(null);
    try {
      if (editingEventId) {
        await updateAgendaEvent(editingEventId, payload);
      } else {
        await createAgendaEvent(payload);
      }
      setModalOpen(false);
      // Reload events for current visible range
      const api = calendarRef.current?.getApi();
      if (api) {
        const view = api.view;
        await loadEvents(view.activeStart.toISOString(), view.activeEnd.toISOString());
      }
    } catch (err) {
      setModalError(getErrorMessage(err, "Erro ao salvar evento."));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editingEventId) return;
    setDeleting(true);
    setModalError(null);
    try {
      await deleteAgendaEvent(editingEventId);
      setModalOpen(false);
      const api = calendarRef.current?.getApi();
      if (api) {
        const view = api.view;
        await loadEvents(view.activeStart.toISOString(), view.activeEnd.toISOString());
      }
    } catch (err) {
      setModalError(getErrorMessage(err, "Erro ao deletar evento."));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <main className="app-page agenda-page">
      <div className="agenda-calendar-wrapper">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          locale={ptBrLocale}
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek,timeGridDay",
          }}
          height="calc(100vh - 160px)"
          selectable
          selectMirror
          editable={false}
          events={toFullCalendarEvents(events)}
          datesSet={handleDatesSet}
          select={openCreateModal}
          eventClick={openEditModal}
        />
      </div>

      {modalOpen && (
        <div
          className="agenda-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalOpen(false);
          }}
        >
          <div className="agenda-modal" role="dialog" aria-modal="true" aria-label="Evento">
            <h2 className="agenda-modal-title">
              {editingEventId ? "Editar evento" : "Novo evento"}
            </h2>

            <div className="agenda-modal-fields">
              <label className="agenda-modal-field">
                <span>Título *</span>
                <input
                  className="input"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Título do evento"
                  autoFocus
                />
              </label>

              <label className="agenda-modal-field">
                <span>Início *</span>
                <input
                  className="input"
                  type="datetime-local"
                  value={form.start}
                  onChange={(e) => setForm((f) => ({ ...f, start: e.target.value }))}
                />
              </label>

              <label className="agenda-modal-field">
                <span>Fim *</span>
                <input
                  className="input"
                  type="datetime-local"
                  value={form.end}
                  onChange={(e) => setForm((f) => ({ ...f, end: e.target.value }))}
                />
              </label>

              <label className="agenda-modal-field">
                <span>Descrição</span>
                <textarea
                  className="input"
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Descrição opcional"
                />
              </label>

              <label className="agenda-modal-field">
                <span>Participantes (e-mails separados por vírgula)</span>
                <input
                  className="input"
                  value={form.attendees}
                  onChange={(e) => setForm((f) => ({ ...f, attendees: e.target.value }))}
                  placeholder="email1@ex.com, email2@ex.com"
                />
              </label>
            </div>

            {modalError && (
              <p className="agenda-modal-error" role="alert">
                {modalError}
              </p>
            )}

            <div className="agenda-modal-actions">
              {editingEventId && (
                <button
                  type="button"
                  className="button danger"
                  onClick={handleDelete}
                  disabled={deleting || saving}
                >
                  {deleting ? "Deletando..." : "Deletar"}
                </button>
              )}
              <button
                type="button"
                className="button secondary"
                onClick={() => setModalOpen(false)}
                disabled={saving || deleting}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="button"
                onClick={handleSave}
                disabled={saving || deleting}
              >
                {saving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
