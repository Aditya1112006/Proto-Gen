import { createContext, useContext, useState } from "react"
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

  // Helper for delays
  const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms))

  // GENERATE WORKFLOW
  const generate = async (prompt, mode) => {

    if (!prompt) return

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

      const response = await fetch(`${API_URL}/api/prototype/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          prompt,
          mode,
          sessionId
        })
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        const errMsg = typeof data.error === 'string' ? data.error : data.error?.message;
        throw new Error(errMsg || "Generation failed")
      }

      // Stage 4: Validating
      setGenerationStage("validating")
      await wait(200)

      // Save session
      setSessionId(data.sessionId)

      // Set prototype with pipeline data
      setCurrentPrototype({
        content: data.content,
        metadata: {
          ...data.metadata,
          files: data.files || data.metadata?.files || []
        },
        features: data.features || [],
        pipelineSteps: data.pipelineSteps || []
      })

      // Prompt history (save as object for HistoryList)
      setPromptHistory(prev => [
        ...prev, 
        { 
          text: prompt, 
          timestamp: new Date().toISOString(), 
          domain: data.metadata?.domain || 'general' 
        }
      ])

      // Counters
      setCounters({
        totalPrompts: data.metadata?.total_prompt_count || 0,
        mergedPrompts: data.metadata?.merged_prompt_count || 0
      })

      // Domain info
      if (data.metadata?.domain) {
        const isDomainChanged = data.domainChanged
        setDomainInfo(prev => ({
          current: data.metadata.domain,
          oldDomain: prev.current,
          changed: isDomainChanged
        }))
        if (isDomainChanged) {
          setShowDomainChangeModal(true)
        }
      }

      // Change log
      if (data.metadata?.change_log) {
        setChangeLog(data.metadata.change_log)
      }

      // Stage 5: Complete
      setGenerationStage("complete")

    } catch (err) {

      console.error("Generate error:", err)
      setError(err.message || "Something went wrong")
      setGenerationStage("error")

    } finally {
      setIsLoading(false)
    }
  }

  // GENERATE CODE
  const generateCodeForPrototype = async () => {

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

      setCurrentPrototype({
        content: data.content,
        metadata: {
          ...data.metadata,
          files: data.files || data.metadata?.files || []
        },
        features: data.features || [],
        pipelineSteps: data.pipelineSteps || []
      })

      return { success: true, data }

    } catch (err) {

      console.error("Code generation error:", err)
      setError(err.message || "Code generation failed")

    } finally {
      setIsLoading(false)
    }
  }


  // CLEAR STATE
  const clear = async () => {

    try {

      await fetch(`${API_URL}/api/prototype/clear`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          sessionId
        })
      })

    } catch (err) {
      console.error("Clear session error:", err)
    }

    setSessionId(null)
    setCurrentPrototype(null)
    setPromptHistory([])

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
  }

  // Acknowledge domain change (close modal)
  const acknowledgeDomainChange = () => {
    setShowDomainChangeModal(false)
    setDomainInfo(prev => ({
      ...prev,
      changed: false
    }))
  }

  const getLayout = () => {
    return currentPrototype?.content?.layout || sampleLayout;
  }

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
        getLayout
      }}
    >
      {children}
    </PrototypeContext.Provider>
  )
}