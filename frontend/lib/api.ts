// lib/api.ts
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001/api/v1";

async function request(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE_URL}${endpoint}`;

  const token = localStorage.getItem('authToken');

  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    // Se o token expirar (Unauthorized), redirecionar para o login
    if (response.status === 401) {
      localStorage.removeItem('authToken');
      // Idealmente, usar o router do Next.js aqui, mas window é um fallback
      window.location.href = '/login'; 
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Erro na requisição à API');
  }

  // Para requisições que não retornam conteúdo (ex: DELETE)
  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export async function getReports() {
  return request('/relatorios', { method: 'GET' });
}

export async function getWarnings(params: {
  member_id?: string;
  created_by?: string;
  page?: number;
  limit?: number;
} = {}) {
  const searchParams = new URLSearchParams();
  if (params.member_id) searchParams.set("member_id", params.member_id);
  if (params.created_by) searchParams.set("created_by", params.created_by);
  if (params.page) searchParams.set("page", String(params.page));
  if (params.limit) searchParams.set("limit", String(params.limit));

  const query = searchParams.toString();
  const endpoint = query ? `/advertencias?${query}` : "/advertencias";
  return request(endpoint, { method: "GET" });
}

export async function createWarning(input: {
  member_id: string;
  reason: string;
  warning_date: string;
}) {
  return request("/advertencias", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function getMembers() {
  return request('/membros', { method: 'GET' });
}

export async function getMember(id: string) {
  return request(`/membros/${id}`, { method: "GET" });
}

export async function createMember(input: {
  name: string;
  email: string;
  role: string;
  password?: string;
}) {
  return request('/membros', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function updateMember(
  id: string,
  input: { name?: string; email?: string; role?: string; is_active?: boolean }
) {
  return request(`/membros/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export async function deleteMember(id: string) {
  return request(`/membros/${id}`, { method: 'DELETE' });
}

export async function login(email: string, password: string) {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

// Adicionaremos mais funções aqui (ex: createReport, etc.)
