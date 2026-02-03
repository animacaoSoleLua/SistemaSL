export type Role = "admin" | "animador" | "recreador";

export interface StoredUser {
  id: string;
  name: string;
  role: Role;
  photo_url?: string | null;
}

export const roleLabels: Record<Role, string> = {
  admin: "Admin",
  animador: "Animador",
  recreador: "Recreador",
};

export function getStoredUser(): StoredUser | null {
  if (typeof window === "undefined") {
    return null;
  }
  const stored = localStorage.getItem("user");
  if (!stored) {
    return null;
  }
  try {
    return JSON.parse(stored) as StoredUser;
  } catch {
    return null;
  }
}

export function getDefaultRoute(role: Role): string {
  if (role === "admin") return "/usuarios";
  return "/perfil";
}

export function isRoleAllowed(role: Role, allowed: Role[]): boolean {
  return allowed.includes(role);
}
