import { useState } from 'react'
import Sidebar from '../components/Sidebar.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import { jobListings } from '../data/stubs.js'

export default function JobSearch() {
  const [query, setQuery] = useState('')
  const [verifiedOnly, setVerifiedOnly] = useState(false)

  const filtered = jobListings.filter((j) => {
    const matchesQuery =
      j.title.toLowerCase().includes(query.toLowerCase()) ||
      j.country.toLowerCase().includes(query.toLowerCase())
    const matchesVerified = verifiedOnly ? j.verified : true
    return matchesQuery && matchesVerified
  })

  return (
    <div className="min-h-screen flex bg-paper">
      <Sidebar />
      <main className="flex-1 px-6 md:px-10 py-8 max-w-6xl">
        <header>
          <h1 className="font-display text-3xl text-navy">Job search</h1>
          <p className="text-sm text-navy/60 mt-1">
            Every listing is cross-checked against licensed agency records.
          </p>
        </header>

        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by role or country..."
            className="flex-1 rounded-card border border-navy/20 bg-white px-4 py-2.5 text-sm outline-none focus:border-stamp"
          />
          <label className="flex items-center gap-2 text-sm text-navy/70 bg-white border border-navy/20 rounded-card px-4 py-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={verifiedOnly}
              onChange={(e) => setVerifiedOnly(e.target.checked)}
              className="accent-stamp"
            />
            Verified only
          </label>
        </div>

        <div className="mt-6 grid sm:grid-cols-2 gap-4">
          {filtered.map((job) => (
            <article
              key={job.id}
              className="bg-white rounded-card border border-navy/10 p-5 flex flex-col gap-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-display text-lg text-navy">{job.title}</p>
                  <p className="text-sm text-navy/60">{job.city}, {job.country}</p>
                </div>
                {job.verified ? (
                  <StatusBadge level="verified">Verified</StatusBadge>
                ) : (
                  <StatusBadge level="alert">Unverified</StatusBadge>
                )}
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="font-mono text-navy/80">{job.salary}</span>
                <span className="text-navy/45 text-xs">Posted {job.postedDaysAgo}d ago</span>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-dashed border-navy/15">
                <p className="text-xs text-navy/50">
                  {job.agency} <span className="font-mono">· {job.id}</span>
                </p>
                <button className="text-sm font-medium text-navy underline underline-offset-2">
                  View &amp; apply
                </button>
              </div>
            </article>
          ))}

          {filtered.length === 0 && (
            <p className="text-sm text-navy/50 col-span-2 py-10 text-center">
              No listings match your search yet.
            </p>
          )}
        </div>
      </main>
    </div>
  )
}
