export function normalizeString(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function isValidCPF(cpf: string): boolean {
  const cleaned = cpf.replace(/\D/g, "");
  if (cleaned.length !== 11) return false;
  if (/^(\d)\1+$/.test(cleaned)) return false;
  const calc = (digits: string, factor: number): number =>
    digits.split("").reduce((sum, d, i) => sum + parseInt(d, 10) * (factor - i), 0);
  const r1 = (calc(cleaned.slice(0, 9), 10) * 10) % 11;
  if ((r1 === 10 || r1 === 11 ? 0 : r1) !== parseInt(cleaned[9], 10)) return false;
  const r2 = (calc(cleaned.slice(0, 10), 11) * 10) % 11;
  return (r2 === 10 || r2 === 11 ? 0 : r2) === parseInt(cleaned[10], 10);
}

export function isStrongPassword(password: string): string | null {
  if (password.length < 8) return "A senha deve ter pelo menos 8 caracteres.";
  if (!/[A-Z]/.test(password)) return "A senha deve conter ao menos uma letra maiúscula.";
  if (!/[a-z]/.test(password)) return "A senha deve conter ao menos uma letra minúscula.";
  if (!/[0-9]/.test(password)) return "A senha deve conter ao menos um número.";
  return null;
}
