import type { Block } from '../../data/schema'

interface Props {
  block: Block
  color: string
  onChange: (updated: Block) => void
}

export default function GithubBlock({ block, color, onChange }: Props) {
  const hasRepo = block.repoUrl && block.repoUrl.trim() !== ''

  return (
    <div className="space-y-3">
      {/* Repo URL input */}
      <div className="flex items-center gap-2">
        <svg className="w-4 h-4 text-white/30 shrink-0" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
        </svg>
        <input
          value={block.repoUrl ?? ''}
          onChange={(e) => onChange({ ...block, repoUrl: e.target.value })}
          placeholder="https://github.com/org/repo"
          className="flex-1 bg-transparent text-white/50 text-sm outline-none border-b border-transparent focus:border-white/10 transition-colors placeholder-white/15 py-0.5 font-mono text-xs"
        />
      </div>

      {hasRepo ? (
        <div
          className="rounded-xl p-4 border flex items-center justify-between"
          style={{ borderColor: `${color}30`, backgroundColor: `${color}08` }}
        >
          <div>
            <p className="text-white/80 text-sm font-medium">{block.repoName || block.repoUrl}</p>
            <p className="text-white/30 text-xs mt-0.5">GitHub repository</p>
          </div>
          <div className="flex gap-2">
            {(['commits', 'pulls', 'issues'] as const).map((section) => (
              <a
                key={section}
                href={`${block.repoUrl}/${section === 'commits' ? 'commits' : section === 'pulls' ? 'pulls' : 'issues'}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs px-2.5 py-1.5 rounded-lg border border-white/10 text-white/40 hover:text-white/70 hover:border-white/20 transition-colors capitalize"
              >
                {section}
              </a>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-white/20 text-xs">Enter a GitHub repo URL above to link it.</p>
      )}
    </div>
  )
}
