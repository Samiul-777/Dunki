import { Link } from 'react-router-dom'

const ledger = [
  {
    row: 'A',
    subject: 'Job listing',
    check: 'Cross-referenced against licensed agency registry',
    result: 'VERIFIED'
  },
  {
    row: 'B',
    subject: 'Contract terms',
    check: 'Locked on submission — no silent revisions permitted',
    result: 'LOCKED'
  },
  {
    row: 'C',
    subject: 'Recruitment fee',
    check: 'Logged with method, date, and receipt reference',
    result: 'RECORDED'
  },
  {
    row: 'D',
    subject: 'Journey stage',
    check: 'Visible to worker and nominee at every step',
    result: 'TRACKED'
  }
]

const roles = [
  { code: '01', name: 'Migrant Worker', use: 'Search jobs, follow your case, keep every receipt.' },
  { code: '02', name: 'Recruiting Agency', use: 'Post circulars, manage applicants under one record.' },
  { code: '03', name: 'Family Nominee', use: "Watch a worker's case without needing their login." }
]

export default function Landing() {
  return (
    <div className="min-h-screen bg-paper text-navy overflow-x-hidden">
      {/* Top bar — case reference strip, not a nav bar */}
      <div className="border-b border-navy/15 px-6 md:px-14 py-3 flex items-center justify-between font-mono text-[11px] tracking-widest text-navy/50">
        <span>DUNKI / CASE REGISTRY</span>
        <span>ESTABLISHED 2026 · DHAKA</span>
      </div>

      <header className="flex items-center justify-between px-6 md:px-14 py-6">
        <p className="font-display text-2xl tracking-tight">Dunki</p>
        <div className="flex items-center gap-6">
          <Link to="/login" className="text-sm font-medium underline underline-offset-4 decoration-navy/30 hover:decoration-navy">
            Sign in
          </Link>
          <Link
            to="/register"
            className="text-sm font-medium border-2 border-navy px-4 py-1.5 hover:bg-navy hover:text-paper transition-colors"
          >
            Open a case
          </Link>
        </div>
      </header>

      {/* HERO — asymmetric split, manifest card as signature element */}
      <section className="relative px-6 md:px-14 pt-6 md:pt-10 pb-20 md:pb-28">
        <div className="grid md:grid-cols-[1.1fr_0.9fr] gap-14 md:gap-10 max-w-6xl mx-auto items-start">
          {/* Left: typewritten case notes */}
          <div className="pt-4 md:pt-16">
            <p className="font-mono text-xs tracking-[0.25em] text-stamp-dark uppercase mb-5">
              Case notes — recruitment file
            </p>
            <h1 className="font-display text-[2.6rem] md:text-6xl leading-[1.05] max-w-lg">
              Nobody should lose their savings to a job that never existed.
            </h1>
            <p className="mt-7 max-w-md text-[15px] leading-relaxed text-navy/70 font-mono">
              Every recruitment case opened on Dunki is logged, stamped, and
              held to one standard: what was promised is what gets checked.
              No verbal contracts. No vanishing agencies. No missing receipts.
            </p>

            <div className="mt-10 flex items-center gap-5">
              <Link
                to="/register"
                className="group relative inline-flex items-center gap-2 bg-navy text-paper pl-5 pr-4 py-3 text-sm font-medium"
                style={{ clipPath: 'polygon(0 0, 100% 0, 92% 50%, 100% 100%, 0 100%)' }}
              >
                Open your case file
                <span className="font-mono text-paper/60 group-hover:translate-x-0.5 transition-transform">→</span>
              </Link>
              <Link to="/login" className="text-sm font-medium underline underline-offset-4 decoration-navy/30 hover:decoration-navy">
                I already have one
              </Link>
            </div>
          </div>

          {/* Right: the manifest card — signature element */}
          <div className="relative md:pt-6">
            <div className="relative bg-white border border-navy/15 rounded-[2px] shadow-[6px_6px_0_0_rgba(11,26,45,0.08)] rotate-[1.5deg] max-w-sm mx-auto md:mx-0 md:ml-auto">
              {/* staple */}
              <div className="absolute -top-2.5 left-8 w-4 h-4 rounded-full bg-navy/70 shadow-sm" />
              <div className="perforated h-2 w-full" />
              <div className="px-6 py-6">
                <div className="flex items-center justify-between font-mono text-[10px] tracking-widest text-navy/40">
                  <span>FORM DNK-04</span>
                  <span>SPECIMEN</span>
                </div>
                <p className="font-display text-xl mt-3">Recruitment Case</p>
                <div className="mt-4 flex flex-col gap-2 font-mono text-xs text-navy/60">
                  <div className="flex justify-between border-b border-dashed border-navy/15 pb-1.5">
                    <span>Tracking ID</span><span className="text-navy">DNK-2026-004821</span>
                  </div>
                  <div className="flex justify-between border-b border-dashed border-navy/15 pb-1.5">
                    <span>Destination</span><span className="text-navy">Riyadh, SA</span>
                  </div>
                  <div className="flex justify-between border-b border-dashed border-navy/15 pb-1.5">
                    <span>Stage</span><span className="text-stamp-dark">Medical — in progress</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Fees logged</span><span className="text-navy">৳56,500</span>
                  </div>
                </div>
              </div>
              <div className="perforated h-2 w-full" />

              {/* overlapping ink stamp */}
              <div className="absolute -bottom-6 -right-5 rotate-[-12deg] border-[3px] border-verified text-verified font-display text-sm px-3 py-1.5 bg-white/90">
                VERIFIED
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* LEDGER — replaces generic feature cards */}
      <section className="border-t border-navy/15 bg-white">
        <div className="max-w-5xl mx-auto px-6 md:px-14 py-16 md:py-20">
          <p className="font-mono text-xs tracking-[0.25em] text-navy/45 uppercase mb-2">Verification ledger</p>
          <h2 className="font-display text-2xl md:text-3xl max-w-lg">What gets checked before you sign anything</h2>

          <div className="mt-10 border-t border-navy/15">
            {ledger.map((l) => (
              <div
                key={l.row}
                className="grid grid-cols-[2rem_1fr_auto] md:grid-cols-[2.5rem_1fr_1.6fr_auto] items-center gap-4 md:gap-6 py-4 border-b border-navy/15"
              >
                <span className="font-mono text-navy/35 text-sm">{l.row}</span>
                <span className="font-display text-navy text-base">{l.subject}</span>
                <span className="hidden md:block text-sm text-navy/60">{l.check}</span>
                <span className="font-mono text-[11px] tracking-wider text-verified justify-self-end border border-verified/40 bg-verified/10 px-2 py-1 rounded-sm">
                  {l.result}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ROLES — filed as tabs, not cards */}
      <section className="px-6 md:px-14 py-16 md:py-20 max-w-5xl mx-auto">
        <p className="font-mono text-xs tracking-[0.25em] text-navy/45 uppercase mb-2">Who this file is for</p>
        <div className="mt-6 grid sm:grid-cols-3 border border-navy/15">
          {roles.map((r, i) => (
            <div
              key={r.code}
              className={`p-6 ${i !== roles.length - 1 ? 'sm:border-r' : ''} border-navy/15 border-t sm:border-t-0 first:border-t-0`}
            >
              <span className="font-mono text-xs text-stamp-dark">{r.code}</span>
              <p className="font-display text-lg mt-2">{r.name}</p>
              <p className="text-sm text-navy/60 mt-1.5">{r.use}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CLOSING — torn ticket CTA, echoes hero button not a generic banner */}
      <section className="border-t border-navy/15 bg-navy text-paper relative overflow-hidden">
        <div className="absolute inset-0 bg-grain opacity-[0.3] pointer-events-none" />
        <div className="relative max-w-3xl mx-auto px-6 py-20 text-center">
          <p className="font-mono text-xs tracking-[0.25em] text-paper/45 uppercase mb-4">Case intake is open</p>
          <h2 className="font-display text-3xl md:text-4xl">Start a file. Keep every record.</h2>
          <Link
            to="/register"
            className="inline-flex items-center gap-2 mt-8 bg-stamp text-navy pl-5 pr-4 py-3 text-sm font-medium hover:bg-stamp-dark hover:text-paper transition-colors"
            style={{ clipPath: 'polygon(0 0, 100% 0, 92% 50%, 100% 100%, 0 100%)' }}
          >
            Open your case file
            <span className="font-mono">→</span>
          </Link>
        </div>
      </section>

      <footer className="text-center text-xs text-navy/40 py-8 font-mono">
        © 2026 DUNKI · CASE REGISTRY · BUILT FOR MIGRANT WORKER PROTECTION
      </footer>
    </div>
  )
}
