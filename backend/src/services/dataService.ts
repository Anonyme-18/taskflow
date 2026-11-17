import { config } from '../config';
import { Task, User, UserWithPassword } from '../types';

export class DataUnavailableError extends Error {
  statusCode: number;
  constructor(message = 'Communication interrompue avec la base de données. Vérifiez que la passerelle ou le tunnel sont actifs.') {
    super(message);
    this.name = 'DataUnavailableError';
    this.statusCode = 503;
  }
}

// Stockage autonome en mémoire
const memoryUsers: UserWithPassword[] = [];
const memoryTasks: Task[] = [];

// Appel sécurisé vers la Passerelle (si configurée par votre coéquipier)
async function callGateway<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  if (!config.gatewayUrl) {
    throw new DataUnavailableError('GATEWAY_URL non configuré.');
  }

  const url = `${config.gatewayUrl}${endpoint}`;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'x-gateway-secret': config.gatewaySecret,
        ...(options.headers || {}),
      },
    });

    clearTimeout(timeout);

    if (!response.ok) {
      let errorMsg = `Erreur passerelle: HTTP ${response.status}`;
      try {
        const errJson = await response.json();
        errorMsg = errJson.message || errorMsg;
      } catch {
        // Ignorer
      }
      throw new Error(errorMsg);
    }

    return (await response.json()) as T;
  } catch (error: any) {
    console.error(`[Passerelle Erreur] ${endpoint}:`, error.message);
    throw new DataUnavailableError(
      'Impossible de joindre la passerelle de données. Le serveur de données est indisponible.'
    );
  }
}

export const dataService = {
  // Récupérer un utilisateur par email
  async getUserByEmail(email: string): Promise<UserWithPassword | null> {
    if (config.gatewayUrl) {
      return callGateway<UserWithPassword | null>('/api/internal/users/by-email', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
    }

    // Mode autonome
    const found = memoryUsers.find((u) => u.email.toLowerCase() === email.toLowerCase());
    return found || null;
  },

  // Récupérer un utilisateur par ID
  async getUserById(id: string): Promise<User | null> {
    if (config.gatewayUrl) {
      return callGateway<User | null>(`/api/internal/users/${id}`);
    }

    // Mode autonome
    const found = memoryUsers.find((u) => u.id === id);
    if (!found) return null;
    return {
      id: found.id,
      full_name: found.full_name,
      email: found.email,
      created_at: found.created_at,
    };
  },

  // Créer un utilisateur
  async createUser(data: { full_name: string; email: string; password_hash: string }): Promise<User> {
    if (config.gatewayUrl) {
      return callGateway<User>('/api/internal/users', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    }

    // Mode autonome
    const newUser: UserWithPassword = {
      id: 'user-' + Date.now(),
      full_name: data.full_name,
      email: data.email.toLowerCase(),
      password_hash: data.password_hash,
      created_at: new Date().toISOString(),
    };
    memoryUsers.push(newUser);
    return {
      id: newUser.id,
      full_name: newUser.full_name,
      email: newUser.email,
      created_at: newUser.created_at,
    };
  },

  // Lister toutes les tâches d'un utilisateur
  async getTasks(userId: string): Promise<Task[]> {
    if (config.gatewayUrl) {
      return callGateway<Task[]>(`/api/internal/tasks?userId=${userId}`);
    }

    // Mode autonome
    return memoryTasks
      .filter((t) => t.user_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  // Récupérer une tâche précise
  async getTaskById(id: string, userId: string): Promise<Task | null> {
    if (config.gatewayUrl) {
      return callGateway<Task | null>(`/api/internal/tasks/${id}?userId=${userId}`);
    }

    // Mode autonome
    const found = memoryTasks.find((t) => t.id === id && t.user_id === userId);
    return found || null;
  },

  // Créer une tâche
  async createTask(data: {
    user_id: string;
    title: string;
    description?: string | null;
    status: string;
    priority: string;
    due_date?: string | null;
  }): Promise<Task> {
    if (config.gatewayUrl) {
      return callGateway<Task>('/api/internal/tasks', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    }

    // Mode autonome
    const newTask: Task = {
      id: 'task-' + Date.now(),
      user_id: data.user_id,
      title: data.title,
      description: data.description || null,
      status: data.status as any,
      priority: data.priority as any,
      due_date: data.due_date || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    memoryTasks.push(newTask);
    return newTask;
  },

  // Mettre à jour une tâche
  async updateTask(
    id: string,
    userId: string,
    data: {
      title?: string;
      description?: string | null;
      status?: string;
      priority?: string;
      due_date?: string | null;
    }
  ): Promise<Task | null> {
    if (config.gatewayUrl) {
      return callGateway<Task | null>(`/api/internal/tasks/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ userId, ...data }),
      });
    }

    // Mode autonome
    const task = memoryTasks.find((t) => t.id === id && t.user_id === userId);
    if (!task) return null;

    if (data.title !== undefined) task.title = data.title;
    if (data.description !== undefined) task.description = data.description;
    if (data.status !== undefined) task.status = data.status as any;
    if (data.priority !== undefined) task.priority = data.priority as any;
    if (data.due_date !== undefined) task.due_date = data.due_date;
    task.updated_at = new Date().toISOString();

    return task;
  },

  // Supprimer une tâche
  async deleteTask(id: string, userId: string): Promise<boolean> {
    if (config.gatewayUrl) {
      const res = await callGateway<{ success: boolean }>(`/api/internal/tasks/${id}?userId=${userId}`, {
        method: 'DELETE',
      });
      return !!res?.success;
    }

    // Mode autonome
    const taskIndex = memoryTasks.findIndex((t) => t.id === id && t.user_id === userId);
    if (taskIndex === -1) return false;

    memoryTasks.splice(taskIndex, 1);
    return true;
  },

  // Vérifier la santé du service
  async checkHealth(): Promise<{ status: string; mode: string; details?: any }> {
    if (config.gatewayUrl) {
      try {
        const res = await callGateway<any>('/api/internal/health');
        return { status: 'healthy', mode: 'gateway_connected', details: res };
      } catch (err: any) {
        return { status: 'degraded', mode: 'gateway_disconnected', details: { error: err.message } };
      }
    }

    return { status: 'healthy', mode: 'autonomous_backend', details: 'Backend opérationnel' };
  },
};
