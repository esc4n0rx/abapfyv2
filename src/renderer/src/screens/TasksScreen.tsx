import { DragEvent, FormEvent, useEffect, useMemo, useState } from 'react'
import {
  CalendarDays,
  Check,
  CheckSquare2,
  CircleAlert,
  GripVertical,
  Plus,
  Trash2,
  X
} from 'lucide-react'
import {
  useTasksStore,
  type TaskInput,
  type TaskItem,
  type TaskPriority,
  type TaskStatus
} from '@renderer/store/tasksStore'
import './TasksScreen.css'

const COLUMNS: { id: TaskStatus; label: string; description: string }[] = [
  { id: 'todo', label: 'A fazer', description: 'Trabalhos planejados' },
  { id: 'in_progress', label: 'Em andamento', description: 'Execução atual' },
  { id: 'blocked', label: 'Bloqueado', description: 'Aguardando resolução' },
  { id: 'done', label: 'Concluído', description: 'Trabalhos finalizados' }
]

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta'
}

const EMPTY_FORM: TaskInput = {
  title: '',
  description: '',
  status: 'todo',
  priority: 'medium',
  dueDate: ''
}

function TaskCard({ task, onOpen }: { task: TaskItem; onOpen: () => void }): JSX.Element {
  const completed = task.subtasks.filter((item) => item.completed).length
  const overdue = Boolean(
    task.dueDate && task.status !== 'done' && task.dueDate < new Date().toISOString().slice(0, 10)
  )

  function handleDragStart(event: DragEvent<HTMLDivElement>): void {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('application/x-abapfy-task', task.id)
  }

  return (
    <div
      className="task-card"
      draggable
      onDragStart={handleDragStart}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault()
        event.stopPropagation()
        const draggedId = event.dataTransfer.getData('application/x-abapfy-task')
        if (draggedId && draggedId !== task.id) {
          void useTasksStore.getState().moveTask(draggedId, task.status, task.id)
        }
      }}
      onClick={onOpen}
    >
      <div className="task-card-topline">
        <span className={`task-priority task-priority-${task.priority}`}>
          {PRIORITY_LABELS[task.priority]}
        </span>
        <GripVertical size={14} strokeWidth={1.5} className="task-card-grip" />
      </div>
      <h3 className="task-card-title">{task.title}</h3>
      {task.description && <p className="task-card-description">{task.description}</p>}
      {(task.dueDate || task.subtasks.length > 0) && (
        <div className="task-card-meta">
          {task.dueDate && (
            <span className={overdue ? 'task-card-due task-card-due-overdue' : 'task-card-due'}>
              <CalendarDays size={12} strokeWidth={1.75} />
              {new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(
                new Date(`${task.dueDate}T00:00:00Z`)
              )}
            </span>
          )}
          {task.subtasks.length > 0 && (
            <span className="task-card-progress">
              <CheckSquare2 size={12} strokeWidth={1.75} />
              {completed}/{task.subtasks.length}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

function TaskModal({
  task,
  initialStatus,
  onClose
}: {
  task: TaskItem | null
  initialStatus: TaskStatus
  onClose: () => void
}): JSX.Element {
  const [form, setForm] = useState<TaskInput>(() =>
    task
      ? {
          title: task.title,
          description: task.description ?? '',
          status: task.status,
          priority: task.priority,
          dueDate: task.dueDate ?? ''
        }
      : { ...EMPTY_FORM, status: initialStatus }
  )
  const [subtaskTitle, setSubtaskTitle] = useState('')
  const [saving, setSaving] = useState(false)
  const liveTask = useTasksStore((state) =>
    task ? (state.tasks.find((item) => item.id === task.id) ?? null) : null
  )
  const { createTask, updateTask, deleteTask, addSubtask, toggleSubtask, deleteSubtask } =
    useTasksStore()

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault()
    if (!form.title.trim()) return
    setSaving(true)
    const ok = task ? await updateTask(task.id, form) : Boolean(await createTask(form))
    setSaving(false)
    if (ok) onClose()
  }

  async function handleDelete(): Promise<void> {
    if (!task || !window.confirm('Excluir esta tarefa e todas as subtarefas?')) return
    if (await deleteTask(task.id)) onClose()
  }

  async function handleAddSubtask(event: FormEvent): Promise<void> {
    event.preventDefault()
    if (!task || !subtaskTitle.trim()) return
    await addSubtask(task.id, subtaskTitle)
    setSubtaskTitle('')
  }

  return (
    <div className="task-modal-backdrop" onMouseDown={onClose}>
      <div className="task-modal" onMouseDown={(event) => event.stopPropagation()}>
        <div className="task-modal-header">
          <div>
            <h2>{task ? 'Detalhes da tarefa' : 'Nova tarefa'}</h2>
            <p>
              {task
                ? 'Atualize o card e acompanhe suas subtarefas.'
                : 'Adicione um trabalho ao seu quadro pessoal.'}
            </p>
          </div>
          <button type="button" className="task-icon-button" onClick={onClose} aria-label="Fechar">
            <X size={17} />
          </button>
        </div>

        <form className="task-form" onSubmit={handleSubmit}>
          <label>
            <span>Título</span>
            <input
              autoFocus
              value={form.title}
              maxLength={160}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
            />
          </label>
          <label>
            <span>Descrição</span>
            <textarea
              rows={4}
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
            />
          </label>
          <div className="task-form-row">
            <label>
              <span>Status</span>
              <select
                value={form.status}
                onChange={(event) => setForm({ ...form, status: event.target.value as TaskStatus })}
              >
                {COLUMNS.map((column) => (
                  <option key={column.id} value={column.id}>
                    {column.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Prioridade</span>
              <select
                value={form.priority}
                onChange={(event) =>
                  setForm({ ...form, priority: event.target.value as TaskPriority })
                }
              >
                <option value="low">Baixa</option>
                <option value="medium">Média</option>
                <option value="high">Alta</option>
              </select>
            </label>
            <label>
              <span>Prazo</span>
              <input
                type="date"
                value={form.dueDate}
                onChange={(event) => setForm({ ...form, dueDate: event.target.value })}
              />
            </label>
          </div>
          <div className="task-modal-actions">
            {task && (
              <button type="button" className="task-delete-button" onClick={handleDelete}>
                <Trash2 size={14} /> Excluir
              </button>
            )}
            <span className="task-actions-spacer" />
            <button type="button" className="task-secondary-button" onClick={onClose}>
              Cancelar
            </button>
            <button
              type="submit"
              className="task-primary-button"
              disabled={!form.title.trim() || saving}
            >
              {task ? 'Salvar alterações' : 'Criar tarefa'}
            </button>
          </div>
        </form>

        {task && liveTask && (
          <div className="task-subtasks">
            <div className="task-subtasks-header">
              <span>Subtarefas</span>
              <span>
                {liveTask.subtasks.filter((item) => item.completed).length}/
                {liveTask.subtasks.length}
              </span>
            </div>
            <div className="task-subtasks-list">
              {liveTask.subtasks.length === 0 && (
                <p className="task-subtasks-empty">Nenhuma subtarefa adicionada.</p>
              )}
              {liveTask.subtasks.map((subtask) => (
                <div key={subtask.id} className="task-subtask-row">
                  <button
                    type="button"
                    className={`task-subtask-check ${subtask.completed ? 'task-subtask-check-done' : ''}`}
                    onClick={() => toggleSubtask(subtask.id, !subtask.completed)}
                  >
                    {subtask.completed && <Check size={12} strokeWidth={2.5} />}
                  </button>
                  <span
                    className={
                      subtask.completed
                        ? 'task-subtask-title task-subtask-title-done'
                        : 'task-subtask-title'
                    }
                  >
                    {subtask.title}
                  </span>
                  <button
                    type="button"
                    className="task-subtask-delete"
                    onClick={() => deleteSubtask(subtask.id)}
                    aria-label="Excluir subtarefa"
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
            <form className="task-subtask-form" onSubmit={handleAddSubtask}>
              <input
                value={subtaskTitle}
                maxLength={160}
                placeholder="Adicionar subtarefa…"
                onChange={(event) => setSubtaskTitle(event.target.value)}
              />
              <button type="submit" disabled={!subtaskTitle.trim()}>
                <Plus size={14} /> Adicionar
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}

export function TasksScreen(): JSX.Element {
  const { tasks, loaded, loading, error, load, moveTask } = useTasksStore()
  const [modal, setModal] = useState<{ task: TaskItem | null; status: TaskStatus } | null>(null)

  useEffect(() => {
    if (!loaded) void load()
  }, [loaded, load])
  const byStatus = useMemo(
    () =>
      Object.fromEntries(
        COLUMNS.map((column) => [
          column.id,
          tasks.filter((task) => task.status === column.id).sort((a, b) => a.position - b.position)
        ])
      ) as Record<TaskStatus, TaskItem[]>,
    [tasks]
  )

  return (
    <main className="tasks-screen">
      <header className="tasks-header">
        <div>
          <h1>Gerenciamento de tarefas</h1>
          <p>Organize seus trabalhos, prioridades e próximos passos.</p>
        </div>
        <button
          type="button"
          className="task-primary-button"
          onClick={() => setModal({ task: null, status: 'todo' })}
        >
          <Plus size={14} /> Nova tarefa
        </button>
      </header>

      {error && (
        <div className="tasks-error">
          <CircleAlert size={15} /> {error}
        </div>
      )}
      <div className="tasks-board">
        {COLUMNS.map((column) => (
          <section
            key={column.id}
            className="task-column"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault()
              const taskId = event.dataTransfer.getData('application/x-abapfy-task')
              if (taskId) void moveTask(taskId, column.id)
            }}
          >
            <div className="task-column-header">
              <div>
                <h2>{column.label}</h2>
                <p>{column.description}</p>
              </div>
              <span>{byStatus[column.id].length}</span>
            </div>
            <div className="task-column-list">
              {loading && !loaded && <div className="task-column-empty">Carregando…</div>}
              {!loading && byStatus[column.id].length === 0 && (
                <div className="task-column-empty">Solte um card aqui</div>
              )}
              {byStatus[column.id].map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onOpen={() => setModal({ task, status: task.status })}
                />
              ))}
              <button
                type="button"
                className="task-column-add"
                onClick={() => setModal({ task: null, status: column.id })}
              >
                <Plus size={13} /> Adicionar tarefa
              </button>
            </div>
          </section>
        ))}
      </div>
      {modal && (
        <TaskModal task={modal.task} initialStatus={modal.status} onClose={() => setModal(null)} />
      )}
    </main>
  )
}
