// lib/api.ts
const API_BASE_URL = 'http://localhost:3001/api/v1';

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

export async function login(email: string, password: string) {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

// Adicionaremos mais funções aqui (ex: createReport, etc.)