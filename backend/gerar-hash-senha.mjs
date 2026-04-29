import { randomBytes, scryptSync } from "node:crypto";

const novaSenha = process.argv[2];

if (!novaSenha) {
  console.error("Uso: node gerar-hash-senha.mjs <nova_senha>");
  process.exit(1);
}

const salt = randomBytes(16);
const derived = scryptSync(novaSenha, salt, 64);
const hash = `scrypt$${salt.toString("base64")}$${derived.toString("base64")}`;

console.log(hash);
