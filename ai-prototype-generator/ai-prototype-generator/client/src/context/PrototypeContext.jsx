import { createContext, useContext, useState, useCallback, useRef } from "react"
import { flushSync } from "react-dom"
import sampleLayout from '../data/sampleLayout.json'

const PrototypeContext = createContext()

export const usePrototypeContext = () => {
  return useContext(PrototypeContext)
}

export const PrototypeProvider = ({ children }) => {

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5001"

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [currentPrototype, setCurrentPrototype] = useState(null)

  const [promptHistory, setPromptHistory] = useState([])

  const [counters, setCounters] = useState({
    totalPrompts: 0,
    mergedPrompts: 0
  })

  const [domainInfo, setDomainInfo] = useState({
    current: null,
    oldDomain: null,
    changed: false
  })

  const [showDomainChangeModal, setShowDomainChangeModal] = useState(false)

  const [changeLog, setChangeLog] = useState([])

  const [sessionId, setSessionId] = useState(null)

  const [generationStage, setGenerationStage] = useState(null)

  // Use ref to track pending domain change and prompt
  const pendingDomainChangeRef = useRef(null)
  const lastProcessedPromptRef = useRef(null)
  const isProcessingRef = useRef(false)

  // Helper for delays
  const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms))

  // GENERATE WORKFLOW - FIXED: Proper state management for domain changes
  const generate = useCallback(async (prompt, mode) => {

    if (!prompt) return

    // Prevent duplicate processing
    if (isProcessingRef.current) {
      console.log('[PrototypeContext] Already processing, ignoring duplicate request')
      return
    }

    isProcessingRef.current = true

    console.log('[PrototypeContext] === STARTING GENERATION ===')
    console.log('[PrototypeContext] Prompt:', prompt.substring(0, 50))
    console.log('[PrototypeContext] Current sessionId:', sessionId)
    console.log('[PrototypeContext] Current domain:', domainInfo.current)
    console.log('[PrototypeContext] Current prototype exists:', !!currentPrototype)

    // Track this prompt as being processed
    lastProcessedPromptRef.current = prompt

    try {

      setIsLoading(true)
      setError(null)

      // Stage 1: Detecting domain
      setGenerationStage("detecting")
      await wait(300)

      // Stage 2: Extracting features
      setGenerationStage("extracting")
      await wait(300)

      // Stage 3: Generating
      setGenerationStage("generating")

      const requestBody = {
        prompt,
        mode,
        sessionId
      }

      console.log('[PrototypeContext] Sending API request...')

      const response = await fetch(`${API_URL}/api/prototype/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(requestBody)
      })

      const data = await response.json()

      console.log('[PrototypeContext] API Response:', {
        success: data.success,
        domainChanged: data.domainChanged,
        domain: data.metadata?.domain,
        hasContent: !!data.content,
        hasWorkflow: !!(data.content?.workflow?.length > 0),
        sessionId: data.sessionId
      })

      if (!response.ok || !data.success) {
        const errMsg = typeof data.error === 'string' ? data.error : data.error?.message;
        throw new Error(errMsg || "Generation failed")
      }

      // Stage 4: Validating
      setGenerationStage("validating")
      await wait(200)

      // CRITICAL FIX: Use flushSync to ensure state updates are committed immediately
      // This prevents race conditions where the modal shows before the prototype is set

      // Save session
      flushSync(() => {
        setSessionId(data.sessionId)
      })

      // Create the prototype object
      const newPrototype = {
        content: data.content,
        metadata: {
          ...data.metadata,
          files: data.files || data.metadata?.files || []
        },
        features: data.features || [],
        pipelineSteps: data.pipelineSteps || []
      }

      console.log('[PrototypeContext] Setting currentPrototype...')

      // Set prototype - THIS IS CRITICAL
      flushSync(() => {
        setCurrentPrototype(newPrototype)
      })

      console.log('[PrototypeContext] currentPrototype set successfully')

      // Prompt history
      flushSync(() => {
        setPromptHistory(prev => [
          ...prev,
          {
            text: prompt,
            timestamp: new Date().toISOString(),
            domain: data.metadata?.domain || 'general'
          }
        ])
      })

      // Counters
      flushSync(() => {
        setCounters({
          totalPrompts: data.metadata?.total_prompt_count || 0,
          mergedPrompts: data.metadata?.merged_prompt_count || 0
        })
      })

      // Domain info - CRITICAL FIX: Handle domain change properly
      const isDomainChanged = data.domainChanged === true

      console.log('[PrototypeContext] Domain changed:', isDomainChanged)

      if (data.metadata?.domain) {
        if (isDomainChanged) {
          // Store the domain change info for later acknowledgment
          pendingDomainChangeRef.current = {
            oldDomain: domainInfo.current,
            newDomain: data.metadata.domain
          }

          // Update domain info
          flushSync(() => {
            setDomainInfo({
              current: data.metadata.domain,
              oldDomain: domainInfo.current,
              changed: true
            })
          })

          console.log('[PrototypeContext] Domain changed! Will show modal.')

          // Show modal AFTER all state is flushed
          setTimeout(() => {
            console.log('[PrototypeContext] Showing domain change modal now')
            setShowDomainChangeModal(true)
          }, 100)
        } else {
          flushSync(() => {
            setDomainInfo(prev => ({
              current: data.metadata.domain,
              oldDomain: prev.current,
              changed: false
            }))
          })
        }
      }

      // Change log
      if (data.metadata?.change_log) {
        flushSync(() => {
          setChangeLog(data.metadata.change_log)
        })
      }

      // Stage 5: Complete
      setGenerationStage("complete")

      console.log('[PrototypeContext] === GENERATION COMPLETE ===')

    } catch (err) {

      console.error('[PrototypeContext] Generate error:', err)
      setError(err.message || "Something went wrong")
      setGenerationStage("error")

    } finally {
      // ALWAYS reset these, even if domain changed
      setIsLoading(false)
      isProcessingRef.current = false
      console.log('[PrototypeContext] isLoading set to false, processing complete')
    }
  }, [API_URL, sessionId, domainInfo.current, currentPrototype])

  // GENERATE CODE
  const generateCodeForPrototype = useCallback(async () => {

    if (!sessionId) {
      setError("No active prototype session")
      return
    }

    try {

      setIsLoading(true)
      setError(null)

      const response = await fetch(`${API_URL}/api/prototype/code`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          sessionId
        })
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error?.message || "Code generation failed")
      }

      const updatedPrototype = {
        content: data.content,
        metadata: {
          ...data.metadata,
          files: data.files || data.metadata?.files || []
        },
        features: data.features || [],
        pipelineSteps: data.pipelineSteps || []
      }

      flushSync(() => {
        setCurrentPrototype(updatedPrototype)
      })

      return { success: true, data }

    } catch (err) {

      console.error("Code generation error:", err)
      setError(err.message || "Code generation failed")

    } finally {
      setIsLoading(false)
    }
  }, [API_URL, sessionId])


  // CLEAR STATE - FIXED: Separate concerns properly
  const clear = useCallback(async (options = {}) => {

    const {
      keepPrototype = false,
      keepSession = false
    } = options

    console.log('[PrototypeContext] clear() called with:', { keepPrototype, keepSession })

    if (!keepSession) {
      try {
        await fetch(`${API_URL}/api/prototype/clear`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ sessionId })
        })
      } catch (err) {
        console.error("Clear session error:", err)
      }

      flushSync(() => {
        setSessionId(null)
      })
    }

    // Only clear prototype if explicitly requested
    if (!keepPrototype) {
      console.log('[PrototypeContext] Clearing prototype')
      flushSync(() => {
        setCurrentPrototype(null)
      })
    }

    flushSync(() => {
      setCounters({
        totalPrompts: 0,
        mergedPrompts: 0
      })

      setDomainInfo({
        current: null,
        oldDomain: null,
        changed: false
      })

      setShowDomainChangeModal(false)

      setChangeLog([])
      setError(null)
      setGenerationStage(null)
    })

    pendingDomainChangeRef.current = null
  }, [API_URL, sessionId])

  // Acknowledge domain change (close modal) - FIXED: Just close the modal, nothing else
  const acknowledgeDomainChange = useCallback(() => {
    console.log('[PrototypeContext] acknowledgeDomainChange called - just closing modal')
    flushSync(() => {
      setShowDomainChangeModal(false)
      setDomainInfo(prev => ({
        ...prev,
        changed: false
      }))
    })
    pendingDomainChangeRef.current = null
  }, [])

  // Start new session after domain change
  const startNewSessionAfterDomainChange = useCallback(async () => {
    console.log('[PrototypeContext] startNewSessionAfterDomainChange called')
    // Clear everything including prototype
    await clear({ keepPrototype: false, keepSession: false })
  }, [clear])

  const getLayout = useCallback(() => {
    return currentPrototype?.content?.layout || sampleLayout;
  }, [currentPrototype])

  return (
    <PrototypeContext.Provider
      value={{
        isLoading,
        error,
        currentPrototype,
        promptHistory,
        counters,
        domainInfo,
        changeLog,
        generationStage,
        showDomainChangeModal,
        generate,
        generateCodeForPrototype,
        clear,
        acknowledgeDomainChange,
        startNewSessionAfterDomainChange,
        getLayout
      }}
    >
      {children}
    </PrototypeContext.Provider>
  )
}
