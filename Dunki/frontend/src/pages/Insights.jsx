import { useEffect, useState } from 'react'
import Sidebar from '../components/Sidebar.jsx'
import { fetchInsights } from '../lib/api.js'

const views = [
  { key: 'overview', label: 'Overview' },
  { key: 'applications', label: 'Applications' },
  { key: 'jobs', label: 'Jobs & destinations' },
  { key: 'agencies', label: 'Agencies' },
  { key: 'transactions', label: 'Transactions' },
]

export default function Insights() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [view, setView] = useState('overview')
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    fetchInsights()
      .then((result) => { if (active) setData(result) })
      .catch((requestError) => {
        if (active) setError(requestError.response?.status === 403
          ? 'Insights are available to administrators only.'
          : 'Could not load insights. Check your connection and try again.')
      })
      .finally(() => { if (active) setLoading(false) })

    return () => { active = false }
  }, [refreshKey])

  const rows = (key) => Array.isArray(data?.[key]) ? data[key] : []
  const filterRows = (items) => {
    const term = search.trim().toLowerCase()
    if (!term) return items
    return items.filter((row) => Object.values(row).some((value) => String(value ?? '').toLowerCase().includes(term)))
  }

  const applications = rows('applications_with_details')
  const jobs = rows('jobs_with_application_count')
  const agencies = rows('agencies_and_their_jobs')
  const countries = rows('jobs_per_country')
  const transactions = rows('transactions')
  const methodStatus = data?.database_method_status
  const databaseMethods = [
    { label: 'View', status: methodStatus?.view },
    { label: 'Stored procedure', status: methodStatus?.procedure },
    { label: 'Trigger', status: methodStatus?.trigger },
    { label: 'Transaction', status: methodStatus?.transaction },
  ]
  const distinctAgencies = new Set(agencies.map((row) => row.agency_name).filter(Boolean)).size
  const metrics = [
    { label: 'Applications', value: applications.length, detail: 'All submitted applications', color: 'border-stamp' },
    { label: 'Job listings', value: jobs.length, detail: 'Including listings with no applicants', color: 'border-verified' },
    { label: 'Recruiting agencies', value: distinctAgencies, detail: 'Represented in the registry', color: 'border-alert' },
    { label: 'Destinations', value: countries.length, detail: 'Countries with posted jobs', color: 'border-navy' },
  ]

  if (loading && !data) return <div className="min-h-screen flex bg-paper"><Sidebar /><main className="flex-1 p-8 text-sm text-navy/55">Loading insights…</main></div>

  return (
    <div className="min-h-screen flex bg-paper">
      <Sidebar />
      <main className="flex-1 min-w-0 px-5 md:px-10 py-7 md:py-9 max-w-7xl">
        <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 border-b border-navy/15 pb-6">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-stamp font-semibold">Registry intelligence</p>
            <h1 className="font-display text-3xl text-navy mt-1">Insights</h1>
            <p className="text-sm text-navy/60 mt-1">Live view of applications, job listings, agencies, and destinations.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2.5">
            <label className="sr-only" htmlFor="insights-search">Filter insights</label>
            <input
              id="insights-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Filter names, jobs, countries…"
              className="min-w-0 sm:w-64 bg-white border border-navy/20 px-3.5 py-2.5 text-sm text-navy placeholder:text-navy/40 focus:outline-none focus:border-stamp"
            />
            <button
              type="button"
              onClick={() => setRefreshKey((key) => key + 1)}
              disabled={loading}
              className="border border-navy bg-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy/90 disabled:opacity-60"
            >
              {loading ? 'Refreshing…' : 'Refresh data'}
            </button>
          </div>
        </header>

        {error && (
          <div role="alert" className="mt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-l-4 border-alert bg-alert/10 px-4 py-3 text-sm text-navy">
            <p>{error}</p>
            {error.includes('administrators') ? null : (
              <button type="button" onClick={() => setRefreshKey((key) => key + 1)} className="font-semibold underline underline-offset-2">Retry</button>
            )}
          </div>
        )}

        {data && (
          <>
            <div className="mt-6 grid grid-cols-2 xl:grid-cols-4 border-y border-navy/15 bg-white">
              {metrics.map((metric) => (
                <div key={metric.label} className={`min-w-0 border-l-2 ${metric.color} px-4 py-4 md:px-5`}>
                  <p className="text-[11px] uppercase tracking-wide text-navy/55">{metric.label}</p>
                  <p className="font-display text-3xl text-navy mt-1">{metric.value.toLocaleString()}</p>
                  <p className="text-xs text-navy/50 mt-1">{metric.detail}</p>
                </div>
              ))}
            </div>

            <section className="mt-7 border-y border-navy/15 py-4" aria-labelledby="database-methods-title">
              <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2">
                <h2 id="database-methods-title" className="font-display text-xl text-navy">Database methods</h2>
                <p className="font-mono text-xs uppercase text-navy/55">Driver: {methodStatus?.driver ?? 'unknown'}</p>
              </div>
              <dl className="mt-4 grid grid-cols-2 xl:grid-cols-4 gap-y-4">
                {databaseMethods.map(({ label, status }) => (
                  <div key={label} className="border-l-2 border-navy/15 pl-3">
                    <dt className="text-xs text-navy/55">{label}</dt>
                    <dd className={`mt-1 text-sm font-semibold ${status?.active ? 'text-verified' : 'text-alert'}`}>
                      {status?.active ? 'Active' : 'Not active'}
                    </dd>
                    {status?.name && <dd className="mt-1 break-all font-mono text-[11px] text-navy/50">{status.name}</dd>}
                  </div>
                ))}
              </dl>
            </section>

            <nav aria-label="Insight views" className="mt-7 flex overflow-x-auto border-b border-navy/15">
              {views.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  aria-pressed={view === item.key}
                  onClick={() => setView(item.key)}
                  className={`shrink-0 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${view === item.key ? 'border-stamp text-navy' : 'border-transparent text-navy/55 hover:text-navy'}`}
                >
                  {item.label}
                </button>
              ))}
            </nav>

            {view === 'overview' && (
              <div className="grid lg:grid-cols-2 gap-x-8 gap-y-9 mt-7">
                <BarList title="Applications by status" rows={filterRows(rows('application_status_breakdown'))} labelKey="status" valueKey="total" />
                <BarList title="Openings by destination" rows={filterRows(countries)} labelKey="country" valueKey="total_jobs" />
                <div className="lg:col-span-2">
                  <DataTable
                    title="Applicants above the average"
                    description="Workers whose application count is higher than the registry average."
                    rows={filterRows(rows('above_average_applicants'))}
                    columns={[{ key: 'name', label: 'Applicant' }, { key: 'application_count', label: 'Applications' }]}
                    emptyMessage="No applicants are currently above the average."
                  />
                </div>
              </div>
            )}

            {view === 'applications' && (
              <div className="mt-7 space-y-8">
                <DataTable title="Applications" description="Applicant and job details for submitted applications." rows={filterRows(applications)} columns={[
                  { key: 'applicant_name', label: 'Applicant' }, { key: 'job_title', label: 'Job listing' }, { key: 'status', label: 'Status' }, { key: 'id', label: 'Reference' },
                ]} />
                <DataTable title="Status change history" description="Rows written by the application status trigger." rows={filterRows(rows('application_status_history'))} columns={[
                  { key: 'application_id', label: 'Application' }, { key: 'old_status', label: 'Previous status' }, { key: 'new_status', label: 'New status' }, { key: 'changed_at', label: 'Changed at' },
                ]} emptyMessage="No status changes have been recorded." />
                <BarList title="Status distribution" rows={filterRows(rows('application_status_breakdown'))} labelKey="status" valueKey="total" />
              </div>
            )}

            {view === 'jobs' && (
              <div className="mt-7 space-y-8">
                <DataTable title="Destination summary" description="Job and application totals returned by the stored procedure." rows={filterRows(rows('destination_summary'))} columns={[
                  { key: 'destination', label: 'Destination' }, { key: 'job_count', label: 'Jobs' }, { key: 'application_count', label: 'Applications' }, { key: 'verified_job_count', label: 'Verified jobs' },
                ]} />
                <BarList title="Openings by destination" rows={filterRows(countries)} labelKey="country" valueKey="total_jobs" />
                <DataTable title="Job listings" description="Application counts include listings with no applicants." rows={filterRows(jobs)} columns={[
                  { key: 'title', label: 'Job listing' }, { key: 'application_count', label: 'Applications' }, { key: 'id', label: 'Listing ID' },
                ]} />
              </div>
            )}

            {view === 'agencies' && (
              <DataTable title="Agencies and their listings" description="Agencies remain visible even when they have not posted a job." rows={filterRows(agencies)} columns={[
                { key: 'agency_name', label: 'Agency' }, { key: 'job_title', label: 'Job listing' },
              ]} emptyMessage="No agency records are available." />
            )}

            {view === 'transactions' && (
              <DataTable title="Verified payments" description="Successful SSLCommerz payments between relevant workers and agencies." rows={filterRows(transactions)} columns={[
                { key: 'direction', label: 'Direction' }, { key: 'payer_name', label: 'Paid by' }, { key: 'recipient_name', label: 'Paid to' }, { key: 'purpose', label: 'Purpose' }, { key: 'payment_date', label: 'Date' }, { key: 'bank_tran_id', label: 'Bank reference' }, { key: 'amount', label: 'Amount' },
              ]} emptyMessage="No verified agency payments have been recorded." />
            )}
          </>
        )}
      </main>
    </div>
  )
}

