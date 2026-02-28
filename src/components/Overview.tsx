import { Link } from 'react-router-dom'
import { useData } from '../context/DataContext'
import type { Company, Project } from '../data/schema'

export default function Overview() {
  const { data } = useData()

  return (
    <div className="p-8 max-w-6xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white tracking-tight">Overview</h1>
        <p className="text-white/40 text-sm mt-1">All companies and their current status.</p>
      </div>

      {/* Company cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {data.companies.map((company) => (
          <CompanyCard key={company.id} company={company} />
        ))}
      </div>

      {/* Social media strip */}
      <div className="border border-surface-border rounded-2xl p-5 flex items-center justify-between hover:border-white/20 transition-colors group">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-surface-card border border-surface-border flex items-center justify-center">
            <svg className="w-4 h-4 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
            </svg>
          </div>
          <div>
            <p className="text-white text-sm font-medium">Social Media</p>
            <p className="text-white/40 text-xs">
              {data.socialMedia.managerName} · {data.socialMedia.platforms.length} platforms across {data.companies.length} companies
            </p>
          </div>
        </div>
        <Link
          to="/social-media"
          className="text-white/30 hover:text-white/70 text-sm transition-colors flex items-center gap-1"
        >
          View
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </div>
  )
}

function CompanyCard({ company }: { company: Company }) {
  const activeCount = company.projects.filter((p) => p.status === 'active').length
  const totalCount = company.projects.length

  return (
    <Link
      to={`/${company.id}`}
      className="block border border-surface-border rounded-2xl p-5 hover:border-white/20 transition-all hover:bg-white/[0.02] group"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-lg overflow-hidden"
            style={{ backgroundColor: `${company.color}20`, border: `1px solid ${company.color}30` }}
          >
            {company.logoUrl
              ? <img src={company.logoUrl} alt={company.name} className="w-full h-full object-contain p-1" />
              : company.emoji}
          </div>
          <div>
            <h2 className="text-white font-medium text-sm">{company.name}</h2>
            <p className="text-white/40 text-xs mt-0.5 line-clamp-1">{company.description}</p>
          </div>
        </div>
        <svg
          className="w-4 h-4 text-white/20 group-hover:text-white/50 transition-colors mt-0.5 shrink-0"
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>

      {/* Projects preview */}
      <div className="space-y-1.5">
        {company.projects.slice(0, 3).map((project) => (
          <ProjectRow key={project.id} project={project} color={company.color} />
        ))}
        {company.projects.length > 3 && (
          <p className="text-white/25 text-xs pl-1">
            +{company.projects.length - 3} more
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-surface-border flex items-center gap-1.5">
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: company.color }}
        />
        <span className="text-white/30 text-xs">
          {activeCount} active · {totalCount} total
        </span>
      </div>
    </Link>
  )
}

function ProjectRow({ project, color }: { project: Project; color: string }) {
  const statusColor: Record<string, string> = {
    active: '#10b981',
    paused: '#f59e0b',
    planning: '#6366f1',
    done: '#6b7280',
  }
  const dotColor = statusColor[project.status] ?? '#6b7280'

  return (
    <div className="flex items-center gap-2 px-1">
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: dotColor }} />
      <span className="text-white/60 text-xs truncate">{project.name}</span>
      {project.priority === 'high' && (
        <span
          className="ml-auto text-[9px] px-1.5 py-0.5 rounded-full font-medium shrink-0"
          style={{ backgroundColor: `${color}20`, color }}
        >
          high
        </span>
      )}
    </div>
  )
}
