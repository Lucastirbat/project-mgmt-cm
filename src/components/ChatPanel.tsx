import { useState, useRef, useEffect, useCallback } from 'react'
import { useData } from '../context/DataContext'

interface PendingImage {
  dataUrl: string
  mimeType: string
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  images?: PendingImage[]
  actions?: string[]
}

type SSEEvent =
  | { type: 'text'; content: string }
  | { type: 'action'; text: string }
  | { type: 'tool_done'; tool: string }
  | { type: 'error'; message: string }
  | { type: 'done' }

export default function ChatPanel() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([])
  const { refreshData } = useData()
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input when panel opens
  useEffect(() => {
    if (open) {
      setTimeout(() => textareaRef.current?.focus(), 100)
    }
  }, [open])

  // Capture pasted screenshots
  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = Array.from(e.clipboardData.items)
    const imageItems = items.filter((item) => item.type.startsWith('image/'))
    if (imageItems.length === 0) return
    e.preventDefault()
    for (const item of imageItems) {
      const file = item.getAsFile()
      if (!file) continue
      const reader = new FileReader()
      reader.onload = () => {
        setPendingImages((prev) => [
          ...prev,
          { dataUrl: reader.result as string, mimeType: file.type },
        ])
      }
      reader.readAsDataURL(file)
    }
  }, [])

  const sendMessage = useCallback(async () => {
    const text = input.trim()
    const images = [...pendingImages]
    if ((!text && images.length === 0) || streaming) return

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      images: images.length > 0 ? images : undefined,
    }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setPendingImages([])
    setStreaming(true)

    // Build assistant placeholder
    const assistantId = (Date.now() + 1).toString()
    const assistantMsg: Message = { id: assistantId, role: 'assistant', content: '', actions: [] }
    setMessages((prev) => [...prev, assistantMsg])

    // Build conversation history for the API
    const allMsgs = [...messages, userMsg]
    const apiMessages = allMsgs.map((m) => {
      if (m.images && m.images.length > 0) {
        return {
          role: m.role,
          content: [
            ...m.images.map((img) => ({
              type: 'image' as const,
              source: {
                type: 'base64' as const,
                media_type: img.mimeType,
                data: img.dataUrl.split(',')[1], // strip "data:image/png;base64," prefix
              },
            })),
            { type: 'text' as const, text: m.content },
          ],
        }
      }
      return { role: m.role, content: m.content }
    })

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages }),
      })

      if (!res.ok || !res.body) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: `Error: ${res.status} ${res.statusText}` } : m,
          ),
        )
        setStreaming(false)
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let didRefresh = false

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          let event: SSEEvent
          try {
            event = JSON.parse(line.slice(6)) as SSEEvent
          } catch {
            continue
          }

          if (event.type === 'text') {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, content: m.content + event.content } : m,
              ),
            )
          } else if (event.type === 'action') {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, actions: [...(m.actions ?? []), event.text] }
                  : m,
              ),
            )
          } else if (event.type === 'tool_done') {
            if (event.tool === 'update_data' && !didRefresh) {
              didRefresh = true
              refreshData().catch(() => {})
            }
          } else if (event.type === 'error') {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, content: m.content || `Error: ${event.message}` }
                  : m,
              ),
            )
          }
        }
      }
    } catch (e) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: `Error: ${e instanceof Error ? e.message : String(e)}` }
            : m,
        ),
      )
    }

    setStreaming(false)
  }, [input, pendingImages, messages, streaming, refreshData])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const canSend = (input.trim().length > 0 || pendingImages.length > 0) && !streaming

  return (
    <>
      {/* Floating action button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-5 right-5 z-50 w-12 h-12 rounded-full bg-accent shadow-lg flex items-center justify-center hover:brightness-110 transition-all"
        aria-label="Open AI chat"
      >
        {open ? <CloseIcon /> : <ChatIcon />}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-20 inset-x-2 sm:inset-x-auto sm:right-5 sm:left-auto z-50 w-auto sm:w-96 max-h-[70vh] flex flex-col rounded-2xl border border-surface-border bg-surface shadow-2xl overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="px-4 py-3 border-b border-surface-border flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md bg-accent flex items-center justify-center shrink-0">
              <ChatIcon small />
            </div>
            <span className="text-white font-medium text-sm">AI Assistant</span>
            {streaming && (
              <span className="ml-auto text-white/30 text-[10px] animate-pulse">thinking…</span>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-3 space-y-3 min-h-0">
            {messages.length === 0 && (
              <div className="text-white/30 text-sm text-center py-8">
                Ask me to add tasks, update projects, or modify the platform.
                <br />
                <span className="text-[11px] text-white/20">Paste screenshots for context.</span>
              </div>
            )}
            {messages.map((msg) => (
              <MessageBubble key={msg.id} msg={msg} />
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input area */}
          <div className="border-t border-surface-border">
            {/* Pending image thumbnails */}
            {pendingImages.length > 0 && (
              <div className="flex flex-wrap gap-2 px-3 pt-2.5">
                {pendingImages.map((img, i) => (
                  <div key={i} className="relative group/thumb">
                    <img
                      src={img.dataUrl}
                      alt="screenshot"
                      className="w-16 h-16 rounded-lg object-cover border border-surface-border"
                    />
                    <button
                      onClick={() => setPendingImages((prev) => prev.filter((_, j) => j !== i))}
                      className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-surface-card border border-surface-border flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity"
                      aria-label="Remove image"
                    >
                      <svg width={8} height={8} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3} strokeLinecap="round">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="px-3 py-3 flex gap-2 items-end">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                disabled={streaming}
                placeholder={pendingImages.length > 0 ? 'Describe what you need…' : 'Ask me anything… (paste screenshots too)'}
                rows={1}
                className="flex-1 resize-none bg-white/5 border border-surface-border rounded-xl px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-accent/50 disabled:opacity-50 scrollbar-thin"
                style={{ maxHeight: '96px', overflowY: 'auto' }}
              />
              <button
                onClick={sendMessage}
                disabled={!canSend}
                className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center shrink-0 hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <SendIcon />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`}>
      {/* Pasted images (user only) */}
      {isUser && msg.images && msg.images.length > 0 && (
        <div className="flex flex-wrap gap-1 justify-end">
          {msg.images.map((img, i) => (
            <img
              key={i}
              src={img.dataUrl}
              alt="screenshot"
              className="max-w-[220px] max-h-[160px] rounded-xl object-cover border border-surface-border"
            />
          ))}
        </div>
      )}
      {/* Action pills */}
      {!isUser && msg.actions && msg.actions.length > 0 && (
        <div className="flex flex-col gap-1 w-full">
          {msg.actions.map((action, i) => (
            <span
              key={i}
              className="text-[10px] px-2 py-1 rounded-lg bg-white/5 text-white/35 flex items-center gap-1.5"
            >
              <span className="w-1 h-1 rounded-full bg-accent/60 shrink-0" />
              {action}
            </span>
          ))}
        </div>
      )}
      {/* Message bubble */}
      {(msg.content || isUser) && (
        <div
          className={[
            'max-w-[85%] px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap',
            isUser
              ? 'bg-accent/80 text-white rounded-br-sm'
              : 'bg-white/8 text-white/85 rounded-bl-sm',
          ].join(' ')}
        >
          {msg.content || <span className="opacity-40 animate-pulse">…</span>}
        </div>
      )}
    </div>
  )
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function ChatIcon({ small }: { small?: boolean }) {
  const size = small ? 12 : 20
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} strokeLinecap="round">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  )
}

function SendIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" />
    </svg>
  )
}
