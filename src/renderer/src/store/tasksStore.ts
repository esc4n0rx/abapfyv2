import { create } from 'zustand'
import { supabase } from '@renderer/lib/supabaseClient'
import { useAuthStore } from '@renderer/store/authStore'

export type TaskStatus = 'todo' | 'in_progress' | 'blocked' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high'

export interface TaskSubtask {
  id: string
  taskId: string
  title: string
  completed: boolean
  position: number
}

export interface TaskItem {
  id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  dueDate: string | null
  position: number
  subtasks: TaskSubtask[]
}

export interface TaskInput {
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  dueDate: string
}

interface TasksState {
  loaded: boolean
  loading: boolean
  tasks: TaskItem[]
  error: string | null
  load: () => Promise<void>
  createTask: (input: TaskInput) => Promise<TaskItem | null>
  updateTask: (id: string, input: TaskInput) => Promise<boolean>
  deleteTask: (id: string) => Promise<boolean>
  moveTask: (id: string, status: TaskStatus, beforeTaskId?: string) => Promise<void>
  addSubtask: (taskId: string, title: string) => Promise<void>
  toggleSubtask: (id: string, completed: boolean) => Promise<void>
  deleteSubtask: (id: string) => Promise<void>
  reset: () => void
}

function currentUserId(): string | null {
  return useAuthStore.getState().user?.id ?? null
}

function mapSubtask(row: Record<string, unknown>): TaskSubtask {
  return {
    id: row.id as string,
    taskId: row.task_id as string,
    title: row.title as string,
    completed: row.completed as boolean,
    position: Number(row.position)
  }
}

export const useTasksStore = create<TasksState>((set, get) => ({
  loaded: false,
  loading: false,
  tasks: [],
  error: null,

  load: async () => {
    const userId = currentUserId()
    if (!userId) return
    set({ loading: true, error: null })

    const { data, error } = await supabase
      .from('tasks')
      .select('*, task_subtasks(*)')
      .eq('user_id', userId)
      .order('position', { ascending: true })

    if (error) {
      set({ loaded: true, loading: false, error: 'Não foi possível carregar as tarefas.' })
      return
    }

    const tasks: TaskItem[] = (data ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      status: row.status,
      priority: row.priority,
      dueDate: row.due_date,
      position: Number(row.position),
      subtasks: (row.task_subtasks ?? [])
        .map((item: Record<string, unknown>) => mapSubtask(item))
        .sort((a: TaskSubtask, b: TaskSubtask) => a.position - b.position)
    }))
    set({ loaded: true, loading: false, tasks })
  },

  createTask: async (input) => {
    const userId = currentUserId()
    if (!userId) return null
    const maxPosition = Math.max(
      0,
      ...get()
        .tasks.filter((task) => task.status === input.status)
        .map((task) => task.position)
    )
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        user_id: userId,
        title: input.title.trim(),
        description: input.description.trim() || null,
        status: input.status,
        priority: input.priority,
        due_date: input.dueDate || null,
        position: maxPosition + 1000
      })
      .select('*')
      .single()
    if (error || !data) return null
    const task: TaskItem = {
      id: data.id,
      title: data.title,
      description: data.description,
      status: data.status,
      priority: data.priority,
      dueDate: data.due_date,
      position: Number(data.position),
      subtasks: []
    }
    set((state) => ({ tasks: [...state.tasks, task] }))
    return task
  },

  updateTask: async (id, input) => {
    const userId = currentUserId()
    if (!userId) return false
    const current = get().tasks.find((task) => task.id === id)
    const movedToAnotherColumn = current && current.status !== input.status
    const position = movedToAnotherColumn
      ? Math.max(
          0,
          ...get()
            .tasks.filter((task) => task.status === input.status && task.id !== id)
            .map((task) => task.position)
        ) + 1000
      : current?.position
    const { error } = await supabase
      .from('tasks')
      .update({
        title: input.title.trim(),
        description: input.description.trim() || null,
        status: input.status,
        priority: input.priority,
        due_date: input.dueDate || null,
        position
      })
      .eq('id', id)
      .eq('user_id', userId)
    if (error) return false
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === id
          ? {
              ...task,
              title: input.title.trim(),
              description: input.description.trim() || null,
              status: input.status,
              priority: input.priority,
              dueDate: input.dueDate || null,
              position: position ?? task.position
            }
          : task
      )
    }))
    return true
  },

  deleteTask: async (id) => {
    const userId = currentUserId()
    if (!userId) return false
    const { error } = await supabase.from('tasks').delete().eq('id', id).eq('user_id', userId)
    if (error) return false
    set((state) => ({ tasks: state.tasks.filter((task) => task.id !== id) }))
    return true
  },

  moveTask: async (id, status, beforeTaskId) => {
    const userId = currentUserId()
    if (!userId) return
    const moving = get().tasks.find((task) => task.id === id)
    if (!moving) return
    const target = get()
      .tasks.filter((task) => task.status === status && task.id !== id)
      .sort((a, b) => a.position - b.position)
    const targetIndex = beforeTaskId ? target.findIndex((task) => task.id === beforeTaskId) : -1
    target.splice(targetIndex >= 0 ? targetIndex : target.length, 0, { ...moving, status })
    const positions = target.map((task, index) => ({ id: task.id, position: (index + 1) * 1000 }))

    set((state) => ({
      tasks: state.tasks.map((task) => {
        const next = positions.find((item) => item.id === task.id)
        return next
          ? { ...task, status: task.id === id ? status : task.status, position: next.position }
          : task
      })
    }))

    await Promise.all(
      positions.map((item) =>
        supabase
          .from('tasks')
          .update({ position: item.position, ...(item.id === id ? { status } : {}) })
          .eq('id', item.id)
          .eq('user_id', userId)
      )
    )
  },

  addSubtask: async (taskId, title) => {
    const userId = currentUserId()
    if (!userId || !title.trim()) return
    const task = get().tasks.find((item) => item.id === taskId)
    const position = Math.max(0, ...(task?.subtasks.map((item) => item.position) ?? [])) + 1000
    const { data } = await supabase
      .from('task_subtasks')
      .insert({ user_id: userId, task_id: taskId, title: title.trim(), position })
      .select('*')
      .single()
    if (!data) return
    set((state) => ({
      tasks: state.tasks.map((item) =>
        item.id === taskId ? { ...item, subtasks: [...item.subtasks, mapSubtask(data)] } : item
      )
    }))
  },

  toggleSubtask: async (id, completed) => {
    const userId = currentUserId()
    if (!userId) return
    await supabase.from('task_subtasks').update({ completed }).eq('id', id).eq('user_id', userId)
    set((state) => ({
      tasks: state.tasks.map((task) => ({
        ...task,
        subtasks: task.subtasks.map((item) => (item.id === id ? { ...item, completed } : item))
      }))
    }))
  },

  deleteSubtask: async (id) => {
    const userId = currentUserId()
    if (!userId) return
    await supabase.from('task_subtasks').delete().eq('id', id).eq('user_id', userId)
    set((state) => ({
      tasks: state.tasks.map((task) => ({
        ...task,
        subtasks: task.subtasks.filter((item) => item.id !== id)
      }))
    }))
  },

  reset: () => set({ loaded: false, loading: false, tasks: [], error: null })
}))
