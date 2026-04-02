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
  { name: "Ana",       last_name: "Souza",      email: "ana.souza@teste.com",        role: "recreador", region: "Asa Norte",         phone: "(61) 99100-0001", birth_date: "2000-03-15", cpf: "111.111.111-01" },
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
  { name: "Rafael",    last_name: "Cardoso",     email: "rafael.cardoso@teste.com",   role: "recreador", region: "Fercal",            phone: "(61) 99100-0018", birth_date: "2000-09-16", cpf: "111.111.111-18" },
  { name: "Sofia",     last_name: "Teixeira",    email: "sofia.teixeira@teste.com",   role: "animador",  region: "Asa Norte",         phone: "(61) 99100-0019", birth_date: "2003-02-27", cpf: "111.111.111-19" },
  { name: "Thiago",    last_name: "Correia",     email: "thiago.correia@teste.com",   role: "recreador", region: "Asa Sul",           phone: "(61) 99100-0020", birth_date: "1998-04-11", cpf: "111.111.111-20" },
  { name: "Ursula",    last_name: "Lopes",       email: "ursula.lopes@teste.com",     role: "recreador", region: "Taguatinga",        phone: "(61) 99100-0021", birth_date: "2001-12-05", cpf: "111.111.111-21" },
  { name: "Vinicius",  last_name: "Moreira",     email: "vinicius.moreira@teste.com", role: "animador",  region: "Ceilândia",         phone: "(61) 99100-0022", birth_date: "1997-08-23", cpf: "111.111.111-22" },
  { name: "Wendy",     last_name: "Pinto",       email: "wendy.pinto@teste.com",      role: "recreador", region: "Samambaia",         phone: "(61) 99100-0023", birth_date: "2002-03-17", cpf: "111.111.111-23" },
  { name: "Ximena",    last_name: "Freitas",     email: "ximena.freitas@teste.com",   role: "recreador", region: "Gama",              phone: "(61) 99100-0024", birth_date: "2000-10-08", cpf: "111.111.111-24" },
  { name: "Yago",      last_name: "Fernandes",   email: "yago.fernandes@teste.com",   role: "animador",  region: "Guará",             phone: "(61) 99100-0025", birth_date: "1999-05-29", cpf: "111.111.111-25" },
  { name: "Zara",      last_name: "Cunha",       email: "zara.cunha@teste.com",       role: "recreador", region: "Núcleo Bandeirante",phone: "(61) 99100-0026", birth_date: "2001-07-13", cpf: "111.111.111-26" },
  { name: "André",     last_name: "Batista",     email: "andre.batista@teste.com",    role: "recreador", region: "Cruzeiro",          phone: "(61) 99100-0027", birth_date: "1996-01-31", cpf: "111.111.111-27" },
  { name: "Beatriz",   last_name: "Dias",        email: "beatriz.dias@teste.com",     role: "animador",  region: "Sobradinho",        phone: "(61) 99100-0028", birth_date: "2003-09-04", cpf: "111.111.111-28" },
  { name: "Caio",      last_name: "Melo",        email: "caio.melo@teste.com",        role: "recreador", region: "Planaltina",        phone: "(61) 99100-0029", birth_date: "2000-06-20", cpf: "111.111.111-29" },
  { name: "Débora",    last_name: "Rocha",       email: "debora.rocha@teste.com",     role: "recreador", region: "Recanto",           phone: "(61) 99100-0030", birth_date: "1998-11-15", cpf: "111.111.111-30" },
  { name: "Eduardo",   last_name: "Nogueira",    email: "eduardo.nogueira@teste.com", role: "animador",  region: "Santa Maria",       phone: "(61) 99100-0031", birth_date: "2002-04-02", cpf: "111.111.111-31" },
  { name: "Flávia",    last_name: "Vieira",      email: "flavia.vieira@teste.com",    role: "recreador", region: "São Sebastião",     phone: "(61) 99100-0032", birth_date: "1997-07-18", cpf: "111.111.111-32" },
  { name: "Gustavo",   last_name: "Soares",      email: "gustavo.soares@teste.com",   role: "recreador", region: "Riacho Fundo",      phone: "(61) 99100-0033", birth_date: "2001-02-09", cpf: "111.111.111-33" },
  { name: "Helena",    last_name: "Monteiro",    email: "helena.monteiro@teste.com",  role: "animador",  region: "Itapoã",            phone: "(61) 99100-0034", birth_date: "1999-10-26", cpf: "111.111.111-34" },
  { name: "Igor",      last_name: "Cavalcante",  email: "igor.cavalcante@teste.com",  role: "recreador", region: "Varjão",            phone: "(61) 99100-0035", birth_date: "2003-01-14", cpf: "111.111.111-35" },
  { name: "Juliana",   last_name: "Xavier",      email: "juliana.xavier@teste.com",   role: "recreador", region: "Fercal",            phone: "(61) 99100-0036", birth_date: "2000-08-07", cpf: "111.111.111-36" },
  { name: "Kauã",      last_name: "Miranda",     email: "kaua.miranda@teste.com",     role: "animador",  region: "Asa Norte",         phone: "(61) 99100-0037", birth_date: "1998-03-25", cpf: "111.111.111-37" },
  { name: "Larissa",   last_name: "Azevedo",     email: "larissa.azevedo@teste.com",  role: "recreador", region: "Asa Sul",           phone: "(61) 99100-0038", birth_date: "2001-05-19", cpf: "111.111.111-38" },
  { name: "Marcos",    last_name: "Figueiredo",  email: "marcos.figueiredo@teste.com",role: "recreador", region: "Taguatinga",        phone: "(61) 99100-0039", birth_date: "1997-12-08", cpf: "111.111.111-39" },
  { name: "Natália",   last_name: "Campos",      email: "natalia.campos@teste.com",   role: "animador",  region: "Ceilândia",         phone: "(61) 99100-0040", birth_date: "2002-09-01", cpf: "111.111.111-40" },
  { name: "Otávio",    last_name: "Pacheco",     email: "otavio.pacheco@teste.com",   role: "recreador", region: "Samambaia",         phone: "(61) 99100-0041", birth_date: "2000-11-22", cpf: "111.111.111-41" },
  { name: "Patrícia",  last_name: "Silveira",    email: "patricia.silveira@teste.com",role: "recreador", region: "Gama",              phone: "(61) 99100-0042", birth_date: "1998-06-14", cpf: "111.111.111-42" },
  { name: "Quirino",   last_name: "Rezende",     email: "quirino.rezende@teste.com",  role: "animador",  region: "Guará",             phone: "(61) 99100-0043", birth_date: "2001-03-06", cpf: "111.111.111-43" },
  { name: "Renata",    last_name: "Borges",      email: "renata.borges@teste.com",     role: "recreador", region: "Sobradinho",       phone: "(61) 99100-0044", birth_date: "1999-08-30", cpf: "111.111.111-44" },
  { name: "Samuel",    last_name: "Andrade",     email: "samuel.andrade@teste.com",   role: "recreador", region: "Planaltina",        phone: "(61) 99100-0045", birth_date: "2003-04-17", cpf: "111.111.111-45" },
  { name: "Tatiane",   last_name: "Castro",      email: "tatiane.castro@teste.com",   role: "animador",  region: "Recanto",           phone: "(61) 99100-0046", birth_date: "2000-07-11", cpf: "111.111.111-46" },
  { name: "Ulisses",   last_name: "Marques",     email: "ulisses.marques@teste.com",  role: "recreador", region: "Santa Maria",       phone: "(61) 99100-0047", birth_date: "1997-02-03", cpf: "111.111.111-47" },
  { name: "Valéria",   last_name: "Macedo",      email: "valeria.macedo@teste.com",   role: "recreador", region: "São Sebastião",     phone: "(61) 99100-0048", birth_date: "2002-11-28", cpf: "111.111.111-48" },
  { name: "Wagner",    last_name: "Tavares",     email: "wagner.tavares@teste.com",   role: "animador",  region: "Riacho Fundo",      phone: "(61) 99100-0049", birth_date: "1999-01-16", cpf: "111.111.111-49" },
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
