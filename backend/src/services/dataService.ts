import { Pool } from 'pg';
import { config } from '../config';
import { Task, User, UserWithPassword } from '../types';

export class DataUnavailableError extends Error {
  statusCode: number;
  constructor(message = 'Communication interrompue avec la base de données locale. Vérifiez que le PC 1 et le tunnel Cloudflare sont actifs.') {
    super(message);
    this.name = 'DataUnavailableError';
    this.statusCode = 503;
  }
}

// Client direct PostgreSQL (optionnel si DATABASE_URL est fourni)
let directPool: Pool | null = null;
if (!config.gatewayUrl && config.databaseUrl) {
  directPool = new Pool({
    connectionString: config.databaseUrl,
  });
}

// Stockage autonome en mémoire (vide par défaut)
const memoryUsers: UserWithPassword[] = [];
const memoryTasks: Task[] = [];

// Appel sécurisé vers la Passerelle Locale via le tunnel Cloudflare
async function callGateway<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  if (!config.gatewayUrl) {
    throw new DataUnavailableError('GATEWAY_URL non configuré sur le serveur Railway.');
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
    console.error(`[Passerelle Locale Erreur] ${endpoint}:`, error.message);
    throw new DataUnavailableError(
      'Impossible de joindre la base locale. Le PC 1 ou le tunnel Cloudflare est indisponible.'
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

    if (directPool) {
      const res = await directPool.query<UserWithPassword>(
        'SELECT id, full_name, email, password_hash, created_at FROM users WHERE email = $1',
        [email.toLowerCase()]
      );
      return res.rows[0] || null;
    }

    // Fallback mémoire
    const found = memoryUsers.find((u) => u.email.toLowerCase() === email.toLowerCase());
    return found || null;
  },

  // Récupérer un utilisateur par ID
  async getUserById(id: string): Promise<User | null> {
    if (config.gatewayUrl) {
      return callGateway<User | null>(`/api/internal/users/${id}`);
    }

    if (directPool) {
      const res = await directPool.query<User>(
        'SELECT id, full_name, email, created_at FROM users WHERE id = $1',
        [id]
      );
      return res.rows[0] || null;
    }

    // Fallback mémoire
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

    if (directPool) {
      const res = await directPool.query<User>(
        'INSERT INTO users (full_name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, full_name, email, created_at',
        [data.full_name, data.email.toLowerCase(), data.password_hash]
      );
      return res.rows[0];
    }

    // Fallback mémoire
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

    if (directPool) {
      const res = await directPool.query<Task>(
        'SELECT id, user_id, title, description, status, priority, due_date, created_at, updated_at FROM tasks WHERE user_id = $1 ORDER BY created_at DESC',
        [userId]
      );
      return res.rows;
    }

    // Fallback mémoire
    return memoryTasks
      .filter((t) => t.user_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  // Récupérer une tâche précise
  async getTaskById(id: string, userId: string): Promise<Task | null> {
    if (config.gatewayUrl) {
      return callGateway<Task | null>(`/api/internal/tasks/${id}?userId=${userId}`);
    }

    if (directPool) {
      const res = await directPool.query<Task>(
        'SELECT id, user_id, title, description, status, priority, due_date, created_at, updated_at FROM tasks WHERE id = $1 AND user_id = $2',
        [id, userId]
      );
      return res.rows[0] || null;
    }

    // Fallback mémoire
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

    if (directPool) {
      const res = await directPool.query<Task>(
        `INSERT INTO tasks (user_id, title, description, status, priority, due_date)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, user_id, title, description, status, priority, due_date, created_at, updated_at`,
        [data.user_id, data.title, data.description || null, data.status, data.priority, data.due_date || null]
      );
      return res.rows[0];
    }

    // Fallback mémoire
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

    if (directPool) {
      const existing = await directPool.query('SELECT id FROM tasks WHERE id = $1 AND user_id = $2', [id, userId]);
      if (existing.rowCount === 0) return null;

      const fields: string[] = [];
      const values: any[] = [];
      let idx = 1;

      if (data.title !== undefined) {
        fields.push(`title = $${idx++}`);
        values.push(data.title);
      }
      if (data.description !== undefined) {
        fields.push(`description = $${idx++}`);
        values.push(data.description);
      }
      if (data.status !== undefined) {
        fields.push(`status = $${idx++}`);
        values.push(data.status);
      }
      if (data.priority !== undefined) {
        fields.push(`priority = $${idx++}`);
        values.push(data.priority);
      }
      if (data.due_date !== undefined) {
        fields.push(`due_date = $${idx++}`);
        values.push(data.due_date);
      }

      if (fields.length === 0) {
        return this.getTaskById(id, userId);
      }

      values.push(id);
      values.push(userId);

      const query = `
        UPDATE tasks
        SET ${fields.join(', ')}
        WHERE id = $${idx++} AND user_id = $${idx++}
        RETURNING id, user_id, title, description, status, priority, due_date, created_at, updated_at
      `;

      const res = await directPool.query<Task>(query, values);
      return res.rows[0] || null;
    }

    // Fallback mémoire
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

    if (directPool) {
      const res = await directPool.query('DELETE FROM tasks WHERE id = $1 AND user_id = $2', [id, userId]);
      return (res.rowCount ?? 0) > 0;
    }

    // Fallback mémoire
    const taskIndex = memoryTasks.findIndex((t) => t.id === id && t.user_id === userId);
    if (taskIndex === -1) return false;

    memoryTasks.splice(taskIndex, 1);
    return true;
  },

  // Vérifier la santé du service de données
  async checkHealth(): Promise<{ status: string; mode: string; details?: any }> {
    if (config.gatewayUrl) {
      try {
        const res = await callGateway<any>('/api/internal/health');
        return { status: 'healthy', mode: 'hybrid_gateway', details: res };
      } catch (err: any) {
        return { status: 'degraded', mode: 'hybrid_gateway', details: { error: err.message } };
      }
    }

    if (directPool) {
      try {
        await directPool.query('SELECT 1');
        return { status: 'healthy', mode: 'direct_postgres', details: { mode: 'direct_postgres' } };
      } catch (err: any) {
        return { status: 'degraded', mode: 'direct_postgres', details: { error: err.message } };
      }
    }

    return { status: 'healthy', mode: 'autonomous', details: 'Backend ready' };
  },
};
