import { useRef } from 'react'
import type { Block, TaskItem } from '../../data/schema'

interface Props {
  block: Block
  color: string
  onChange: (updated: Block) => void
}

const TODAY = new Date().toISOString().slice(0, 10)

function dueDateColor(dueDate: string | undefined, done: boolean): string {
  if (!dueDate || done) return 'rgba(255,255,255,0.35)'
  const parsed = new Date(dueDate)
  if (isNaN(parsed.getTime())) return 'rgba(255,255,255,0.35)'
  const iso = parsed.toISOString().slice(0, 10)
  if (iso < TODAY) return '#f87171' // overdue
  const sevenDays = new Date(Date.now() + 7 * 86400_000).toISOString().slice(0, 10)
  if (iso <= sevenDays) return '#fbbf24' // due soon
  return 'rgba(255,255,255,0.35)'
}

export default function TaskBlock({ block, color, onChange }: Props) {
  const tasks = block.tasks ?? []
  const inputRef = useRef<HTMLButtonElement>(null)

  function toggleTask(id: string) {
    onChange({
      ...block,
      tasks: tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
    })
  }

  function updateTaskText(id: string, text: string) {
    onChange({
      ...block,
      tasks: tasks.map((t) => (t.id === id ? { ...t, text } : t)),
    })
  }

  function updateTaskField(id: string, field: keyof TaskItem, value: string) {
    onChange({
      ...block,
      tasks: tasks.map((t) => (t.id === id ? { ...t, [field]: value } : t)),
    })
  }

  function addTask() {
    const newTask: TaskItem = {
      id: `t-${Date.now()}`,
      text: '',
      done: false,
    }
    onChange({ ...block, tasks: [...tasks, newTask] })
    setTimeout(() => {
      const inputs = document.querySelectorAll(`[data-task-input="${block.id}"]`)
      const last = inputs[inputs.length - 1] as HTMLInputElement | null
      last?.focus()
    }, 50)
  }

  function deleteTask(id: string) {
    onChange({ ...block, tasks: tasks.filter((t) => t.id !== id) })
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>, task: TaskItem) {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTask()
    } else if (e.key === 'Backspace' && task.text === '') {
      e.preventDefault()
      deleteTask(task.id)
    }
  }

  const done = tasks.filter((t) => t.done).length

  return (
    <div className="space-y-1">
      {tasks.length > 0 && (
        <div className="flex items-center gap-2 mb-2">
          <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${tasks.length > 0 ? (done / tasks.length) * 100 : 0}%`,
                backgroundColor: color,
              }}
            />
          </div>
          <span className="text-white/25 text-[11px]">{done}/{tasks.length}</span>
        </div>
      )}

      {tasks.map((task) => {
        const hasMetadata = !!(task.assignee || task.dueDate)
        return (
          <div key={task.id} className="group/task">
            {/* Main row */}
            <div className="flex items-start gap-2.5 py-0.5">
              <button
                onClick={() => toggleTask(task.id)}
                className="mt-0.5 w-4 h-4 rounded shrink-0 border transition-all flex items-center justify-center"
                style={{
                  borderColor: task.done ? color : '#3a3a3a',
                  backgroundColor: task.done ? `${color}20` : 'transparent',
                }}
              >
                {task.done && (
                  <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
              <input
                data-task-input={block.id}
                value={task.text}
                onChange={(e) => updateTaskText(task.id, e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, task)}
                placeholder="Task…"
                className={[
                  'flex-1 bg-transparent text-sm outline-none placeholder-white/15',
                  'border-b border-transparent focus:border-white/10 transition-colors py-0.5',
                  task.done ? 'text-white/25 line-through' : 'text-white/70',
                ].join(' ')}
              />
              <button
                onClick={() => deleteTask(task.id)}
                className="opacity-0 group-hover/task:opacity-100 transition-opacity mt-0.5 text-white/20 hover:text-white/50"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Metadata sub-row — always visible when data is set, hover-only otherwise */}
            <div
              className={[
                'flex items-center gap-4 pl-6 pb-0.5 transition-opacity',
                hasMetadata ? 'opacity-100' : 'opacity-0 group-hover/task:opacity-100',
              ].join(' ')}
            >
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-white/20">👤</span>
                <input
                  value={task.assignee ?? ''}
                  onChange={(e) => updateTaskField(task.id, 'assignee', e.target.value)}
                  placeholder="Assignee"
                  className="bg-transparent text-[11px] text-white/40 outline-none placeholder-white/15 border-b border-transparent focus:border-white/10 transition-colors w-20"
                />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-white/20">📅</span>
                <input
                  value={task.dueDate ?? ''}
                  onChange={(e) => updateTaskField(task.id, 'dueDate', e.target.value)}
                  placeholder="Due date"
                  className="bg-transparent text-[11px] outline-none placeholder-white/15 border-b border-transparent focus:border-white/10 transition-colors w-24"
                  style={{ color: dueDateColor(task.dueDate, task.done) }}
                />
              </div>
            </div>
          </div>
        )
      })}

      <button
        ref={inputRef}
        onClick={addTask}
        className="flex items-center gap-2 text-white/25 hover:text-white/50 text-xs transition-colors mt-2 py-1"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add task
      </button>
    </div>
  )
}