function BarList({ title, rows, labelKey, valueKey }) {
  const maximum = Math.max(1, ...rows.map((row) => Number(row[valueKey]) || 0))

  return (
    <section>
      <h2 className="font-display text-xl text-navy">{title}</h2>
      {rows.length === 0 ? <p className="mt-4 text-sm text-navy/50">No matching records.</p> : (
        <div className="mt-4 space-y-3">
          {rows.map((row, index) => {
            const value = Number(row[valueKey]) || 0
            return (
              <div key={`${row[labelKey] || 'unknown'}-${index}`}>
                <div className="flex justify-between gap-3 text-sm mb-1">
                  <span className="truncate text-navy">{row[labelKey] || 'Unspecified'}</span>
                  <span className="shrink-0 font-mono text-navy/65">{value.toLocaleString()}</span>
                </div>
                <div className="h-2 bg-navy/8" role="img" aria-label={`${row[labelKey] || 'Unspecified'}: ${value}`}>
                  <div className="h-full bg-stamp" style={{ width: `${Math.max(value ? 3 : 0, (value / maximum) * 100)}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

function DataTable({ title, description, rows, columns, emptyMessage = 'No records match this filter.' }) {
  return (
    <section>
      <div className="border-b border-navy/15 pb-3">
        <h2 className="font-display text-xl text-navy">{title}</h2>
        {description && <p className="text-sm text-navy/55 mt-1">{description}</p>}
      </div>
      {rows.length === 0 ? <p className="py-6 text-sm text-navy/50">{emptyMessage}</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-navy/10 text-[11px] uppercase tracking-wide text-navy/50">
                {columns.map((column) => <th key={column.key} scope="col" className="py-3 pr-5 font-semibold">{column.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.id ?? `${row.name ?? row.agency_name ?? 'row'}-${index}`} className="border-b border-navy/8 last:border-0">
                  {columns.map((column) => <td key={column.key} className="max-w-sm py-3 pr-5 text-navy/80">{row[column.key] ?? '—'}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}