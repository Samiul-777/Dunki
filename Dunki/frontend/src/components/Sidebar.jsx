import { NavLink } from 'react-router-dom'

const links = [
  { to: '/dashboard', label: 'Dashboard', icon: '⌂' },
  { to: '/jobs', label: 'Job Search', icon: '⌕' },
  { to: '/documents', label: 'Documents', icon: '▤' },
  { to: '/payments', label: 'Payments', icon: '৳' },
  { to: '/complaints', label: 'Complaints', icon: '!' },
  { to: '/applications', label: 'Applications', icon: '✎' },
]

export default function Sidebar() {
  return (
    <aside className="hidden md:flex md:w-60 shrink-0 flex-col bg-navy text-paper min-h-screen py-8 px-5">
      <div className="mb-10">
        <p className="font-display text-2xl tracking-tight">Dunki</p>
        <p className="text-[11px] uppercase tracking-[0.2em] text-paper/50 mt-0.5">
          Recruitment Registry
        </p>
      </div>
      <nav className="flex flex-col gap-1">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
                isActive ? 'bg-paper/10 text-white' : 'text-paper/70 hover:bg-paper/5 hover:text-white'
              }`
            }
          >
            <span className="font-mono text-stamp-light">{l.icon}</span>
            {l.label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto pt-8 border-t border-paper/10 text-xs text-paper/50">
        <p>Tracking ID</p>
        <p className="font-mono text-paper/80 mt-1">DNK-2026-004821</p>
      </div>
    </aside>
  )
}
