// src/lib/api.js
import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:8000/api',
})

// attach token automatically to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// auto-logout on 401 (expired/invalid token)
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export async function login(email, password) {
  const { data } = await api.post('/login', { email, password })
  localStorage.setItem('token', data.token)
  return data.user
}

export async function register(payload) {
  const { data } = await api.post('/register', payload)
  localStorage.setItem('token', data.token)
  return data.user
}

export async function logout() {
  await api.post('/logout')
  localStorage.removeItem('token')
}

export async function fetchDashboard() {
  const { data } = await api.get('/dashboard')
  return data
}

export async function fetchMe() {
  const { data } = await api.get('/me')
  return data
}
export async function fetchContracts() {
  const { data } = await api.get('/contracts')
  return data
}

export async function createContract(payload) {
  const { data } = await api.post('/contracts', payload)
  return data
}

export async function updateContract(id, payload) {
  const { data } = await api.patch(`/contracts/${id}`, payload)
  return data
}
export async function updateApplicationStatus(id, status) {
  const { data } = await api.patch(`/applications/${id}`, { status })
  return data
}
export async function deleteContract(id) {
  await api.delete(`/contracts/${id}`)
}
export async function fetchDocuments() {
  const { data } = await api.get('/documents')
  return data
}

export async function createDocument(payload) {
  const { data } = await api.post('/documents', payload)
  return data
}

export async function updateDocument(id, payload) {
  const { data } = await api.patch(`/documents/${id}`, payload)
  return data
}

export async function deleteDocument(id) {
  await api.delete(`/documents/${id}`)
}
export async function fetchJobs(params = {}) {
  const { data } = await api.get('/jobs', { params })
  return data
}

export async function applyToJob(jobId, formData) {
  const { data } = await api.post(`/jobs/${jobId}/apply`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}
export async function fetchMyApplications() {
  const { data } = await api.get('/applications/mine')
  return data
}
export async function fetchAgencyApplications() {
  const { data } = await api.get('/applications/for-agency')
  return data
}
export async function createJob(payload) {
  const { data } = await api.post('/jobs', payload)
  return data
}
export default api