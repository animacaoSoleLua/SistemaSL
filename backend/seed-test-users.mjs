// Seed 50 test members with password "Senha123"
// Run: node seed-test-users.mjs
import { randomBytes, scryptSync } from "node:crypto";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function hashPassword(password) {
  const salt = randomBytes(16);
  const derived = scryptSync(password, salt, 64);
  return ["scrypt", salt.toString("base64"), derived.toString("base64")].join("$");
}

const PASSWORD = "Senha123";

const members = [
  { name: "Ana",       last_name: "Souza",      email: "a@gmail.com",        role: "recreador", region: "Asa Norte",         phone: "(61) 99100-0001", birth_date: "2000-03-15", cpf: "111.111.111-01" },
  { name: "Bruno",     last_name: "Lima",        email: "bruno.lima@teste.com",       role: "animador",  region: "Asa Sul",           phone: "(61) 99100-0002", birth_date: "1998-07-22", cpf: "111.111.111-02" },
  { name: "Carla",     last_name: "Ferreira",    email: "carla.ferreira@teste.com",   role: "recreador", region: "Taguatinga",        phone: "(61) 99100-0003", birth_date: "2001-01-10", cpf: "111.111.111-03" },
  { name: "Diego",     last_name: "Oliveira",    email: "diego.oliveira@teste.com",   role: "animador",  region: "Ceilândia",         phone: "(61) 99100-0004", birth_date: "1999-11-05", cpf: "111.111.111-04" },
  { name: "Elena",     last_name: "Santos",      email: "elena.santos@teste.com",     role: "recreador", region: "Samambaia",         phone: "(61) 99100-0005", birth_date: "2002-06-18", cpf: "111.111.111-05" },
  { name: "Felipe",    last_name: "Costa",       email: "felipe.costa@teste.com",     role: "recreador", region: "Gama",              phone: "(61) 99100-0006", birth_date: "1997-09-30", cpf: "111.111.111-06" },
  { name: "Gabriela",  last_name: "Alves",       email: "gabriela.alves@teste.com",   role: "animador",  region: "Guará",             phone: "(61) 99100-0007", birth_date: "2000-04-12", cpf: "111.111.111-07" },
  { name: "Henrique",  last_name: "Pereira",     email: "henrique.pereira@teste.com", role: "recreador", region: "Núcleo Bandeirante",phone: "(61) 99100-0008", birth_date: "1996-12-01", cpf: "111.111.111-08" },
  { name: "Isabela",   last_name: "Martins",     email: "isabela.martins@teste.com",  role: "recreador", region: "Cruzeiro",          phone: "(61) 99100-0009", birth_date: "2001-08-25", cpf: "111.111.111-09" },
  { name: "João",      last_name: "Rodrigues",   email: "joao.rodrigues@teste.com",   role: "animador",  region: "Sobradinho",        phone: "(61) 99100-0010", birth_date: "1999-02-14", cpf: "111.111.111-10" },
  { name: "Karen",     last_name: "Nascimento",  email: "karen.nascimento@teste.com", role: "recreador", region: "Planaltina",        phone: "(61) 99100-0011", birth_date: "2003-05-07", cpf: "111.111.111-11" },
  { name: "Lucas",     last_name: "Araújo",      email: "lucas.araujo@teste.com",     role: "recreador", region: "Recanto",           phone: "(61) 99100-0012", birth_date: "1998-10-19", cpf: "111.111.111-12" },
  { name: "Mariana",   last_name: "Carvalho",    email: "mariana.carvalho@teste.com", role: "animador",  region: "Santa Maria",       phone: "(61) 99100-0013", birth_date: "2000-01-28", cpf: "111.111.111-13" },
  { name: "Nicolas",   last_name: "Gomes",       email: "nicolas.gomes@teste.com",    role: "recreador", region: "São Sebastião",     phone: "(61) 99100-0014", birth_date: "2002-07-03", cpf: "111.111.111-14" },
  { name: "Olivia",    last_name: "Ribeiro",     email: "olivia.ribeiro@teste.com",   role: "recreador", region: "Riacho Fundo",      phone: "(61) 99100-0015", birth_date: "1997-03-21", cpf: "111.111.111-15" },
  { name: "Pedro",     last_name: "Mendes",      email: "pedro.mendes@teste.com",     role: "animador",  region: "Itapoã",            phone: "(61) 99100-0016", birth_date: "2001-11-14", cpf: "111.111.111-16" },
  { name: "Quenia",    last_name: "Barbosa",     email: "quenia.barbosa@teste.com",   role: "recreador", region: "Varjão",            phone: "(61) 99100-0017", birth_date: "1999-06-09", cpf: "111.111.111-17" },
  { name: "Yasmin",    last_name: "Queiroz",     email: "yasmin.queiroz@teste.com",   role: "recreador", region: "Itapoã",            phone: "(61) 99100-0050", birth_date: "2001-10-09", cpf: "111.111.111-50" },
];

async function main() {
  console.log("Inserindo 50 membros de teste...\n");

  let inserted = 0;
  let skipped = 0;

  for (const member of members) {
    const existing = await prisma.user.findUnique({ where: { email: member.email } });
    if (existing) {
      console.log(`– ${member.name} ${member.last_name} (já existe, pulando)`);
      skipped++;
      continue;
    }

    await prisma.user.create({
      data: {
        id: randomUUID(),
        name: member.name,
        lastName: member.last_name,
        email: member.email,
        cpf: member.cpf,
        birthDate: new Date(member.birth_date),
        region: member.region,
        phone: member.phone,
        passwordHash: hashPassword(PASSWORD),
        role: member.role,
      },
    });

    console.log(`✓ ${member.name} ${member.last_name}`);
    inserted++;
  }

  console.log(`\nConcluído: ${inserted} inseridos, ${skipped} já existiam.`);
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
