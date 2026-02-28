import type { Block } from '../../data/schema'

interface Props {
  block: Block
  onChange: (updated: Block) => void
}

export default function CalendarBlock({ block, onChange }: Props) {
  const url = block.calendarUrl?.trim() ?? ''

  // Append dark theme param for Luma embeds
  const embedUrl = url
    ? url.includes('luma.com')
      ? `${url}${url.includes('?') ? '&' : '?'}lt=dark`
      : url
    : ''

  return (
    <div className="space-y-3">
      {/* URL input */}
      <div className="flex items-center gap-2">
        <svg className="w-4 h-4 text-white/25 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <input
          value={url}
          onChange={(e) => onChange({ ...block, calendarUrl: e.target.value })}
          placeholder="https://luma.com/embed/calendar/…"
          className="flex-1 bg-transparent text-white/40 text-xs font-mono outline-none border-b border-transparent focus:border-white/10 transition-colors placeholder-white/15 py-0.5"
        />
      </div>

      {/* Iframe embed */}
      {embedUrl ? (
        <div className="rounded-xl overflow-hidden border border-surface-border">
          <iframe
            src={embedUrl}
            width="100%"
            height="450"
            frameBorder="0"
            allowFullScreen
            aria-hidden={false}
            tabIndex={0}
            className="block w-full"
            style={{ colorScheme: 'dark' }}
          />
        </div>
      ) : (
        <p className="text-white/20 text-xs">Paste a Luma embed URL above to display the calendar.</p>
      )}
    </div>
  )
}
