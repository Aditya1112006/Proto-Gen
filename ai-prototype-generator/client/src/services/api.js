import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json'
  }
})

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

export default api
