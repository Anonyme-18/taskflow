import { AuthResponse, Task, TaskStatus, User } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

class ApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('taskflow_token');
}

export function setToken(token: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('taskflow_token', token);
  }
}

export function removeToken() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('taskflow_token');
    localStorage.removeItem('taskflow_user');
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL.replace(/\/$/, '')}${endpoint}`;
  const token = getToken();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      removeToken();
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
      throw new ApiError('Session expirée ou non autorisée. Veuillez vous reconnecter.', 401);
    }

    if (!response.ok) {
      let errorMessage = `Erreur ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch {
        // Ignorer si la réponse n'est pas du JSON
      }
      throw new ApiError(errorMessage, response.status);
    }

    // Gérer les retours vides (comme 204 No Content)
    if (response.status === 204) {
      return {} as T;
    }

    return await response.json();
  } catch (err: unknown) {
    if (err instanceof ApiError) {
      throw err;
    }

    // Gestion explicite des erreurs réseau / indisponibilité de l'infrastructure
    const isNetworkError =
      err instanceof TypeError &&
      (err.message.includes('Failed to fetch') ||
        err.message.includes('NetworkError') ||
        err.message.includes('Load failed'));

    if (isNetworkError) {
      throw new ApiError(
        "Impossible de joindre le service de données. Veuillez vérifier si l'API ou le tunnel Cloudflare est actif.",
        0
      );
    }

    throw new ApiError(
      (err as Error)?.message || 'Une erreur inattendue est survenue lors de la communication avec le serveur.'
    );
  }
}

export const api = {
  auth: {
    async register(data: { full_name: string; email: string; password: string }): Promise<AuthResponse> {
      return request<AuthResponse>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    async login(data: { email: string; password: string }): Promise<AuthResponse> {
      return request<AuthResponse>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    async getMe(): Promise<User> {
      return request<User>('/api/auth/me', {
        method: 'GET',
      });
    },
  },

  tasks: {
    async getAll(): Promise<Task[]> {
      return request<Task[]>('/api/tasks', {
        method: 'GET',
      });
    },

    async getById(id: string): Promise<Task> {
      return request<Task>(`/api/tasks/${id}`, {
        method: 'GET',
      });
    },

    async create(data: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'user_id'>): Promise<Task> {
      return request<Task>('/api/tasks', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    async update(id: string, data: Partial<Omit<Task, 'id' | 'created_at' | 'updated_at' | 'user_id'>>): Promise<Task> {
      return request<Task>(`/api/tasks/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },

    async updateStatus(id: string, status: TaskStatus): Promise<Task> {
      return request<Task>(`/api/tasks/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });
    },

    async delete(id: string): Promise<void> {
      return request<void>(`/api/tasks/${id}`, {
        method: 'DELETE',
      });
    },
  },
};
export { ApiError };
