import { useState } from 'react'
import type { Block } from '../../data/schema'

interface Props {
  block: Block
  onChange: (updated: Block) => void
}

export default function SheetsBlock({ block, onChange }: Props) {
  const url = block.sheetsUrl?.trim() ?? ''
  const editUrl = block.sheetsEditUrl?.trim() ?? ''
  const [showUrls, setShowUrls] = useState(!url)

  return (
    <div className="space-y-3">
      {/* When a URL is set: show a slim toolbar instead of raw inputs */}
      {url && (
        <div className="flex items-center gap-2">
          {editUrl && (
            <a
              href={editUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-surface-border text-white/50 hover:text-white text-xs transition-colors"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Open
            </a>
          )}
          <button
            onClick={() => setShowUrls((v) => !v)}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-white/5 text-white/20 hover:text-white/50 text-xs transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            {showUrls ? 'Hide' : 'Edit URLs'}
          </button>
        </div>
      )}

      {/* URL inputs — shown when no URL yet, or when manually expanded */}
      {(!url || showUrls) && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-white/20 text-[10px] w-10 shrink-0">Embed</span>
            <input
              value={url}
              onChange={(e) => onChange({ ...block, sheetsUrl: e.target.value })}
              placeholder="https://docs.google.com/spreadsheets/d/…/pubhtml?… or Drive embeddedfolderview URL"
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
          </div>
          {!url && (
            <p className="text-white/20 text-xs pl-12">
              Sheets: File → Share → Publish to web → Embed tab → copy the src URL.
            </p>
          )}
        </div>
      )}

      {/* Iframe embed — white background so Drive/Sheets content is readable */}
      {url && (
        <div className="rounded-xl overflow-hidden border border-surface-border bg-white">
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
