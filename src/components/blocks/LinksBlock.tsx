import type { Block, LinkItem } from '../../data/schema'

interface Props {
  block: Block
  onChange: (updated: Block) => void
}

export default function LinksBlock({ block, onChange }: Props) {
  const links = block.links ?? []

  function addLink() {
    const newLink: LinkItem = {
      id: `l-${Date.now()}`,
      label: '',
      url: '',
    }
    onChange({ ...block, links: [...links, newLink] })
  }

  function updateLink(id: string, field: 'label' | 'url', value: string) {
    onChange({
      ...block,
      links: links.map((l) => (l.id === id ? { ...l, [field]: value } : l)),
    })
  }

  function deleteLink(id: string) {
    onChange({ ...block, links: links.filter((l) => l.id !== id) })
  }

  return (
    <div className="space-y-2">
      {links.map((link) => (
        <div key={link.id} className="flex items-center gap-2 group/link">
          <svg className="w-3.5 h-3.5 text-white/20 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          <input
            value={link.label}
            onChange={(e) => updateLink(link.id, 'label', e.target.value)}
            placeholder="Label"
            className="w-28 bg-transparent text-white/70 text-sm outline-none border-b border-transparent focus:border-white/10 transition-colors placeholder-white/15 py-0.5 shrink-0"
          />
          <input
            value={link.url}
            onChange={(e) => updateLink(link.id, 'url', e.target.value)}
            placeholder="https://…"
            className="flex-1 bg-transparent text-white/40 text-sm outline-none border-b border-transparent focus:border-white/10 transition-colors placeholder-white/15 py-0.5 font-mono text-xs"
          />
          {link.url && (
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/20 hover:text-white/50 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          )}
          <button
            onClick={() => deleteLink(link.id)}
            className="opacity-0 group-hover/link:opacity-100 transition-opacity text-white/20 hover:text-white/50"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}

      <button
        onClick={addLink}
        className="flex items-center gap-2 text-white/25 hover:text-white/50 text-xs transition-colors mt-1 py-1"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add link
      </button>
    </div>
  )
}
