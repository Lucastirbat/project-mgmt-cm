import type { Block } from '../../data/schema'

interface Props {
  block: Block
  onChange: (updated: Block) => void
}

export default function SheetsBlock({ block, onChange }: Props) {
  const url = block.sheetsUrl?.trim() ?? ''
  const editUrl = block.sheetsEditUrl?.trim() ?? ''

  return (
    <div className="space-y-3">
      {/* URL inputs */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="text-white/20 text-[10px] w-10 shrink-0">Embed</span>
          <input
            value={url}
            onChange={(e) => onChange({ ...block, sheetsUrl: e.target.value })}
            placeholder="https://docs.google.com/spreadsheets/d/…/pubhtml?…"
            className="flex-1 bg-transparent text-white/40 text-xs font-mono outline-none border-b border-transparent focus:border-white/10 transition-colors placeholder-white/15 py-0.5"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-white/20 text-[10px] w-10 shrink-0">Open</span>
          <input
            value={editUrl}
            onChange={(e) => onChange({ ...block, sheetsEditUrl: e.target.value })}
            placeholder="https://docs.google.com/spreadsheets/d/…/edit"
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Open
            </a>
          )}
        </div>
      </div>

      {/* Hint */}
      {!url && (
        <p className="text-white/20 text-xs">
          In Google Sheets: File → Share → Publish to web → Embed tab → copy the src URL.
        </p>
      )}

      {/* Iframe embed */}
      {url && (
        <div className="rounded-xl overflow-hidden border border-surface-border">
          <iframe
            src={url}
            width="100%"
            height="500"
            className="block w-full"
            style={{ border: 'none' }}
          />
        </div>
      )}
    </div>
  )
}
