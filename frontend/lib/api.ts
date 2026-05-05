// lib/api.ts

export type ApiError = {
  message?: string;
  error?: string;
  statusCode?: number;
};

class ApiRequestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
  }
}

export function getErrorMessage(err: unknown, fallback = "Erro desconhecido."): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null) {
    const e = err as ApiError;
    return e.message ?? e.error ?? fallback;
  }
  return fallback;
}

const RAW_API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001/api/v1";
const API_BASE_URL = RAW_API_BASE_URL.replace(/\/+$/, "");
export const API_ORIGIN = API_BASE_URL.replace(/\/api\/v1$/, "");

async function request(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE_URL}${endpoint}`;

  // Usa sessionStorage (limpo ao fechar a aba) como fallback para ambientes
  // sem HTTPS onde o cookie httpOnly não trafega automaticamente.
  const token =
    typeof sessionStorage !== "undefined"
      ? sessionStorage.getItem("authToken")
      : null;

  const headers = new Headers(options.headers);
  const isFormData =
    typeof FormData !== "undefined" && options.body instanceof FormData;
  const hasBody = options.body !== undefined && options.body !== null;
  if (hasBody && !isFormData) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: "include", // envia cookie httpOnly automaticamente
  });

  if (!response.ok) {
    const isLoginRequest = endpoint.startsWith("/auth/login");
    if (response.status === 401 && !isLoginRequest) {
      sessionStorage.removeItem("authToken");
      window.location.href = "/login";
    }
    const errorData = await response.json().catch(() => ({}));
    throw new ApiRequestError(
      errorData.message || "Erro na requisição à API",
      response.status
    );
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

export async function getReports(params: {
  period_start?: string;
  period_end?: string;
  limit?: number;
} = {}) {
  const searchParams = new URLSearchParams();
  if (params.period_start) searchParams.set("period_start", params.period_start);
  if (params.period_end) searchParams.set("period_end", params.period_end);
  if (params.limit) searchParams.set("limit", String(params.limit));
  const query = searchParams.toString();
  const endpoint = query ? `/relatorios?${query}` : "/relatorios";
  return request(endpoint, { method: "GET" });
}

export async function getReportsStats(month: number, year: number) {
  return request(`/relatorios/stats?month=${month}&year=${year}`, { method: "GET" });
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
  title_schedule: string;
  transport_type: string;
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

export async function uploadReportMedia(reportId: string, file: File, topic?: string) {
  const formData = new FormData();

  // Text fields must come BEFORE the file so @fastify/multipart can read them
  // from fileData.fields when using request.file() (streaming parser)
  const mimeType = (file.type || "").toLowerCase();
  if (mimeType.startsWith("image/")) {
    formData.append("media_type", "image");
  } else if (mimeType.startsWith("video/")) {
    formData.append("media_type", "video");
  }

  if (topic) {
    formData.append("topic", topic);
  }

  formData.append("file", file);

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
    pix?: string | null;
    emergency_contact_name?: string | null;
    emergency_contact_phone?: string | null;
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

export async function deleteMemberPhoto(id: string) {
  try {
    return await request(`/membros/${id}/foto`, {
      method: "DELETE",
    });
  } catch (err: unknown) {
    if (err instanceof ApiRequestError && err.status === 404) {
      // Fallback para compatibilidade com backends antigos sem rota /foto.
      return updateMember(id, { photo_url: null });
    }
    throw err;
  }
}

export async function deleteMember(id: string) {
  return request(`/membros/${id}`, { method: 'DELETE' });
}

export async function login(email: string, password: string) {
  return request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function logout() {
  try {
    await request("/auth/logout", { method: "POST" });
  } finally {
    sessionStorage.removeItem("authToken");
    sessionStorage.removeItem("user");
  }
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
  pix?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  role: string;
  password: string;
}) {
  return request('/auth/register', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function getCourses(params: {
  status?: "available" | "full" | "all" | "archived";
  page?: number;
  limit?: number;
  period_start?: string;
  period_end?: string;
} = {}) {
  const searchParams = new URLSearchParams();
  if (params.status) searchParams.set("status", params.status);
  if (params.page) searchParams.set("page", String(params.page));
  if (params.limit) searchParams.set("limit", String(params.limit));
  if (params.period_start) searchParams.set("period_start", params.period_start);
  if (params.period_end) searchParams.set("period_end", params.period_end);

  const query = searchParams.toString();
  const endpoint = query ? `/cursos?${query}` : "/cursos";
  return request(endpoint, { method: "GET" });
}

export async function createCourse(input: {
  title: string;
  description?: string;
  course_date: string;
  location?: string;
  capacity?: number;
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
    capacity?: number | null;
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

export async function cancelEnrollment(courseId: string, enrollmentId: string) {
  return request(`/cursos/${courseId}/inscricoes/${enrollmentId}`, {
    method: "DELETE",
  });
}

export async function updateEnrollmentStatus(
  courseId: string,
  enrollmentId: string,
  status: "attended" | "missed"
) {
  return request(`/cursos/${courseId}/inscricoes/${enrollmentId}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function getEnrolledMembers(
  courseId: string
): Promise<{ id: string; name: string }[]> {
  try {
    const data = await request(`/cursos/${courseId}/inscricoes`, { method: "GET" });
    return data.data || [];
  } catch (error) {
    console.error('Error fetching enrolled members:', error);
    throw error;
  }
}

