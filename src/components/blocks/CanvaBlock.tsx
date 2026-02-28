import type { Block } from '../../data/schema'

interface Props {
  block: Block
  onChange: (updated: Block) => void
}

export default function CanvaBlock({ block, onChange }: Props) {
  const url = block.canvaUrl?.trim() ?? ''
  const editUrl = block.canvaEditUrl?.trim() ?? ''

  // Canva embed requires ?embed appended to the view URL
  const embedUrl = url
    ? url.includes('?')
      ? `${url}&embed`
      : `${url}?embed`
    : ''

  return (
    <div className="space-y-3">
      {/* URL inputs */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="text-white/20 text-[10px] w-10 shrink-0">View</span>
          <input
            value={url}
            onChange={(e) => onChange({ ...block, canvaUrl: e.target.value })}
            placeholder="https://www.canva.com/design/…/view"
            className="flex-1 bg-transparent text-white/40 text-xs font-mono outline-none border-b border-transparent focus:border-white/10 transition-colors placeholder-white/15 py-0.5"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-white/20 text-[10px] w-10 shrink-0">Edit</span>
          <input
            value={editUrl}
            onChange={(e) => onChange({ ...block, canvaEditUrl: e.target.value })}
            placeholder="https://www.canva.com/design/…/edit"
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
        <p className="text-white/20 text-xs">Paste a Canva view URL above to embed it.</p>
      )}
    </div>
  )
}
