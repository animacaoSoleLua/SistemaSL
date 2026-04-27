import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildServer } from "../src/app.js";
import { getUserByEmail } from "../src/auth/store.js";
import { addMediaToReport, createReport } from "../src/relatorios/store.js";
import { disconnectDatabase, resetDatabase } from "./helpers/db.js";

describe("Relatorios (integration)", () => {
  const app = buildServer();

  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await disconnectDatabase();
  });

  beforeEach(async () => {
    await resetDatabase();
  });

  it("creates report with feedbacks and returns detail", async () => {
    const login = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: "animador@sol-e-lua.com",
        password: "animador123",
      },
    });
    const token = login.json().data.access_token;

    const recreador = await getUserByEmail("recreador@sol-e-lua.com");

    const createResponse = await app.inject({
      method: "POST",
      url: "/api/v1/relatorios",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        event_date: "2026-01-10",
        contractor_name: "Hotel Sol",
        title_schedule: "Festa infantil - tarde",
        transport_type: "uber99",
        uber_go_value: 35.5,
        uber_return_value: 31.2,
        has_extra_hours: true,
        extra_hours_details: "1 hora",
        outside_brasilia: false,
        exclusive_event: true,
        team_summary: "Equipe A",
        team_general_description: "Equipe muito engajada",
        team_general_score: 4,
        event_difficulties: "Atraso na montagem",
        event_difficulty_score: 2,
        event_quality_score: 5,
        quality_sound: 4,
        quality_microphone: 5,
        speaker_number: 7,
        electronics_notes: "Microfone reserva falhou",
        notes: "Tudo certo",
        feedbacks: [
          { member_id: recreador!.id, feedback: "Bom trabalho" },
        ],
      },
    });

    expect(createResponse.statusCode).toBe(201);
    const reportId = createResponse.json().data.id;

    const detailResponse = await app.inject({
      method: "GET",
      url: `/api/v1/relatorios/${reportId}`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(detailResponse.statusCode).toBe(200);
    const body = detailResponse.json();
    expect(body.data.contractor_name).toBe("Hotel Sol");
    expect(body.data.author_name).toBe("Animador Lua");
    expect(body.data.title_schedule).toBe("Festa infantil - tarde");
    expect(body.data.has_extra_hours).toBe(true);
    expect(body.data.extra_hours_details).toBe("1 hora");
    expect(body.data.team_general_score).toBe(4);
    expect(body.data.event_difficulty_score).toBe(2);
    expect(body.data.event_quality_score).toBe(5);
    expect(body.data.speaker_number).toBe(7);
    expect(body.data.created_at).toBeTypeOf("string");
    expect(body.data.feedbacks).toHaveLength(1);
    expect(body.data.feedbacks[0].member_id).toBe(recreador!.id);
    expect(body.data.feedbacks[0].member_name).toBe("Recreador Sol");
  });

  it("keeps extra hours enabled when details are sent without the boolean flag", async () => {
    const login = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: "animador@sol-e-lua.com",
        password: "animador123",
      },
    });
    const token = login.json().data.access_token;

    const createResponse = await app.inject({
      method: "POST",
      url: "/api/v1/relatorios",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        event_date: "2026-01-16",
        contractor_name: "Buffet Lua",
        team_summary: "Equipe C",
        extra_hours_details: "1 hora e 30 minutos",
      },
    });

    expect(createResponse.statusCode).toBe(201);
    const reportId = createResponse.json().data.id;

    const detailResponse = await app.inject({
      method: "GET",
      url: `/api/v1/relatorios/${reportId}`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(detailResponse.statusCode).toBe(200);
    const body = detailResponse.json();
    expect(body.data.has_extra_hours).toBe(true);
    expect(body.data.extra_hours_details).toBe("1 hora e 30 minutos");
  });

  it("lists only own reports for animador", async () => {
    const animador = await getUserByEmail("animador@sol-e-lua.com");
    const admin = await getUserByEmail("arthurssousa2004@gmail.com");

    const ownReport = await createReport(animador!.id, {
      eventDate: new Date("2026-01-10"),
      contractorName: "Hotel Sol",
      titleSchedule: "Manhã recreativa",
      teamSummary: "Equipe A",
    });
    await addMediaToReport(ownReport.id, {
      type: "image",
      url: "https://test-pub.r2.dev/relatorios/foto-evento.jpg",
      sizeBytes: 15360,
    });
    await createReport(admin!.id, {
      eventDate: new Date("2026-01-11"),
      contractorName: "Clube Lua",
      teamSummary: "Equipe B",
    });

    const login = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: "animador@sol-e-lua.com",
        password: "animador123",
      },
    });
    const token = login.json().data.access_token;

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/relatorios",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].author_id).toBe(animador!.id);
    expect(body.data[0].title_schedule).toBe("Manhã recreativa");
    expect(body.data[0].media).toHaveLength(1);
    expect(body.data[0].media[0].media_type).toBe("image");
    expect(body.data[0].media[0].url).toBe("https://test-pub.r2.dev/relatorios/foto-evento.jpg");
  });

  it("exports report as PDF for the owner", async () => {
    const login = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: "animador@sol-e-lua.com",
        password: "animador123",
      },
    });
    const token = login.json().data.access_token;

    const createResponse = await app.inject({
      method: "POST",
      url: "/api/v1/relatorios",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        event_date: "2026-01-10",
        contractor_name: "Hotel Sol",
        team_summary: "Equipe A",
      },
    });

    const reportId = createResponse.json().data.id;
    const pdfResponse = await app.inject({
      method: "GET",
      url: `/api/v1/relatorios/${reportId}/pdf`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(pdfResponse.statusCode).toBe(200);
    expect(pdfResponse.headers["content-type"]).toContain("application/pdf");
    expect(pdfResponse.headers["content-disposition"]).toContain(
      `relatorio-${reportId}.pdf`
    );
    expect(pdfResponse.body.startsWith("%PDF")).toBe(true);
  });

  it("accepts score zero in ratings", async () => {
    const login = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: "animador@sol-e-lua.com",
        password: "animador123",
      },
    });
    const token = login.json().data.access_token;

    const createResponse = await app.inject({
      method: "POST",
      url: "/api/v1/relatorios",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        event_date: "2026-01-15",
        contractor_name: "Clube Sol",
        team_summary: "Equipe B",
        team_general_score: 0,
        event_difficulty_score: 0,
        event_quality_score: 0,
        quality_sound: 0,
        quality_microphone: 0,
      },
    });

    expect(createResponse.statusCode).toBe(201);
  });

  it("allows admin to filter by author and search", async () => {
    const animador = await getUserByEmail("animador@sol-e-lua.com");
    const admin = await getUserByEmail("arthurssousa2004@gmail.com");

    await createReport(animador!.id, {
      eventDate: new Date("2026-01-10"),
      contractorName: "Hotel Sol",
      titleSchedule: "Cronograma Hotel Sol",
      teamSummary: "Equipe A",
    });
    await createReport(animador!.id, {
      eventDate: new Date("2026-01-12"),
      contractorName: "Clube Lua",
      teamSummary: "Equipe B",
    });
    await createReport(admin!.id, {
      eventDate: new Date("2026-01-11"),
      contractorName: "Outro",
      teamSummary: "Equipe C",
    });

    const login = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: "arthurssousa2004@gmail.com",
        password: "admin123",
      },
    });
    const token = login.json().data.access_token;

    const response = await app.inject({
      method: "GET",
      url: `/api/v1/relatorios?author_id=${animador!.id}&search=hotel`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].contractor_name).toBe("Hotel Sol");
    expect(body.data[0].title_schedule).toBe("Cronograma Hotel Sol");

    const searchByAuthor = await app.inject({
      method: "GET",
      url: "/api/v1/relatorios?search=animador lua",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(searchByAuthor.statusCode).toBe(200);
    const authorBody = searchByAuthor.json();
    expect(authorBody.data).toHaveLength(2);
  });

  it("deletes own report", async () => {
    const login = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: "animador@sol-e-lua.com",
        password: "animador123",
      },
    });
    const token = login.json().data.access_token;

    const createResponse = await app.inject({
      method: "POST",
      url: "/api/v1/relatorios",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        event_date: "2026-01-20",
        contractor_name: "Buffet Sol",
        team_summary: "Equipe C",
      },
    });
    const reportId = createResponse.json().data.id;

    const deleteResponse = await app.inject({
      method: "DELETE",
      url: `/api/v1/relatorios/${reportId}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(deleteResponse.statusCode).toBe(204);

    const detailResponse = await app.inject({
      method: "GET",
      url: `/api/v1/relatorios/${reportId}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(detailResponse.statusCode).toBe(404);
  });

  it("updates own report with new transport labels and feedbacks", async () => {
    const login = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: "animador@sol-e-lua.com",
        password: "animador123",
      },
    });
    const token = login.json().data.access_token;
    const recreador = await getUserByEmail("recreador@sol-e-lua.com");

    const createResponse = await app.inject({
      method: "POST",
      url: "/api/v1/relatorios",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        event_date: "2026-01-20",
        contractor_name: "Buffet Sol",
        transport_type: "uber99",
        uber_go_value: 25,
        uber_return_value: 30,
        team_summary: "Equipe C",
      },
    });
    const reportId = createResponse.json().data.id as string;

    const updateResponse = await app.inject({
      method: "PATCH",
      url: `/api/v1/relatorios/${reportId}`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        event_date: "2026-01-20",
        contractor_name: "Buffet Sol Atualizado",
        title_schedule: "Cronograma atualizado",
        transport_type: "outro",
        other_car_responsible: "Motorista parceiro",
        has_extra_hours: false,
        outside_brasilia: true,
        exclusive_event: false,
        team_summary: "Equipe C",
        team_general_description: "Equipe ajustada",
        team_general_score: 5,
        feedbacks: [
          { member_id: recreador!.id, feedback: "Evoluiu bem" },
        ],
      },
    });

    expect(updateResponse.statusCode).toBe(200);

    const detailResponse = await app.inject({
      method: "GET",
      url: `/api/v1/relatorios/${reportId}`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(detailResponse.statusCode).toBe(200);
    const body = detailResponse.json();
    expect(body.data.contractor_name).toBe("Buffet Sol Atualizado");
    expect(body.data.transport_type).toBe("outro");
    expect(body.data.other_car_responsible).toBe("Motorista parceiro");
    expect(body.data.uber_go_value).toBeNull();
    expect(body.data.uber_return_value).toBeNull();
    expect(body.data.feedbacks).toHaveLength(1);
    expect(body.data.feedbacks[0].member_id).toBe(recreador!.id);
    expect(body.data.feedbacks[0].feedback).toBe("Evoluiu bem");
  });
});
