import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { fetchMe } from '../lib/api.js'

const links = [
  { to: '/dashboard', label: 'Dashboard', icon: '⌂' },
  { to: '/jobs', label: 'Job Search', icon: '⌕' },
  { to: '/applications', label: 'Applications', icon: '✎' },
  { to: '/contracts', label: 'Contracts', icon: '§' },
  { to: '/documents', label: 'Documents', icon: '▤' },
  { to: '/payments', label: 'Payments', icon: '৳' },
  { to: '/complaints', label: 'Complaints', icon: '!' },
  { to: '/profile', label: 'Profile', icon: '◉' },
]

export default function Sidebar({ user: propUser }) {
  const [currentUser, setCurrentUser] = useState(propUser || null)

  useEffect(() => {
    if (propUser) {
      setCurrentUser(propUser)
      return
    }

    let cancelled = false
    fetchMe()
      .then((u) => {
        if (!cancelled && u) setCurrentUser(u)
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [propUser])

  const trackingId = currentUser?.tracking_id || 'ID Pending'
  const roleName = currentUser?.role ? currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1) : 'Registry'
  const visibleLinks = currentUser?.role === 'admin'
    ? [...links, { to: '/insights', label: 'Insights', icon: '▥' }]
    : links

  return (
    <aside className="hidden md:flex md:w-64 shrink-0 flex-col bg-navy text-paper min-h-screen py-8 px-5 border-r border-navy/20">
      <div className="mb-8">
        <NavLink to="/dashboard" className="block">
          <p className="font-display text-2xl tracking-tight text-white flex items-center gap-2">
            Dunki
            <span className="text-[10px] font-mono uppercase bg-stamp/20 text-stamp-light px-1.5 py-0.5 rounded border border-stamp/30">
              Registry
            </span>
          </p>
          <p className="text-[11px] uppercase tracking-[0.2em] text-paper/50 mt-1 font-mono">
            Migrant Worker Protection
          </p>
        </NavLink>
      </div>

      <nav className="flex flex-col gap-1.5">
        {visibleLinks.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-card text-sm font-medium transition-all ${
                isActive
                  ? 'bg-paper/15 text-white shadow-sm border border-paper/10'
                  : 'text-paper/70 hover:bg-paper/8 hover:text-white'
              }`
            }
          >
            <span className="font-mono text-stamp-light w-4 text-center">{l.icon}</span>
            {l.label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto pt-6 border-t border-paper/10 text-xs">
        <div className="flex items-center justify-between text-paper/50 mb-1">
          <span>Tracking ID</span>
          <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-paper/10 text-paper/70">
            {roleName}
          </span>
        </div>
        <p className="font-mono text-paper/90 font-medium tracking-wide text-xs bg-black/25 px-2.5 py-1.5 rounded border border-paper/10">
          {trackingId}
        </p>
        {currentUser?.name && (
          <p className="text-[11px] text-paper/50 mt-2 truncate">
            {currentUser.name}
          </p>
        )}
      </div>
    </aside>
  )
}
