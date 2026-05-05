import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildServer } from "../src/app.js";
import { getUserByEmail } from "../src/auth/store.js";
import {
  disconnectDatabase,
  resetDatabase,
  testAdmin,
  testMember1,
  testMember2,
} from "./helpers/db.js";

describe("Habilidades (integration)", () => {
  const app = buildServer();

  beforeAll(async () => {
    await app.ready();
  });

  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await app.close();
    await disconnectDatabase();
  });

  async function loginAs(email: string, password: string): Promise<string> {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email, password },
    });
    return res.json().data.access_token;
  }

  it("admin pode criar uma habilidade", async () => {
    const token = await loginAs(testAdmin.email, testAdmin.password);
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/habilidades",
      headers: { authorization: `Bearer ${token}` },
      payload: { name: "Pintura", description: "Pintura artística" },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.data.name).toBe("Pintura");
    expect(body.data.description).toBe("Pintura artística");
    expect(body.data.id).toBeTruthy();
  });

  it("não permite criar habilidade com nome duplicado", async () => {
    const token = await loginAs(testAdmin.email, testAdmin.password);
    await app.inject({
      method: "POST",
      url: "/api/v1/habilidades",
      headers: { authorization: `Bearer ${token}` },
      payload: { name: "Balão" },
    });
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/habilidades",
      headers: { authorization: `Bearer ${token}` },
      payload: { name: "Balão" },
    });
    expect(res.statusCode).toBe(409);
  });

  it("lista habilidades com membros ordenados por rating", async () => {
    const token = await loginAs(testAdmin.email, testAdmin.password);
    const member1 = await getUserByEmail(testMember1.email);
    const member2 = await getUserByEmail(testMember2.email);

    const skillRes = await app.inject({
      method: "POST",
      url: "/api/v1/habilidades",
      headers: { authorization: `Bearer ${token}` },
      payload: { name: "Malabarismo" },
    });
    const skillId = skillRes.json().data.id;

    await app.inject({
      method: "POST",
      url: `/api/v1/habilidades/${skillId}/membros`,
      headers: { authorization: `Bearer ${token}` },
      payload: { member_id: member1!.id, rating: 7 },
    });
    await app.inject({
      method: "POST",
      url: `/api/v1/habilidades/${skillId}/membros`,
      headers: { authorization: `Bearer ${token}` },
      payload: { member_id: member2!.id, rating: 9 },
    });

    const listRes = await app.inject({
      method: "GET",
      url: "/api/v1/habilidades",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(listRes.statusCode).toBe(200);
    const skills = listRes.json();
    const found = skills.find((s: { id: string }) => s.id === skillId);
    expect(found.members[0].rating).toBe(9);
    expect(found.members[1].rating).toBe(7);
  });

  it("admin pode editar uma habilidade", async () => {
    const token = await loginAs(testAdmin.email, testAdmin.password);
    const createRes = await app.inject({
      method: "POST",
      url: "/api/v1/habilidades",
      headers: { authorization: `Bearer ${token}` },
      payload: { name: "Dança" },
    });
    const skillId = createRes.json().data.id;

    const editRes = await app.inject({
      method: "PUT",
      url: `/api/v1/habilidades/${skillId}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { name: "Dança Contemporânea" },
    });
    expect(editRes.statusCode).toBe(200);
    expect(editRes.json().data.name).toBe("Dança Contemporânea");
  });

  it("admin pode deletar uma habilidade e vínculos são cascadeados", async () => {
    const token = await loginAs(testAdmin.email, testAdmin.password);
    const member1 = await getUserByEmail(testMember1.email);

    const createRes = await app.inject({
      method: "POST",
      url: "/api/v1/habilidades",
      headers: { authorization: `Bearer ${token}` },
      payload: { name: "Acrobacia" },
    });
    const skillId = createRes.json().data.id;

    await app.inject({
      method: "POST",
      url: `/api/v1/habilidades/${skillId}/membros`,
      headers: { authorization: `Bearer ${token}` },
      payload: { member_id: member1!.id, rating: 8 },
    });

    const deleteRes = await app.inject({
      method: "DELETE",
      url: `/api/v1/habilidades/${skillId}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(deleteRes.statusCode).toBe(204);

    const listRes = await app.inject({
      method: "GET",
      url: "/api/v1/habilidades",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(listRes.json().find((s: { id: string }) => s.id === skillId)).toBeUndefined();
  });

  it("não permite adicionar a mesma habilidade duas vezes ao mesmo membro", async () => {
    const token = await loginAs(testAdmin.email, testAdmin.password);
    const member1 = await getUserByEmail(testMember1.email);

    const createRes = await app.inject({
      method: "POST",
      url: "/api/v1/habilidades",
      headers: { authorization: `Bearer ${token}` },
      payload: { name: "Teatro" },
    });
    const skillId = createRes.json().data.id;

    await app.inject({
      method: "POST",
      url: `/api/v1/habilidades/${skillId}/membros`,
      headers: { authorization: `Bearer ${token}` },
      payload: { member_id: member1!.id, rating: 6 },
    });

    const res2 = await app.inject({
      method: "POST",
      url: `/api/v1/habilidades/${skillId}/membros`,
      headers: { authorization: `Bearer ${token}` },
      payload: { member_id: member1!.id, rating: 8 },
    });
    expect(res2.statusCode).toBe(409);
  });

  it("admin pode atualizar a nota de um membro em uma habilidade", async () => {
    const token = await loginAs(testAdmin.email, testAdmin.password);
    const member1 = await getUserByEmail(testMember1.email);

    const createRes = await app.inject({
      method: "POST",
      url: "/api/v1/habilidades",
      headers: { authorization: `Bearer ${token}` },
      payload: { name: "Canto" },
    });
    const skillId = createRes.json().data.id;

    await app.inject({
      method: "POST",
      url: `/api/v1/habilidades/${skillId}/membros`,
      headers: { authorization: `Bearer ${token}` },
      payload: { member_id: member1!.id, rating: 5 },
    });

    const updateRes = await app.inject({
      method: "PUT",
      url: `/api/v1/habilidades/${skillId}/membros/${member1!.id}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { rating: 9 },
    });
    expect(updateRes.statusCode).toBe(200);
    expect(updateRes.json().data.rating).toBe(9);
  });

  it("admin pode remover habilidade de um membro", async () => {
    const token = await loginAs(testAdmin.email, testAdmin.password);
    const member1 = await getUserByEmail(testMember1.email);

    const createRes = await app.inject({
      method: "POST",
      url: "/api/v1/habilidades",
      headers: { authorization: `Bearer ${token}` },
      payload: { name: "Fotografia" },
    });
    const skillId = createRes.json().data.id;

    await app.inject({
      method: "POST",
      url: `/api/v1/habilidades/${skillId}/membros`,
      headers: { authorization: `Bearer ${token}` },
      payload: { member_id: member1!.id, rating: 7 },
    });

    const removeRes = await app.inject({
      method: "DELETE",
      url: `/api/v1/habilidades/${skillId}/membros/${member1!.id}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(removeRes.statusCode).toBe(204);
  });

  it("não-admin não pode criar habilidade", async () => {
    const token = await loginAs(testMember1.email, testMember1.password);
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/habilidades",
      headers: { authorization: `Bearer ${token}` },
      payload: { name: "Circo" },
    });
    expect(res.statusCode).toBe(403);
  });

  it("skills aparecem nos detalhes do membro", async () => {
    const token = await loginAs(testAdmin.email, testAdmin.password);
    const member1 = await getUserByEmail(testMember1.email);

    const createRes = await app.inject({
      method: "POST",
      url: "/api/v1/habilidades",
      headers: { authorization: `Bearer ${token}` },
      payload: { name: "Natação" },
    });
    const skillId = createRes.json().data.id;

    await app.inject({
      method: "POST",
      url: `/api/v1/habilidades/${skillId}/membros`,
      headers: { authorization: `Bearer ${token}` },
      payload: { member_id: member1!.id, rating: 8 },
    });

    const memberRes = await app.inject({
      method: "GET",
      url: `/api/v1/membros/${member1!.id}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(memberRes.statusCode).toBe(200);
    const skills = memberRes.json().data.skills;
    expect(Array.isArray(skills)).toBe(true);
    expect(skills[0].name).toBe("Natação");
    expect(skills[0].rating).toBe(8);
  });
});
