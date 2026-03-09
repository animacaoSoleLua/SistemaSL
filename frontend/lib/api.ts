// lib/api.ts
const RAW_API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001/api/v1";
const API_BASE_URL = RAW_API_BASE_URL.replace(/\/+$/, "");
const API_ORIGIN = API_BASE_URL.replace(/\/api\/v1$/, "");

async function request(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE_URL}${endpoint}`;

  const token = localStorage.getItem('authToken');

  const headers = new Headers(options.headers);
  const isFormData =
    typeof FormData !== "undefined" && options.body instanceof FormData;
  const hasBody = options.body !== undefined && options.body !== null;
  if (hasBody && !isFormData) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    const isLoginRequest = endpoint.startsWith("/auth/login");
    // Se o token expirar (Unauthorized), redirecionar para o login
    if (response.status === 401 && !isLoginRequest) {
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

export function resolveApiAssetUrl(url?: string | null) {
  if (!url) return "";
  if (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("data:") ||
    url.startsWith("blob:")
  ) {
    return url;
  }
  if (url.startsWith("/")) {
    return `${API_ORIGIN}${url}`;
  }
  return `${API_ORIGIN}/${url}`;
}

export async function getReports() {
  return request('/relatorios', { method: 'GET' });
}

export async function getDashboardSummary(params: {
  period_start?: string;
  period_end?: string;
} = {}) {
  const searchParams = new URLSearchParams();
  if (params.period_start) searchParams.set("period_start", params.period_start);
  if (params.period_end) searchParams.set("period_end", params.period_end);
  const query = searchParams.toString();
  const endpoint = query ? `/dashboard/resumo?${query}` : "/dashboard/resumo";
  return request(endpoint, { method: "GET" });
}

export async function getDashboardQuality(params: {
  period_start?: string;
  period_end?: string;
} = {}) {
  const searchParams = new URLSearchParams();
  if (params.period_start) searchParams.set("period_start", params.period_start);
  if (params.period_end) searchParams.set("period_end", params.period_end);
  const query = searchParams.toString();
  const endpoint = query ? `/dashboard/qualidade?${query}` : "/dashboard/qualidade";
  return request(endpoint, { method: "GET" });
}

export async function getReportById(id: string) {
  return request(`/relatorios/${id}`, { method: "GET" });
}

export async function deleteReport(id: string) {
  return request(`/relatorios/${id}`, { method: "DELETE" });
}

type ReportPayload = {
  event_date: string;
  contractor_name: string;
  location: string;
  title_schedule?: string;
  transport_type?: string;
  uber_go_value?: number;
  uber_return_value?: number;
  other_car_responsible?: string;
  has_extra_hours?: boolean;
  extra_hours_details?: string;
  outside_brasilia?: boolean;
  exclusive_event?: boolean;
  team_summary: string;
  team_general_description?: string;
  team_general_score?: number;
  event_difficulties?: string;
  event_difficulty_score?: number;
  event_quality_score?: number;
  quality_sound?: number;
  quality_microphone?: number;
  speaker_number?: number;
  electronics_notes?: string;
  notes?: string;
  feedbacks?: Array<{ member_id: string; feedback: string }>;
};

export async function createReport(input: ReportPayload) {
  return request("/relatorios", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateReport(id: string, input: ReportPayload) {
  return request(`/relatorios/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function uploadReportMedia(reportId: string, file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const mimeType = (file.type || "").toLowerCase();
  if (mimeType.startsWith("image/")) {
    formData.append("media_type", "image");
  } else if (mimeType.startsWith("video/")) {
    formData.append("media_type", "video");
  }

  return request(`/relatorios/${reportId}/media`, {
    method: "POST",
    body: formData,
  });
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

export async function updateWarning(
  id: string,
  input: { reason?: string; warning_date?: string }
) {
  return request(`/advertencias/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function deleteWarning(id: string) {
  return request(`/advertencias/${id}`, { method: "DELETE" });
}

export async function getMembers(params: {
  search?: string;
  role?: string;
  page?: number;
  limit?: number;
} = {}) {
  const searchParams = new URLSearchParams();
  if (params.search) searchParams.set("search", params.search);
  if (params.role) searchParams.set("role", params.role);
  if (params.page) searchParams.set("page", String(params.page));
  if (params.limit) searchParams.set("limit", String(params.limit));
  const query = searchParams.toString();
  const endpoint = query ? `/membros?${query}` : "/membros";
  return request(endpoint, { method: "GET" });
}

export async function getMember(id: string) {
  return request(`/membros/${id}`, { method: "GET" });
}

export async function createMember(input: {
  name: string;
  last_name: string;
  cpf: string;
  email: string;
  birth_date: string;
  region: string;
  phone: string;
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
  input: {
    name?: string;
    last_name?: string;
    cpf?: string;
    email?: string;
    birth_date?: string;
    region?: string;
    phone?: string;
    role?: string;
    photo_url?: string | null;
  }
) {
  return request(`/membros/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export async function uploadMemberPhoto(id: string, file: File) {
  const formData = new FormData();
  formData.append("file", file);
  return request(`/membros/${id}/foto`, {
    method: "POST",
    body: formData,
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

export async function requestPasswordReset(email: string) {
  return request("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function verifyResetToken(input: { email: string; token: string }) {
  return request("/auth/verify-reset-token", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function resetPassword(input: {
  email: string;
  token: string;
  novaSenha: string;
  novaSenhaConfirmacao: string;
}) {
  return request("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function registerUser(input: {
  name: string;
  last_name: string;
  cpf: string;
  email: string;
  birth_date: string;
  region: string;
  phone: string;
  role: string;
  password: string;
}) {
  return request('/auth/register', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function getCourses(params: {
  status?: "available" | "full" | "all";
  page?: number;
  limit?: number;
} = {}) {
  const searchParams = new URLSearchParams();
  if (params.status) searchParams.set("status", params.status);
  if (params.page) searchParams.set("page", String(params.page));
  if (params.limit) searchParams.set("limit", String(params.limit));

  const query = searchParams.toString();
  const endpoint = query ? `/cursos?${query}` : "/cursos";
  return request(endpoint, { method: "GET" });
}

export async function createCourse(input: {
  title: string;
  description?: string;
  course_date: string;
  location?: string;
  capacity: number;
  instructor_id: string;
}) {
  return request("/cursos", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function getCourse(courseId: string) {
  return request(`/cursos/${courseId}`, { method: "GET" });
}

export async function updateCourse(
  courseId: string,
  input: {
    title?: string;
    description?: string;
    course_date?: string;
    location?: string;
    capacity?: number;
    instructor_id?: string;
  }
) {
  return request(`/cursos/${courseId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function deleteCourse(courseId: string) {
  return request(`/cursos/${courseId}`, { method: "DELETE" });
}

export async function enrollInCourse(courseId: string, memberId: string) {
  return request(`/cursos/${courseId}/inscricoes`, {
    method: "POST",
    body: JSON.stringify({ member_id: memberId }),
  });
}

// Adicionaremos mais funções aqui (ex: createReport, etc.)