export async function finalizeCourse(
  courseId: string,
  enrollments: Array<{ enrollment_id: string; status: "attended" | "missed" }>
) {
  return request(`/cursos/${courseId}/finalizar`, {
    method: "POST",
    body: JSON.stringify({ enrollments }),
  });
}

export async function importCourse(input: {
  title: string;
  description?: string;
  course_date: string;
  location?: string;
  instructor_id: string;
  members: Array<{ member_id: string; status: "attended" | "missed" }>;
}) {
  return request("/cursos/importar", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function syncCourseParticipants(
  courseId: string,
  members: Array<{ member_id: string; status: "attended" | "missed" }>
) {
  return request(`/cursos/${courseId}/participantes`, {
    method: "PATCH",
    body: JSON.stringify({ members }),
  });
}

export async function getFeedbacks(params: {
  type?: "positive" | "negative";
  member_id?: string;
  member_role?: string;
  page?: number;
  limit?: number;
} = {}) {
  const searchParams = new URLSearchParams();
  if (params.type) searchParams.set("type", params.type);
  if (params.member_id) searchParams.set("member_id", params.member_id);
  if (params.member_role) searchParams.set("member_role", params.member_role);
  if (params.page) searchParams.set("page", String(params.page));
  if (params.limit) searchParams.set("limit", String(params.limit));
  const query = searchParams.toString();
  const endpoint = query ? `/feedbacks?${query}` : "/feedbacks";
  return request(endpoint, { method: "GET" });
}

export async function createFeedback(input: {
  type: "positive" | "negative";
  text?: string;
  member_ids: string[];
  event_date?: string;
}) {
  return request("/feedbacks", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function createFeedbackWithAudio(formData: FormData) {
  return request("/feedbacks", {
    method: "POST",
    body: formData,
  });
}

export async function deleteFeedback(id: string) {
  return request(`/feedbacks/${id}`, { method: "DELETE" });
}

// GOOGLE_CALENDAR_DISABLED_START
// // ── Google Calendar ────────────────────────────────────────────────────────────

// /** Obtém a URL OAuth do Google via API (com autenticação) e redireciona o usuário. */
// export async function startGoogleOAuth(): Promise<void> {
//   const res = await request("/auth/google", { method: "GET" });
//   window.location.href = res.url;
// }

// /** Desconecta a conta Google do usuário logado. */
// export async function disconnectGoogle() {
//   return request("/auth/google", { method: "DELETE" });
// }
// GOOGLE_CALENDAR_DISABLED_END
