import type { Block } from '../../data/schema'

interface Props {
  block: Block
  onChange: (updated: Block) => void
}

export default function CanvaBlock({ block, onChange }: Props) {
  const url = block.canvaUrl?.trim() ?? ''

  // Canva embed requires ?embed appended to the view URL
  const embedUrl = url
    ? url.includes('?')
      ? `${url}&embed`
      : `${url}?embed`
    : ''

  // Edit URL: replace /view with /edit (strip any query params first)
  const editUrl = url ? url.replace(/\/view(\?.*)?$/, '/edit') : ''

  return (
    <div className="space-y-3">
      {/* URL input + Edit button */}
      <div className="flex items-center gap-2">
        <svg className="w-4 h-4 text-white/25 shrink-0" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.5 2h-13A2.5 2.5 0 003 4.5v15A2.5 2.5 0 005.5 22h13a2.5 2.5 0 002.5-2.5v-15A2.5 2.5 0 0018.5 2zM8 17H6v-7h2v7zm-1-8a1.25 1.25 0 110-2.5A1.25 1.25 0 017 9zm10 8h-2v-3.5c0-.83-.67-1.5-1.5-1.5S12 12.67 12 13.5V17h-2v-7h2v1.08A3.49 3.49 0 0115.5 10c1.93 0 3.5 1.57 3.5 3.5V17z" />
        </svg>
        <input
          value={url}
          onChange={(e) => onChange({ ...block, canvaUrl: e.target.value })}
          placeholder="https://www.canva.com/design/…/view"
          className="flex-1 bg-transparent text-white/40 text-xs font-mono outline-none border-b border-transparent focus:border-white/10 transition-colors placeholder-white/15 py-0.5"
        />
        {editUrl && (
          <a
            href={editUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-surface-border text-white/50 hover:text-white text-xs transition-colors shrink-0"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit
          </a>
        )}
      </div>

      {/* Iframe embed */}
      {embedUrl ? (
        <div className="rounded-xl overflow-hidden border border-surface-border">
          <iframe
            src={embedUrl}
            width="100%"
            height="480"
            allowFullScreen
            className="block w-full"
            style={{ border: 'none' }}
          />
        </div>
      ) : (
        <p className="text-white/20 text-xs">Paste a Canva design URL above to embed it.</p>
      )}
    </div>
  )
}
