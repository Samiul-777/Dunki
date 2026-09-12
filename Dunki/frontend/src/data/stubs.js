export const currentWorker = {
  name: 'Md. Rafiqul Islam',
  trackingId: 'DNK-2026-004821',
  destination: 'Riyadh, Saudi Arabia',
  agency: 'Al-Amin Overseas Ltd.'
}

export const journeyStages = [
  { key: 'applied', label: 'Applied', status: 'done' },
  { key: 'reviewed', label: 'Agency Review', status: 'done' },
  { key: 'contract', label: 'Contract Verified', status: 'done' },
  { key: 'medical', label: 'Medical', status: 'current' },
  { key: 'visa', label: 'Visa', status: 'pending' },
  { key: 'travel', label: 'Travel', status: 'pending' }
]

export const documentChecklist = [
  { name: 'National ID (NID)', status: 'complete' },
  { name: 'Passport copy', status: 'complete' },
  { name: 'Medical fitness report', status: 'missing' },
  { name: 'Training certificate', status: 'complete' },
  { name: 'Police clearance', status: 'missing' }
]

export const recentPayments = [
  { purpose: 'Agency processing fee', amount: 45000, method: 'bKash', date: '2026-06-02' },
  { purpose: 'Medical test fee', amount: 3500, method: 'Cash receipt', date: '2026-06-10' },
  { purpose: 'Training fee', amount: 8000, method: 'Bank transfer', date: '2026-06-18' }
]

export const notifications = [
  { title: 'Contract updated by agency', detail: 'Salary clause revised — review required', time: '2h ago', level: 'warning' },
  { title: 'Medical report pending upload', detail: 'Required before visa stage', time: '1d ago', level: 'alert' },
  { title: 'Application received', detail: 'Al-Amin Overseas Ltd. confirmed receipt', time: '3d ago', level: 'info' }
]

export const jobListings = [
  {
    id: 'JC-11029',
    title: 'Construction Technician',
    country: 'Saudi Arabia',
    city: 'Riyadh',
    salary: '1,800 SAR / month',
    agency: 'Al-Amin Overseas Ltd.',
    verified: true,
    postedDaysAgo: 2
  },
  {
    id: 'JC-11031',
    title: 'Factory Machine Operator',
    country: 'Malaysia',
    city: 'Johor Bahru',
    salary: '1,700 MYR / month',
    agency: 'Prime Manpower BD',
    verified: true,
    postedDaysAgo: 4
  },
  {
    id: 'JC-11040',
    title: 'Hotel Housekeeping Staff',
    country: 'Qatar',
    city: 'Doha',
    salary: '1,200 QAR / month',
    agency: 'Bismillah Recruiting',
    verified: false,
    postedDaysAgo: 1
  },
  {
    id: 'JC-11044',
    title: 'Warehouse Assistant',
    country: 'UAE',
    city: 'Dubai',
    salary: '1,500 AED / month',
    agency: 'Al-Amin Overseas Ltd.',
    verified: true,
    postedDaysAgo: 6
  }
]
