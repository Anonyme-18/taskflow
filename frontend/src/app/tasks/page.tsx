'use client';

import React, { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { Task, TaskPriority, TaskStatus } from '@/types';
import { StatusBadge } from '@/components/StatusBadge';
import { PriorityBadge } from '@/components/PriorityBadge';
import { ApiStatusBanner } from '@/components/ApiStatusBanner';
import { TaskModal } from '@/components/TaskModal';
import { DeleteConfirmModal } from '@/components/DeleteConfirmModal';

export default function TasksPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtres et recherche
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'created_desc' | 'created_asc' | 'due_date'>('created_desc');

  // Gestion des modales
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [, startTransition] = useTransition();

  const reloadTasks = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.tasks.getAll();
      setTasks(data || []);
    } catch (err: unknown) {
      setError((err as Error)?.message || 'Impossible de récupérer la liste des tâches.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    let isMounted = true;
    api.tasks
      .getAll()
      .then((data) => {
        if (isMounted) setTasks(data || []);
      })
      .catch((err: unknown) => {
        if (isMounted) {
          setError((err as Error)?.message || 'Impossible de récupérer la liste des tâches.');
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [authLoading, isAuthenticated, router]);

  // Création ou modification
  const handleSaveTask = async (data: {
    title: string;
    description: string;
    status: TaskStatus;
    priority: TaskPriority;
    due_date?: string | null;
  }) => {
    if (editingTask) {
      await api.tasks.update(editingTask.id, data);
    } else {
      await api.tasks.create(data);
    }
    startTransition(() => {
      void reloadTasks();
    });
  };

  // Suppression
  const handleConfirmDelete = async () => {
    if (!deletingTask) return;
    setIsDeleting(true);
    try {
      await api.tasks.delete(deletingTask.id);
      setDeletingTask(null);
      startTransition(() => {
        void reloadTasks();
      });
    } catch (err: unknown) {
      setError((err as Error)?.message || 'Échec de la suppression de la tâche.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Changement rapide de statut
  const handleQuickStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    try {
      await api.tasks.updateStatus(taskId, newStatus);
      // Mise à jour optimiste dans l'UI
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
      );
    } catch (err: unknown) {
      setError((err as Error)?.message || 'Impossible de mettre à jour le statut.');
      void reloadTasks();
    }
  };

  // Filtrage et tri
  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus =
      selectedStatus === 'ALL' || task.status === selectedStatus;

    const matchesPriority =
      selectedPriority === 'ALL' || task.priority === selectedPriority;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (sortBy === 'due_date') {
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    }
    if (sortBy === 'created_asc') {
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  if (authLoading || (!isAuthenticated && !authLoading)) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alerte Erreur / Coupure réseau */}
      <ApiStatusBanner error={error} onRetry={reloadTasks} />

      {/* En-tête avec bouton Créer */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestion des Tâches</h1>
          <p className="text-sm text-slate-500 mt-1">
            Consultez, filtrez et organisez l&apos;ensemble de vos tâches.
          </p>
        </div>

        <button
          onClick={() => {
            setEditingTask(null);
            setIsTaskModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>Ajouter une tâche</span>
        </button>
      </div>

      {/* Barre d'outils : Recherche, Filtres, Tri */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Recherche */}
          <div className="md:col-span-2 relative">
            <input
              type="text"
              placeholder="Rechercher par titre ou description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-800"
            />
            <svg
              className="w-4 h-4 text-slate-400 absolute left-3 top-2.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Filtre Statut */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 bg-white"
            >
              <option value="ALL">Tous les statuts</option>
              <option value="À faire">À faire</option>
              <option value="En cours">En cours</option>
              <option value="Terminée">Terminée</option>
            </select>
          </div>

          {/* Filtre Priorité */}
          <div>
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 bg-white"
            >
              <option value="ALL">Toutes les priorités</option>
              <option value="Haute">Haute</option>
              <option value="Moyenne">Moyenne</option>
              <option value="Basse">Basse</option>
            </select>
          </div>
        </div>

        {/* Ligne d'info & Tri */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center text-xs text-slate-500 pt-2 border-t border-slate-100 gap-2">
          <span>{sortedTasks.length} tâche(s) affichée(s)</span>
          <div className="flex items-center gap-2">
            <span>Trier par :</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'created_desc' | 'created_asc' | 'due_date')}
              className="border-none bg-transparent font-medium text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="created_desc">Plus récentes d&apos;abord</option>
              <option value="created_asc">Plus anciennes d&apos;abord</option>
              <option value="due_date">Date d&apos;échéance</option>
            </select>
          </div>
        </div>
      </div>

      {/* Liste des tâches */}
      {loading ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200/80 text-center">
          <div className="w-8 h-8 mx-auto border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-sm text-slate-500">Chargement de vos tâches...</p>
        </div>
      ) : sortedTasks.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200/80 text-center">
          <div className="w-12 h-12 mx-auto mb-3 text-slate-300">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-slate-800">Aucune tâche trouvée</h3>
          <p className="text-xs text-slate-400 mt-1">
            {searchQuery || selectedStatus !== 'ALL' || selectedPriority !== 'ALL'
              ? 'Aucun résultat ne correspond à vos filtres.'
              : 'Commencez par ajouter une nouvelle tâche à votre liste.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {sortedTasks.map((task) => (
            <div
              key={task.id}
              className="bg-white p-5 rounded-xl border border-slate-200/80 hover:border-slate-300 shadow-sm transition flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h3 className="text-base font-bold text-slate-900">{task.title}</h3>
                  <StatusBadge status={task.status} />
                  <PriorityBadge priority={task.priority} />
                </div>

                {task.description && (
                  <p className="text-sm text-slate-600 whitespace-pre-line">{task.description}</p>
                )}

                <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap">
                  {task.due_date && (
                    <div className="flex items-center gap-1 text-slate-500">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>Échéance : {new Date(task.due_date).toLocaleDateString('fr-FR')}</span>
                    </div>
                  )}

                  <span>Créée le {new Date(task.created_at).toLocaleDateString('fr-FR')}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 self-end md:self-center border-t md:border-t-0 pt-3 md:pt-0 w-full md:w-auto justify-end">
                {/* Sélecteur de statut rapide */}
                <select
                  value={task.status}
                  onChange={(e) => handleQuickStatusChange(task.id, e.target.value as TaskStatus)}
                  className="px-2.5 py-1.5 text-xs font-medium border border-slate-200 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 cursor-pointer focus:outline-none"
                  title="Changer rapidement le statut"
                >
                  <option value="À faire">À faire</option>
                  <option value="En cours">En cours</option>
                  <option value="Terminée">Terminée</option>
                </select>

                {/* Bouton Éditer */}
                <button
                  onClick={() => {
                    setEditingTask(task);
                    setIsTaskModalOpen(true);
                  }}
                  className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                  title="Modifier la tâche"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>

                {/* Bouton Supprimer */}
                <button
                  onClick={() => setDeletingTask(task)}
                  className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                  title="Supprimer la tâche"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modale d'ajout ou modification de tâche */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setEditingTask(null);
        }}
        onSubmit={handleSaveTask}
        task={editingTask}
      />

      {/* Modale de confirmation de suppression */}
      <DeleteConfirmModal
        isOpen={!!deletingTask}
        taskTitle={deletingTask?.title || ''}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingTask(null)}
        loading={isDeleting}
      />
    </div>
  );
}
