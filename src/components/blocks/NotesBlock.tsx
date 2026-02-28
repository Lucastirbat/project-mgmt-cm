import type { Block } from '../../data/schema'

interface Props {
  block: Block
  onChange: (updated: Block) => void
}

export default function NotesBlock({ block, onChange }: Props) {
  return (
    <textarea
      value={block.notes ?? ''}
      onChange={(e) => onChange({ ...block, notes: e.target.value })}
      placeholder="Write notes here…"
      rows={4}
      className="w-full bg-transparent text-white/60 text-sm outline-none resize-none placeholder-white/15 leading-relaxed border border-transparent focus:border-white/8 rounded-lg p-2 -m-2 transition-colors"
    />
  )
}
