/**
 * POST /api/chat — AI agent endpoint
 *
 * Accepts { messages, history } and streams SSE events:
 *   text       { content: string }
 *   action     { text: string }
 *   tool_done  { tool: string }
 *   error      { message: string }
 *   done       {}
 *
 * Auth enforced by _middleware.ts.
 * Env vars: ANTHROPIC_API_KEY, GITHUB_TOKEN, GITHUB_REPO, PM_DATA (KV)
 */

interface Env {
  PM_DATA: KVNamespace
  ANTHROPIC_API_KEY: string
  GITHUB_TOKEN: string
  GITHUB_REPO: string
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface RequestBody {
  messages: ChatMessage[]
}

const KV_KEY = 'app_data'
const MODEL = 'claude-opus-4-6'
const MAX_TURNS = 10

// ─── Schema string provided to the agent as context ──────────────────────────

const SCHEMA = `
type BlockType = 'tasks' | 'links' | 'notes' | 'kpi' | 'github' | 'calendar' | 'canva' | 'sheets'

interface TaskItem { id: string; text: string; done: boolean }
interface LinkItem { id: string; label: string; url: string }
interface KpiItem  { id: string; label: string; value: string; trend?: 'up'|'down'|'flat' }

interface Block {
  id: string; type: BlockType; title: string
  tasks?: TaskItem[]; links?: LinkItem[]; notes?: string; kpis?: KpiItem[]
  repoUrl?: string; repoName?: string
  calendarUrl?: string
  canvaUrl?: string; canvaEditUrl?: string
  sheetsUrl?: string; sheetsEditUrl?: string
}

type ProjectStatus   = 'active' | 'paused' | 'planning' | 'done'
type ProjectPriority = 'high' | 'medium' | 'low'

interface Project {
  id: string; name: string; status: ProjectStatus; priority: ProjectPriority
  description: string; blocks: Block[]; updatedAt: string
}

interface Company {
  id: string; name: string; description: string
  color: string; emoji: string; logoUrl?: string; projects: Project[]
}

interface SocialPlatform { id: string; companyId: string; platform: string; handle: string; status: string }
interface SocialMediaData { managerName: string; notionUrl: string; platforms: SocialPlatform[] }
interface AppData { companies: Company[]; socialMedia: SocialMediaData }
`.trim()

// ─── Tool definitions ─────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: 'read_data',
    description: 'Read the current app data (companies, projects, blocks) from the database.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'update_data',
    description:
      'Write the full updated app data back to the database. Always call read_data first, modify the returned JSON, then call update_data with the complete modified JSON.',
    input_schema: {
      type: 'object',
      properties: {
        data: {
          type: 'string',
          description: 'The complete AppData JSON string to save.',
        },
      },
      required: ['data'],
    },
  },
  {
    name: 'get_schema',
    description: 'Get the TypeScript type definitions for the data model.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'read_file',
    description: 'Read a source file from the GitHub repository.',
    input_schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'File path relative to the repo root, e.g. "src/components/Layout.tsx"',
        },
      },
      required: ['path'],
    },
  },
  {
    name: 'write_file',
    description:
      'Write (create or update) a source file in the GitHub repository. This creates a git commit and triggers a Cloudflare Pages redeploy (~1-2 min). Always read_file first to understand existing content.',
    input_schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'File path relative to repo root, e.g. "src/components/Layout.tsx"',
        },
        content: {
          type: 'string',
          description: 'The complete new file content.',
        },
        message: {
          type: 'string',
          description: 'Git commit message.',
        },
      },
      required: ['path', 'content', 'message'],
    },
  },
]

// ─── Tool implementations ─────────────────────────────────────────────────────

async function toolReadData(env: Env): Promise<string> {
  if (!env.PM_DATA) return JSON.stringify({ error: 'KV not configured' })
  const value = await env.PM_DATA.get(KV_KEY)
  return value ?? '{}'
}

async function toolUpdateData(env: Env, dataStr: string): Promise<string> {
  if (!env.PM_DATA) return JSON.stringify({ error: 'KV not configured' })
  try {
    JSON.parse(dataStr) // validate
  } catch {
    return JSON.stringify({ error: 'Invalid JSON provided to update_data' })
  }
  await env.PM_DATA.put(KV_KEY, dataStr)
  return JSON.stringify({ success: true })
}

