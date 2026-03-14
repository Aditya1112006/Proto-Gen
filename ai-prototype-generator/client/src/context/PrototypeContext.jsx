import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { generatePrototype, generateCode, clearSession } from '../services/api'

const PrototypeContext = createContext(null)

const STORAGE_KEY = 'ai_prototype_session_id'

export function PrototypeProvider({ children }) {
  // Load sessionId from localStorage on mount
  const [sessionId, setSessionId] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(STORAGE_KEY) || null
    }
    return null
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  // Prototype state
  const [currentPrototype, setCurrentPrototype] = useState(null)
  const [promptHistory, setPromptHistory] = useState([])
  const [counters, setCounters] = useState({
    totalPrompts: 0,
    mergedPrompts: 0
  })
  const [domainInfo, setDomainInfo] = useState({
    current: null,
    changed: false,
    oldDomain: null
  })
  const [changeLog, setChangeLog] = useState([])

  // Persist sessionId to localStorage whenever it changes
  useEffect(() => {
    if (sessionId) {
      localStorage.setItem(STORAGE_KEY, sessionId)
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [sessionId])

  // Generate prototype from prompt
  const generate = useCallback(async (prompt, mode = 'workflow') => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await generatePrototype(prompt, mode, sessionId)

      // Update session
      if (result.sessionId) {
        setSessionId(result.sessionId)
      }

      // Update prototype
      setCurrentPrototype({
        metadata: result.metadata,
        content: result.content
      })

      // Update prompt history
      setPromptHistory(result.promptHistory || [])

      // Update counters
      setCounters({
        totalPrompts: result.metadata?.total_prompt_count || 0,
        mergedPrompts: result.metadata?.merged_prompt_count || 0
      })

      // Update domain info
      setDomainInfo({
        current: result.domain,
        changed: result.domainChanged,
        oldDomain: result.oldDomain
      })

      // Update change log
      setChangeLog(result.changeLog || [])

      return { success: true, data: result }
    } catch (err) {
      setError(err.message || 'Failed to generate prototype')
      return { success: false, error: err.message }
    } finally {
      setIsLoading(false)
    }
  }, [sessionId])

  // Generate code for current prototype
  const generateCodeForPrototype = useCallback(async () => {
    if (!sessionId) {
      setError('No active prototype')
      return { success: false, error: 'No active prototype' }
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await generateCode(sessionId)

      // Update prototype with code
      setCurrentPrototype(prev => ({
        ...prev,
        metadata: result.metadata,
        content: {
          ...prev?.content,
          ...result.content
        }
      }))

      return { success: true, data: result }
    } catch (err) {
      setError(err.message || 'Failed to generate code')
      return { success: false, error: err.message }
    } finally {
      setIsLoading(false)
    }
  }, [sessionId])

  // Clear current prototype
  const clear = useCallback(async () => {
    if (sessionId) {
      await clearSession(sessionId)
    }

    setSessionId(null)
    setCurrentPrototype(null)
    setPromptHistory([])
    setCounters({ totalPrompts: 0, mergedPrompts: 0 })
    setDomainInfo({ current: null, changed: false, oldDomain: null })
    setChangeLog([])
    setError(null)
  }, [sessionId])

  const value = {
    // State
    sessionId,
    isLoading,
    error,
    currentPrototype,
    promptHistory,
    counters,
    domainInfo,
    changeLog,

    // Actions
    generate,
    generateCodeForPrototype,
    clear,

    // Setters
    setError
  }

  return (
    <PrototypeContext.Provider value={value}>
      {children}
    </PrototypeContext.Provider>
  )
}

export function usePrototypeContext() {
  const context = useContext(PrototypeContext)
  if (!context) {
    throw new Error('usePrototypeContext must be used within a PrototypeProvider')
  }
  return context
}
