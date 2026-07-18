import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001'

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Add auth token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && error.response?.data?.error?.details === 'token_expired') {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

// Generate prototype from prompt
export async function generatePrototype(prompt, mode, sessionId) {
  const response = await api.post('/prototype/generate', {
    prompt,
    mode,
    sessionId
  })
  return response.data
}

// Generate code for current prototype
export async function generateCode(sessionId) {
  const response = await api.post('/prototype/code', {
    sessionId
  })
  return response.data
}

// Clear session
export async function clearSession(sessionId) {
  const response = await api.post('/prototype/clear', {
    sessionId
  })
  return response.data
}

// Get session state
export async function getSession(sessionId) {
  const response = await api.get(`/prototype/session/${sessionId}`)
  return response.data
}

// Validate prompt
export async function validatePrompt(prompt) {
  const response = await api.post('/prototype/validate', {
    prompt
  })
  return response.data
}

// Get user prototype history
export async function getHistory() {
  const response = await api.get('/prototype/history')
  return response.data
}

// Delete prototype session
export async function deleteSession(sessionId) {
  const response = await api.delete(`/prototype/session/${sessionId}`)
  return response.data
}

// Authentication
export async function login(email, password) {
  const response = await api.post('/auth/login', { email, password })
  return response.data
}

export async function register(name, email, password) {
  const response = await api.post('/auth/register', { name, email, password })
  return response.data
}

export async function fetchMe() {
  const response = await api.get('/auth/me')
  return response.data
}

export default api
