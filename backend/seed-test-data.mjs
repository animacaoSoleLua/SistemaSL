// Seed 3 advertências e 10 cursos (com inscrição) para um membro específico
// Run: node seed-test-data.mjs
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const MEMBER_ID = "89105fc7-83a1-4588-9394-81ccb98cb26c";

const warnings = [
  {
    reason: "Atraso recorrente nos eventos sem justificativa prévia.",
    warningDate: new Date("2025-10-05"),
  },
  {
    reason: "Uso inadequado do uniforme durante apresentação.",
    warningDate: new Date("2025-11-18"),
  },
  {
    reason: "Ausência não comunicada em evento obrigatório.",
    warningDate: new Date("2026-01-22"),
  },
];

const courses = [
  { title: "Introdução à Recreação",        description: "Fundamentos e dinâmicas básicas de recreação.", courseDate: new Date("2025-03-10T09:00:00Z"), location: "Sala A1", capacity: 30 },
  { title: "Animação Infantil",              description: "Técnicas de animação para públicos infantis.",   courseDate: new Date("2025-04-14T10:00:00Z"), location: "Auditório Principal", capacity: 40 },
  { title: "Gestão de Eventos",              description: "Planejamento e execução de eventos recreativos.", courseDate: new Date("2025-05-08T08:00:00Z"), location: "Sala B2", capacity: 25 },
  { title: "Primeiros Socorros",             description: "Noções básicas de primeiros socorros.",          courseDate: new Date("2025-06-12T14:00:00Z"), location: "Sala Médica", capacity: 20 },
  { title: "Musicalização e Jogos",          description: "Uso da música em atividades recreativas.",       courseDate: new Date("2025-07-03T09:00:00Z"), location: "Sala de Arte", capacity: 35 },
  { title: "Recreação para Idosos",          description: "Atividades adaptadas ao público idoso.",         courseDate: new Date("2025-08-19T10:00:00Z"), location: "Sala A3", capacity: 25 },
  { title: "Teatro e Expressão Corporal",    description: "Dinâmicas de teatro aplicadas à recreação.",     courseDate: new Date("2025-09-02T13:00:00Z"), location: "Auditório Principal", capacity: 30 },
  { title: "Recreação Aquática",             description: "Atividades e jogos em ambiente aquático.",        courseDate: new Date("2025-10-15T08:00:00Z"), location: "Piscina", capacity: 20 },
  { title: "Liderança e Facilitação",        description: "Habilidades de liderança para animadores.",      courseDate: new Date("2025-11-20T09:00:00Z"), location: "Sala B1", capacity: 30 },
  { title: "Encerramento de Temporada",      description: "Avaliação e planejamento do próximo ciclo.",     courseDate: new Date("2025-12-10T14:00:00Z"), location: "Sala de Reuniões", capacity: 40 },
];

const statuses = ["attended", "attended", "attended", "enrolled", "attended", "missed", "attended", "enrolled", "attended", "attended"];

async function main() {
  const member = await prisma.user.findUnique({ where: { id: MEMBER_ID } });
  if (!member) {
    console.error(`Membro com id ${MEMBER_ID} não encontrado. Abortando.`);
    process.exit(1);
  }
  console.log(`Membro encontrado: ${member.name} ${member.lastName ?? ""}\n`);

  // Advertências
  console.log("Inserindo advertências...");
  for (const w of warnings) {
    await prisma.warning.create({
      data: {
        id: randomUUID(),
        memberId: MEMBER_ID,
        createdBy: MEMBER_ID,  // usando o próprio membro como criador para teste
        reason: w.reason,
        warningDate: w.warningDate,
      },
    });
    console.log(`  ✓ Advertência: "${w.reason.slice(0, 50)}..."`);
  }

  // Cursos + inscrições
  console.log("\nInserindo cursos e inscrições...");
  for (let i = 0; i < courses.length; i++) {
    const c = courses[i];
    const courseId = randomUUID();

    await prisma.course.create({
      data: {
        id: courseId,
        createdBy: MEMBER_ID,
        instructorId: MEMBER_ID,
        title: c.title,
        description: c.description,
        courseDate: c.courseDate,
        location: c.location,
        capacity: c.capacity,
      },
    });

    await prisma.courseEnrollment.create({
      data: {
        id: randomUUID(),
        courseId,
        memberId: MEMBER_ID,
        status: statuses[i],
      },
    });

    console.log(`  ✓ Curso "${c.title}" (status: ${statuses[i]})`);
  }

  console.log(`\nConcluído: 3 advertências e 10 cursos inseridos para ${member.name}.`);
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
