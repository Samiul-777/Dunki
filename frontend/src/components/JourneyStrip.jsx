export default function JourneyStrip({ stages }) {
  return (
    <div className="relative rounded-card border border-navy/15 bg-white overflow-hidden">
      <div className="perforated h-2 w-full" />
      <div className="flex flex-col sm:flex-row">
        {stages.map((stage, i) => {
          const isDone = stage.status === 'done'
          const isCurrent = stage.status === 'current'
          return (
            <div
              key={stage.key}
              className={`flex-1 relative px-5 py-6 border-b sm:border-b-0 sm:border-r border-dashed border-navy/15 last:border-none ${
                isCurrent ? 'bg-stamp/10' : ''
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`font-mono text-[11px] tracking-widest ${
                    isDone ? 'text-verified' : isCurrent ? 'text-stamp-dark' : 'text-navy/35'
                  }`}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                {isDone && (
                  <span className="rotate-[-8deg] font-display text-[10px] uppercase tracking-wider border border-verified text-verified px-1.5 py-0.5 rounded-sm">
                    Verified
                  </span>
                )}
              </div>
              <p
                className={`mt-2 font-display text-base ${
                  isCurrent ? 'text-navy' : isDone ? 'text-navy/80' : 'text-navy/40'
                }`}
              >
                {stage.label}
              </p>
              {isCurrent && (
                <p className="mt-1 text-xs text-stamp-dark font-medium">In progress</p>
              )}
            </div>
          )
        })}
      </div>
      <div className="perforated h-2 w-full" />
    </div>
  )
}
