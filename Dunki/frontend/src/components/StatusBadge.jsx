const styles = {
  verified: 'bg-verified/10 text-verified border-verified/30',
  warning: 'bg-stamp/15 text-stamp-dark border-stamp/40',
  alert: 'bg-alert/10 text-alert border-alert/30',
  info: 'bg-navy/5 text-navy/70 border-navy/20'
}

export default function StatusBadge({ level = 'info', children }) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${styles[level]}`}
    >
      {children}
    </span>
  )
}