async function toolReadFile(env: Env, path: string): Promise<string> {
  if (!env.GITHUB_TOKEN || !env.GITHUB_REPO) {
    return JSON.stringify({ error: 'GITHUB_TOKEN or GITHUB_REPO not configured' })
  }
  const url = `https://api.github.com/repos/${env.GITHUB_REPO}/contents/${path}`
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'CM-Projects-Agent/1.0',
    },
  })
  if (!res.ok) {
    const err = await res.text()
    return JSON.stringify({ error: `GitHub API error ${res.status}: ${err}` })
  }
  const json = (await res.json()) as { content?: string; encoding?: string }
  if (!json.content || json.encoding !== 'base64') {
    return JSON.stringify({ error: 'Unexpected response format from GitHub' })
  }
  // Decode base64 (CF Workers have atob)
  const decoded = atob(json.content.replace(/\n/g, ''))
  return decoded
}

async function toolWriteFile(
  env: Env,
  path: string,
  content: string,
  message: string,
): Promise<string> {
  if (!env.GITHUB_TOKEN || !env.GITHUB_REPO) {
    return JSON.stringify({ error: 'GITHUB_TOKEN or GITHUB_REPO not configured' })
  }
  const url = `https://api.github.com/repos/${env.GITHUB_REPO}/contents/${path}`
  const headers = {
    Authorization: `Bearer ${env.GITHUB_TOKEN}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'CM-Projects-Agent/1.0',
    'Content-Type': 'application/json',
  }

  // Get current SHA (required for update)
  let sha: string | undefined
  const getRes = await fetch(url, { headers })
  if (getRes.ok) {
    const existing = (await getRes.json()) as { sha?: string }
    sha = existing.sha
  }

  const encoded = btoa(unescape(encodeURIComponent(content)))
  const body: Record<string, string> = { message, content: encoded, branch: 'main' }
  if (sha) body.sha = sha

  const putRes = await fetch(url, { method: 'PUT', headers, body: JSON.stringify(body) })
  if (!putRes.ok) {
    const err = await putRes.text()
    return JSON.stringify({ error: `GitHub write error ${putRes.status}: ${err}` })
  }
  return JSON.stringify({ success: true, path, committed: true })
}

// ─── SSE helpers ──────────────────────────────────────────────────────────────

function sseEvent(writer: WritableStreamDefaultWriter<Uint8Array>, payload: object) {
  const line = `data: ${JSON.stringify(payload)}\n\n`
  writer.write(new TextEncoder().encode(line))
}

// ─── Agent loop ───────────────────────────────────────────────────────────────

async function runAgentLoop(
  env: Env,
  messages: ChatMessage[],
  writer: WritableStreamDefaultWriter<Uint8Array>,
) {
  // Build system prompt with current data summary
  let dataSummary = ''
  try {
    const raw = await toolReadData(env)
    const parsed = JSON.parse(raw) as { companies?: { name: string; projects: { name: string }[] }[] }
    if (parsed.companies) {
      dataSummary = parsed.companies
        .map((c) => `- ${c.name} (${c.projects.map((p) => p.name).join(', ')})`)
        .join('\n')
    }
  } catch {
    dataSummary = '(could not load)'
  }

  const systemPrompt = `You are an AI assistant for a multi-company project management platform called "CM Projects". You help the user manage their projects and data by reading and updating the platform's data, and optionally modifying source code files.

## Platform
- 4 companies: ReaktorX (VC fund), Creative Motion (studio), European Startup Embassy (community hub), Jacquebox (startup)
- Each company has projects; each project has blocks (tasks, links, notes, kpi, github, calendar, canva, sheets)
- Data is stored in Cloudflare KV; source code is in GitHub and auto-deploys to Cloudflare Pages

## Current Data Summary
${dataSummary}

## Data Schema
\`\`\`typescript
${SCHEMA}
\`\`\`

## Guidelines
- Always call read_data before modifying anything — work with the latest state
- Generate unique IDs using a short random string like 'id-' + Math.random().toString(36).slice(2,8) patterns (just pick a plausible unique string like 'b-xyz123')
- When updating data: read → modify in memory → write the complete updated JSON
- For code changes: read_file first, make minimal targeted changes, write_file with a clear commit message
- Code changes trigger a ~1-2 minute Cloudflare Pages redeploy — tell the user
- Be concise. After completing a task, briefly confirm what was done.
- If something is unclear, ask before acting.`

  // Convert chat history to Anthropic format
  type AnthropicMessage = {
    role: 'user' | 'assistant'
    content: string | AnthropicContent[]
  }
  type AnthropicContent =
    | { type: 'text'; text: string }
    | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
    | { type: 'tool_result'; tool_use_id: string; content: string }

  const anthropicMessages: AnthropicMessage[] = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }))

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4096,
        system: systemPrompt,
        tools: TOOLS,
        messages: anthropicMessages,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      sseEvent(writer, { type: 'error', message: `Anthropic API error ${res.status}: ${err}` })
      break
    }

    type AnthropicResponse = {
      stop_reason: string
      content: Array<
        | { type: 'text'; text: string }
        | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
      >
    }
    const data = (await res.json()) as AnthropicResponse

    // Stream text blocks
    for (const block of data.content) {
      if (block.type === 'text' && block.text.trim()) {
        sseEvent(writer, { type: 'text', content: block.text })
      }
    }

    // If no tool calls, we're done
    if (data.stop_reason === 'end_turn') break

    // Process tool calls
    const toolUseBlocks = data.content.filter((b) => b.type === 'tool_use') as Array<{
      type: 'tool_use'
      id: string
      name: string
      input: Record<string, unknown>
    }>

    if (toolUseBlocks.length === 0) break

    // Add assistant message to history
    anthropicMessages.push({ role: 'assistant', content: data.content as AnthropicContent[] })

    // Execute tools and collect results
    const toolResults: AnthropicContent[] = []

    for (const tool of toolUseBlocks) {
      let actionText = `Using ${tool.name}…`
      if (tool.name === 'read_data') actionText = 'Reading platform data…'
      else if (tool.name === 'update_data') actionText = 'Saving changes to database…'
      else if (tool.name === 'get_schema') actionText = 'Loading schema…'
      else if (tool.name === 'read_file') actionText = `Reading file: ${tool.input.path}`
      else if (tool.name === 'write_file') actionText = `Writing file: ${tool.input.path}`

      sseEvent(writer, { type: 'action', text: actionText })

      let result = ''
      try {
        if (tool.name === 'read_data') {
          result = await toolReadData(env)
        } else if (tool.name === 'update_data') {
          result = await toolUpdateData(env, tool.input.data as string)
        } else if (tool.name === 'get_schema') {
          result = SCHEMA
        } else if (tool.name === 'read_file') {
          result = await toolReadFile(env, tool.input.path as string)
        } else if (tool.name === 'write_file') {
          result = await toolWriteFile(
            env,
            tool.input.path as string,
            tool.input.content as string,
            tool.input.message as string,
          )
        } else {
          result = JSON.stringify({ error: `Unknown tool: ${tool.name}` })
        }
      } catch (e) {
        result = JSON.stringify({ error: String(e) })
      }

      sseEvent(writer, { type: 'tool_done', tool: tool.name })

      toolResults.push({
        type: 'tool_result',
        tool_use_id: tool.id,
        content: result,
      })
    }

    // Add tool results to history
    anthropicMessages.push({ role: 'user', content: toolResults })
  }

  sseEvent(writer, { type: 'done' })
  await writer.close()
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export const onRequestPost: PagesFunction<Env> = async (context) => {
  if (!context.env.ANTHROPIC_API_KEY) {
    return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let body: RequestBody
  try {
    body = (await context.request.json()) as RequestBody
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!body.messages || !Array.isArray(body.messages)) {
    return new Response(JSON.stringify({ error: 'messages array required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>()
  const writer = writable.getWriter()

  // Keep the CF isolate alive while we stream
  context.waitUntil(runAgentLoop(context.env, body.messages, writer))

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
