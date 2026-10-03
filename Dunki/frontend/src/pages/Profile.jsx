import { useEffect, useState } from 'react'
import Sidebar from '../components/Sidebar.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import { changePassword, fetchMe, fetchMyDestination, fetchMyTransactions, updateMyDestination } from '../lib/api.js'

const destinationSuggestions = ['Saudi Arabia', 'Malaysia', 'Qatar', 'UAE', 'Kuwait', 'Oman', 'Singapore']

const profileFields = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email address' },
  { key: 'phone', label: 'Phone number' },
  { key: 'role', label: 'Account type', format: (value) => value ? value[0].toUpperCase() + value.slice(1) : '' },
  { key: 'tracking_id', label: 'Tracking ID' },
  { key: 'destination', label: 'Destination' },
  { key: 'verification_status', label: 'Verification status', format: (value) => value ? value[0].toUpperCase() + value.slice(1) : '' },
]

export default function Profile() {
  const [user, setUser] = useState(null)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [transactions, setTransactions] = useState([])
  const [currencyTotals, setCurrencyTotals] = useState([])
  const [loadingTransactions, setLoadingTransactions] = useState(true)
  const [transactionsError, setTransactionsError] = useState('')
  const [profileError, setProfileError] = useState('')
  const [destinationContext, setDestinationContext] = useState(null)
  const [destinationValue, setDestinationValue] = useState('')
  const [savingDestination, setSavingDestination] = useState(false)
  const [destinationMessage, setDestinationMessage] = useState('')
  const [destinationError, setDestinationError] = useState('')
  const [passwords, setPasswords] = useState({ current_password: '', new_password: '', new_password_confirmation: '' })
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState('')
  const [passwordError, setPasswordError] = useState('')

  useEffect(() => {
    let active = true
    Promise.all([fetchMe(), fetchMyDestination()])
      .then(([profile, destination]) => {
        if (active) {
          setUser({ ...profile, destination: destination.effective_destination })
          setDestinationContext(destination)
          setDestinationValue(destination.profile_destination || '')
        }
        fetchMyTransactions()
          .then((history) => {
            if (active) {
              setTransactions(history.transactions || [])
              setCurrencyTotals(history.totals_by_currency || [])
            }
          })
          .catch(() => { if (active) setTransactionsError('Could not load your transactions.') })
          .finally(() => { if (active) setLoadingTransactions(false) })
      })
      .catch(() => { if (active) setProfileError('Could not load your profile. Please refresh and try again.') })
      .finally(() => { if (active) setLoadingProfile(false) })

    return () => { active = false }
  }, [])

  const saveDestination = async (destination) => {
    setDestinationMessage('')
    setDestinationError('')
    setSavingDestination(true)

    try {
      const result = await updateMyDestination(destination?.trim() || null)
      setDestinationContext(result)
      setDestinationValue(result.profile_destination || '')
      setUser((currentUser) => ({ ...currentUser, destination: result.effective_destination }))
      setDestinationMessage('Destination preference saved.')
    } catch (error) {
      const messages = error.response?.data?.errors
      setDestinationError(messages ? Object.values(messages).flat().join(' ') : 'Could not update your destination. Please try again.')
    } finally {
      setSavingDestination(false)
    }
  }

  const handleDestinationSave = (event) => {
    event.preventDefault()
    return saveDestination(destinationValue)
  }

  const handleUseAutomatic = () => {
    setDestinationValue('')
    return saveDestination(null)
  }

  const destinationSource = {
    profile: 'Your saved profile choice',
    contract: 'Your latest contract',
    application: 'Your latest job application',
  }[destinationContext?.source] || 'No destination selected'

  const handlePasswordChange = async (event) => {
    event.preventDefault()
    setPasswordMessage('')
    setPasswordError('')

    if (passwords.new_password !== passwords.new_password_confirmation) {
      setPasswordError('The new passwords do not match.')
      return
    }

    setSavingPassword(true)
    try {
      const result = await changePassword(passwords)
      setPasswordMessage(result.message || 'Password updated successfully.')
      setPasswords({ current_password: '', new_password: '', new_password_confirmation: '' })
    } catch (error) {
      const messages = error.response?.data?.errors
      setPasswordError(messages ? Object.values(messages).flat().join(' ') : 'Could not update your password. Please try again.')
    } finally {
      setSavingPassword(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-paper">
      <Sidebar user={user} />
      <main className="flex-1 min-w-0 px-5 md:px-10 py-8 max-w-6xl">
        <header className="border-b border-navy/15 pb-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-stamp font-semibold">Account</p>
          <h1 className="font-display text-3xl text-navy mt-1">Your profile</h1>
          <p className="text-sm text-navy/60 mt-1">Your account details and security settings.</p>
        </header>

        {profileError && <p role="alert" className="mt-5 border-l-4 border-alert bg-alert/10 px-4 py-3 text-sm text-navy">{profileError}</p>}

        {loadingProfile ? <p className="mt-6 text-sm text-navy/55">Loading your profile…</p> : user && (
          <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-8 mt-7">
            <section aria-labelledby="details-heading">
              <div className="flex items-end justify-between gap-4 border-b border-navy/15 pb-3">
                <div>
                  <h2 id="details-heading" className="font-display text-xl text-navy">Account details</h2>
                  <p className="text-sm text-navy/55 mt-1">Your registered Dunki information.</p>
                </div>
                {user.created_at && <p className="shrink-0 text-xs text-navy/50">Joined {new Date(user.created_at).toLocaleDateString()}</p>}
              </div>
              <dl className="grid sm:grid-cols-2 divide-y divide-navy/10 mt-2">
                {profileFields.map(({ key, label, format }) => {
                  const value = user[key]
                  return (
                    <div key={key} className="min-w-0 py-4 sm:pr-5">
                      <dt className="text-[11px] uppercase tracking-wide text-navy/50">{label}</dt>
                      <dd className="mt-1 break-words text-sm font-medium text-navy">{value ? (format ? format(String(value)) : value) : 'Not set'}</dd>
                    </div>
                  )
                })}
              </dl>

              <section aria-labelledby="destination-heading" className="mt-5 border-t border-navy/15 pt-5">
                <h3 id="destination-heading" className="font-display text-lg text-navy">Destination preference</h3>
                <p className="text-sm text-navy/55 mt-1">
                  Saved choice takes priority. If cleared, Dunki uses your latest contract or job application.
                </p>
                <p className="mt-3 text-xs text-navy/65">
                  Current: <strong className="text-navy">{destinationContext?.effective_destination || 'Not selected'}</strong>
                  <span> · {destinationSource}</span>
                  {destinationContext?.cost_cap && <span> · BMET cap ৳{Number(destinationContext.cost_cap).toLocaleString()}</span>}
                </p>
                {destinationError && <p role="alert" className="mt-3 border-l-4 border-alert bg-alert/10 px-3 py-2 text-sm text-navy">{destinationError}</p>}
                {destinationMessage && <p role="status" className="mt-3 border-l-4 border-verified bg-verified/10 px-3 py-2 text-sm text-navy">{destinationMessage}</p>}
                <form onSubmit={handleDestinationSave} className="mt-3 flex flex-col sm:flex-row gap-2">
                  <label className="sr-only" htmlFor="profile-destination">Preferred destination country</label>
                  <input
                    id="profile-destination"
                    list="destination-suggestions"
                    value={destinationValue}
                    onChange={(event) => setDestinationValue(event.target.value)}
                    maxLength={255}
                    placeholder="Choose or enter a country"
                    className="min-w-0 flex-1 border border-navy/20 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-stamp"
                  />
                  <datalist id="destination-suggestions">
                    {destinationSuggestions.map((destination) => <option key={destination} value={destination} />)}
                  </datalist>
                  <button
                    type="submit"
                    disabled={savingDestination}
                    className="bg-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy/90 disabled:opacity-60"
                  >
                    {savingDestination ? 'Saving…' : 'Save destination'}
                  </button>
                  {destinationValue && (
                    <button
                      type="button"
                      onClick={handleUseAutomatic}
                      disabled={savingDestination}
                      className="border border-navy/20 px-3 py-2.5 text-sm font-medium text-navy hover:bg-paper"
                    >
                      Use automatic
                    </button>
                  )}
                </form>
              </section>
            </section>

            <section aria-labelledby="password-heading" className="border border-navy/15 bg-white p-5 md:p-6 h-fit">
              <h2 id="password-heading" className="font-display text-xl text-navy">Change password</h2>
              <p className="text-sm text-navy/55 mt-1">Use your current password to set a new one.</p>

              {passwordError && <p role="alert" className="mt-4 border-l-4 border-alert bg-alert/10 px-3 py-2.5 text-sm text-navy">{passwordError}</p>}
              {passwordMessage && <p role="status" className="mt-4 border-l-4 border-verified bg-verified/10 px-3 py-2.5 text-sm text-navy">{passwordMessage}</p>}

              <form onSubmit={handlePasswordChange} className="mt-5 space-y-4">
                <label className="block">
                  <span className="text-xs font-medium text-navy/70">Current password</span>
                  <input
                    type="password"
                    autoComplete="current-password"
                    required
                    value={passwords.current_password}
                    onChange={(event) => setPasswords({ ...passwords, current_password: event.target.value })}
                    className="mt-1.5 w-full border border-navy/20 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-stamp"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-navy/70">New password</span>
                  <input
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    required
                    value={passwords.new_password}
                    onChange={(event) => setPasswords({ ...passwords, new_password: event.target.value })}
                    className="mt-1.5 w-full border border-navy/20 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-stamp"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-navy/70">Confirm new password</span>
                  <input
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    required
                    value={passwords.new_password_confirmation}
                    onChange={(event) => setPasswords({ ...passwords, new_password_confirmation: event.target.value })}
                    className="mt-1.5 w-full border border-navy/20 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-stamp"
                  />
                </label>
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="w-full bg-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy/90 disabled:opacity-60"
                >
                  {savingPassword ? 'Updating…' : 'Update password'}
                </button>
              </form>
            </section>
          </div>
        )}

        {!loadingProfile && ['worker', 'agency'].includes(user?.role) && (
          <section aria-labelledby="transactions-heading" className="mt-9">
            <div className="border-b border-navy/15 pb-3">
              <h2 id="transactions-heading" className="font-display text-xl text-navy">Total transaction history</h2>
              <p className="mt-1 text-sm text-navy/55">Every payment involving your account. Currency totals are kept separate.</p>
            </div>
            {transactionsError && <p role="alert" className="mt-4 border-l-4 border-alert bg-alert/10 px-3 py-2 text-sm text-navy">{transactionsError}</p>}
            {loadingTransactions ? <p className="py-5 text-sm text-navy/50">Loading transaction history…</p> : transactions.length === 0 ? (
              <p className="py-5 text-sm text-navy/50">No agency transactions are linked to your account.</p>
            ) : (
              <>
                <div className="mt-4 overflow-x-auto border-y border-navy/10">
                  <table className="w-full text-left text-sm">
                    <caption className="py-2 text-left text-xs text-navy/55">Totals by currency</caption>
                    <thead>
                      <tr className="border-b border-navy/10 text-[11px] uppercase text-navy/50">
                        <th scope="col" className="py-2 pr-5">Currency</th>
                        <th scope="col" className="py-2 pr-5">Transactions</th>
                        <th scope="col" className="py-2 pr-5 text-right">Sent</th>
                        <th scope="col" className="py-2 text-right">Received</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currencyTotals.map((total) => (
                        <tr key={total.currency} className="border-b border-navy/8 last:border-0">
                          <th scope="row" className="py-2 pr-5 font-mono text-navy">{total.currency}</th>
                          <td className="py-2 pr-5 text-navy/70">{total.transaction_count}</td>
                          <td className="py-2 pr-5 text-right font-mono text-navy/80">{Number(total.sent_total).toLocaleString()}</td>
                          <td className="py-2 text-right font-mono text-navy/80">{Number(total.received_total).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-navy/10 text-[11px] uppercase text-navy/50">
                      <th scope="col" className="py-3 pr-5">{user.role === 'agency' ? 'Worker' : 'Agency'}</th>
                      <th scope="col" className="py-3 pr-5">Direction</th>
                      <th scope="col" className="py-3 pr-5">Purpose</th>
                      <th scope="col" className="py-3 pr-5">Initiated</th>
                      <th scope="col" className="py-3 pr-5">Reference</th>
                      <th scope="col" className="py-3 pr-5 text-right">Amount</th>
                      <th scope="col" className="py-3 pr-5">Result</th>
                      <th scope="col" className="py-3">Last updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((transaction) => (
                      <tr key={transaction.id} className="border-b border-navy/8 last:border-0">
                        <td className="py-3 pr-5 text-navy">{user.role === 'agency' ? transaction.worker_name : transaction.agency_name}</td>
                        <td className="py-3 pr-5 text-xs text-navy/70">{transaction.direction}</td>
                        <td className="py-3 pr-5 text-navy/75">{transaction.purpose}</td>
                        <td className="py-3 pr-5 whitespace-nowrap font-mono text-xs text-navy/65">{transaction.created_at ? new Date(transaction.created_at).toLocaleString() : transaction.payment_date}</td>
                        <td className="py-3 pr-5 font-mono text-xs text-navy/65">{transaction.bank_tran_id || transaction.transaction_id || '—'}</td>
                        <td className="py-3 pr-5 text-right whitespace-nowrap font-mono font-semibold text-navy">{transaction.currency} {Number(transaction.amount).toLocaleString()}</td>
                        <td className="py-3 pr-5">
                          <StatusBadge level={transaction.status === 'verified' || transaction.status === 'completed' ? 'verified' : transaction.status === 'pending' ? 'warning' : 'alert'}>
                            {transaction.status}
                          </StatusBadge>
                          {transaction.notes && <p className="mt-1 max-w-xs text-xs text-navy/50">{transaction.notes}</p>}
                        </td>
                        <td className="py-3 whitespace-nowrap font-mono text-xs text-navy/65">{transaction.updated_at ? new Date(transaction.updated_at).toLocaleString() : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </>
            )}
          </section>
        )}
      </main>
    </div>
  )
}