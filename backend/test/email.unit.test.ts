import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  sendCourseCreatedEmail,
  sendEnrollmentConfirmationEmail,
  sendSuspensionEmail,
  sendWarningEmail,
} from "../src/lib/email.js";
import type { CourseRecord } from "../src/cursos/store.js";
import type { UserRecord } from "../src/auth/store.js";
import type { WarningRecord, SuspensionRecord } from "../src/advertencias/store.js";

const mockFetch = vi.fn();

const fakeCourse: CourseRecord = {
  id: "course-1",
  createdBy: "user-1",
  instructorId: "user-1",
  instructorName: "João Silva",
  title: "Curso de Som",
  description: "Treinamento técnico",
  courseDate: new Date("2026-05-01T10:00:00Z"),
  location: "Sala 1",
  capacity: 10,
  createdAt: new Date("2026-01-01"),
  enrollments: [],
};

const fakeMember: UserRecord = {
  id: "member-1",
  name: "Maria",
  lastName: "Santos",
  email: "maria@example.com",
  passwordHash: "hash",
  role: "recreador",
};

const fakeWarning: WarningRecord = {
  id: "warning-1",
  memberId: "member-1",
  createdBy: "admin-1",
  reason: "Conduta inadequada",
  warningDate: new Date("2026-04-09"),
  createdAt: new Date("2026-04-09"),
};

const fakeSuspension: SuspensionRecord = {
  id: "suspension-1",
  memberId: "member-1",
  startDate: new Date("2026-04-09"),
  endDate: new Date("2026-05-09"),
  reason: "3 advertencias",
  createdAt: new Date("2026-04-09"),
};

describe("email", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", mockFetch);
    process.env.RESEND_API_KEY = "test-key";
    process.env.RESEND_FROM = "noreply@test.com";
    mockFetch.mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.RESEND_API_KEY;
    delete process.env.RESEND_FROM;
    vi.clearAllMocks();
  });

  it("sendCourseCreatedEmail envia para todos os membros", async () => {
    const members = [fakeMember, { ...fakeMember, id: "m2", email: "joao@example.com" }];
    await sendCourseCreatedEmail(fakeCourse, members);
    expect(mockFetch).toHaveBeenCalledOnce();
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.subject).toBe("Novo curso disponível: Curso de Som");
    expect(body.to).toEqual(["maria@example.com", "joao@example.com"]);
    expect(body.html).toContain("Curso de Som");
    expect(body.html).toContain("João Silva");
  });

  it("sendCourseCreatedEmail nao envia se nao ha membros", async () => {
    await sendCourseCreatedEmail(fakeCourse, []);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("sendEnrollmentConfirmationEmail envia para o membro inscrito", async () => {
    await sendEnrollmentConfirmationEmail(fakeCourse, fakeMember);
    expect(mockFetch).toHaveBeenCalledOnce();
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.subject).toBe("Inscrição confirmada: Curso de Som");
    expect(body.to).toEqual(["maria@example.com"]);
    expect(body.html).toContain("Maria");
    expect(body.html).toContain("Curso de Som");
  });

  it("sendWarningEmail envia para o membro advertido com contagem", async () => {
    await sendWarningEmail(fakeMember, fakeWarning, 2);
    expect(mockFetch).toHaveBeenCalledOnce();
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.subject).toBe("Você recebeu uma advertência");
    expect(body.to).toEqual(["maria@example.com"]);
    expect(body.html).toContain("Conduta inadequada");
    expect(body.html).toContain("2ª advertência");
  });

  it("sendWarningEmail inclui nome do autor quando fornecido", async () => {
    await sendWarningEmail(fakeMember, fakeWarning, 1, "Carlos Oliveira");
    expect(mockFetch).toHaveBeenCalledOnce();
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.html).toContain("Carlos Oliveira");
    expect(body.text).toContain("Carlos Oliveira");
  });

  it("sendWarningEmail nao inclui linha de autor quando nao fornecido", async () => {
    await sendWarningEmail(fakeMember, fakeWarning, 1);
    expect(mockFetch).toHaveBeenCalledOnce();
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.html).not.toContain("Registrada por:");
  });

  it("sendSuspensionEmail envia para o membro suspenso", async () => {
    await sendSuspensionEmail(fakeMember, fakeSuspension);
    expect(mockFetch).toHaveBeenCalledOnce();
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.subject).toBe("Você foi suspenso");
    expect(body.to).toEqual(["maria@example.com"]);
    expect(body.html).toContain("3 advertências");
  });

  it("sendEmail lanca erro se a API retorna status de erro", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 422, text: async () => "Unprocessable" });
    await expect(sendEnrollmentConfirmationEmail(fakeCourse, fakeMember)).rejects.toThrow(
      "resend_failed_422"
    );
  });

  it("sendEmail lanca erro se RESEND_API_KEY ausente", async () => {
    delete process.env.RESEND_API_KEY;
    await expect(sendEnrollmentConfirmationEmail(fakeCourse, fakeMember)).rejects.toThrow(
      "missing_env_RESEND_API_KEY"
    );
  });
});
