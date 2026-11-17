import { Response, NextFunction } from 'express';
import { dataService } from '../services/dataService';
import { AuthenticatedRequest, TaskPriority, TaskStatus } from '../types';

const ALLOWED_STATUSES: TaskStatus[] = ['À faire', 'En cours', 'Terminée'];
const ALLOWED_PRIORITIES: TaskPriority[] = ['Basse', 'Moyenne', 'Haute'];

export const getAllTasks = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const tasks = await dataService.getTasks(userId);
    res.status(200).json(tasks);
  } catch (error) {
    next(error);
  }
};

export const getTaskById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const task = await dataService.getTaskById(id, userId);
    if (!task) {
      res.status(404).json({ message: 'Tâche non trouvée ou accès non autorisé.' });
      return;
    }

    res.status(200).json(task);
  } catch (error) {
    next(error);
  }
};

export const createTask = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { title, description, status, priority, due_date } = req.body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      res.status(400).json({ message: 'Le titre de la tâche est obligatoire.' });
      return;
    }

    const taskStatus: TaskStatus = status || 'À faire';
    if (!ALLOWED_STATUSES.includes(taskStatus)) {
      res.status(400).json({
        message: `Statut invalide. Valeurs autorisées: ${ALLOWED_STATUSES.join(', ')}`,
      });
      return;
    }

    const taskPriority: TaskPriority = priority || 'Moyenne';
    if (!ALLOWED_PRIORITIES.includes(taskPriority)) {
      res.status(400).json({
        message: `Priorité invalide. Valeurs autorisées: ${ALLOWED_PRIORITIES.join(', ')}`,
      });
      return;
    }

    const task = await dataService.createTask({
      user_id: userId,
      title: title.trim(),
      description: description ? description.trim() : null,
      status: taskStatus,
      priority: taskPriority,
      due_date: due_date || null,
    });

    res.status(201).json(task);
  } catch (error) {
    next(error);
  }
};

export const updateTask = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const { title, description, status, priority, due_date } = req.body;

    // Vérifier l'existence et l'appartenance
    const existingTask = await dataService.getTaskById(id, userId);
    if (!existingTask) {
      res.status(404).json({ message: 'Tâche non trouvée ou accès non autorisé.' });
      return;
    }

    if (title !== undefined && (!title || typeof title !== 'string' || !title.trim())) {
      res.status(400).json({ message: 'Le titre de la tâche ne peut pas être vide.' });
      return;
    }

    if (status !== undefined && !ALLOWED_STATUSES.includes(status)) {
      res.status(400).json({
        message: `Statut invalide. Valeurs autorisées: ${ALLOWED_STATUSES.join(', ')}`,
      });
      return;
    }

    if (priority !== undefined && !ALLOWED_PRIORITIES.includes(priority)) {
      res.status(400).json({
        message: `Priorité invalide. Valeurs autorisées: ${ALLOWED_PRIORITIES.join(', ')}`,
      });
      return;
    }

    const updated = await dataService.updateTask(id, userId, {
      title: title !== undefined ? title.trim() : undefined,
      description: description !== undefined ? (description ? description.trim() : null) : undefined,
      status,
      priority,
      due_date: due_date !== undefined ? due_date : undefined,
    });

    res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
};

export const deleteTask = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const existingTask = await dataService.getTaskById(id, userId);
    if (!existingTask) {
      res.status(404).json({ message: 'Tâche non trouvée ou accès non autorisé.' });
      return;
    }

    const success = await dataService.deleteTask(id, userId);
    if (!success) {
      res.status(404).json({ message: 'Impossible de supprimer la tâche.' });
      return;
    }

    res.status(200).json({ message: 'Tâche supprimée avec succès.' });
  } catch (error) {
    next(error);
  }
};
