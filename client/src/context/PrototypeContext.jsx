import { createContext, useContext, useState, useEffect, useRef } from "react"
import { generatePrototype, generateCode as generateCodeApi, clearSession as clearSessionApi, getSession as getSessionApi, getHistory, deleteSession as deleteSessionApi } from "../services/api"
import { useAuthContext } from './AuthContext'
import sampleLayout from '../data/sampleLayout.json'

const PrototypeContext = createContext()

export const usePrototypeContext = () => {
  return useContext(PrototypeContext)
}

export const PrototypeProvider = ({ children }) => {
  const { user } = useAuthContext()

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [currentPrototype, setCurrentPrototype] = useState(null)
  const [enhancedPrompt, setEnhancedPrompt] = useState(null)
  const [originalPrompt, setOriginalPrompt] = useState(null)

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

  const [sessionId, setSessionIdState] = useState(null)
  const sessionIdRef = useRef(null)

  const setSessionId = (id) => {
    setSessionIdState(id)
    sessionIdRef.current = id
  }

  const [generationStage, setGenerationStage] = useState(null)

  // Session history log
  const [sessionLog, setSessionLog] = useState([])

  // Fetch history on load if authenticated
  useEffect(() => {
    const fetchHistory = async () => {
      if (user) {
        try {
          const data = await getHistory();
          if (data.success && data.history) {
            // Map the summary objects to match the shape expected by SessionList
            const loadedHistory = data.history.map(item => ({
              id: item.sessionId,
              title: item.title,
              firstPrompt: item.preview || item.title,
              timestamp: item.updatedAt || item.createdAt,
              domain: item.domain,
              // We don't have the full prototype tree yet; it will be lazy-loaded in loadSession
            }));

            // To prevent overwriting immediately generated local, we append API history beneath any local sessions currently in memory (rare edge case)
            setSessionLog(prev => {
              const existingIds = new Set(prev.map(s => s.id));
              const missingHistory = loadedHistory.filter(s => !existingIds.has(s.id));
              return [...prev, ...missingHistory];
            });
          }
        } catch (e) {
          console.error("Failed to load user history:", e);
        }
      } else {
        // Clear history on logout
        setSessionLog([]);
      }
    };
    fetchHistory();
  }, [user]);

  // Helper for delays
  const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms))

  // GENERATE WORKFLOW
  const generate = async (prompt, mode) => {

    if (!prompt) return

    try {

      setIsLoading(true)
      setError(null)
      setEnhancedPrompt(null)
      setOriginalPrompt(prompt)

      // Stage 0: Enhancing prompt
      setGenerationStage("enhancing")
      // Stage 1: Detecting domain (these fire while the server is processing)
      await wait(400)
      setGenerationStage("detecting")
      await wait(300)

      // Stage 2: Extracting features
      setGenerationStage("extracting")
      await wait(300)

      // Stage 2.5: Retrieving Context (RAG)
      setGenerationStage("retrieving")
      await wait(300)

      // Stage 3: Generating
      setGenerationStage("generating")

      let data;
      try {
        // Use the ref (not state) to guarantee the freshest session ID.
        // React state captured in this closure may be stale on follow-up calls.
        data = await generatePrototype(prompt, mode, sessionIdRef.current);
      } catch (e) {
        const errMsg = e.response?.data?.error?.message || e.message;
        throw new Error(errMsg || "Generation failed")
      }

      if (!data.success) {
        throw new Error(data.error?.message || "Generation failed")
      }

      // Stage 4: Validating
      setGenerationStage("validating")
      await wait(200)

      // Save session
      setSessionId(data.sessionId)

      // Store the enhanced prompt for display in the banner
      setEnhancedPrompt(data.enhancedPrompt || null)

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
      const isDomainChanged = data.domainChanged
      if (data.metadata?.domain) {
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

      // Save/update session in sessionLog
      // When domain changes: archive the OLD session, then add the new one

      const newSessionEntry = {
        id: data.sessionId,
        title: prompt.length > 60 ? prompt.substring(0, 60) + '...' : prompt,
        firstPrompt: prompt,
        timestamp: new Date().toISOString(),
        prototype: {
          content: data.content,
          metadata: {
            ...data.metadata,
            files: data.files || data.metadata?.files || []
          },
          features: data.features || [],
          pipelineSteps: data.pipelineSteps || []
        },
        promptHistory: isDomainChanged
          ? [{ text: prompt, timestamp: new Date().toISOString(), domain: data.metadata?.domain || 'general' }]
          : [
            ...promptHistory,
            { text: prompt, timestamp: new Date().toISOString(), domain: data.metadata?.domain || 'general' }
          ],
        counters: {
          totalPrompts: data.metadata?.total_prompt_count || 0,
          mergedPrompts: data.metadata?.merged_prompt_count || 0
        },
        domain: data.metadata?.domain || 'general'
      }

      setSessionLog(prev => {
        if (isDomainChanged && currentPrototype) {
          // Archive the old session as a frozen snapshot before adding the new one
          const prevSessionId = sessionIdRef.current;
          const oldExists = prev.some(s => s.id === prevSessionId)
          if (!oldExists && prevSessionId) {
            const archivedOldSession = {
              id: prevSessionId,
              title: promptHistory.length > 0
                ? (promptHistory[0].text.length > 60 ? promptHistory[0].text.substring(0, 60) + '...' : promptHistory[0].text)
                : 'Untitled Session',
              firstPrompt: promptHistory[0]?.text || '',
              timestamp: promptHistory[0]?.timestamp || new Date().toISOString(),
              prototype: { ...currentPrototype },
              promptHistory: [...promptHistory],
              counters: { ...counters },
              domain: domainInfo.current || 'general'
            }
            return [...prev, archivedOldSession, newSessionEntry]
          }
          // Old already archived, just append new
          return [...prev, newSessionEntry]
        }

        // Same domain: update existing entry or append
        const existingIndex = prev.findIndex(s => s.id === data.sessionId)
        if (existingIndex >= 0) {
          const updated = [...prev]
          updated[existingIndex] = newSessionEntry
          return updated
        }
        return [...prev, newSessionEntry]
      })

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
    const activeSessionId = sessionIdRef.current || sessionId;
    if (!activeSessionId) {
      setError("No active prototype session")
      return
    }

    try {

      setIsLoading(true)
      setError(null)

      let data;
      try {
        data = await generateCodeApi(activeSessionId);
      } catch (e) {
        throw new Error(e.response?.data?.error?.message || "Code generation failed")
      }

      if (!data.success) {
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


  // CLEAR STATE (archives the current session but does NOT clear sessionLog)
  const clear = async () => {

    try {

      await clearSessionApi(sessionId);

    } catch (err) {
      console.error("Clear session error:", err)
    }

    setSessionId(null)
    setCurrentPrototype(null)
    setPromptHistory([])
    setEnhancedPrompt(null)
    setOriginalPrompt(null)

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

  // LOAD A PREVIOUS SESSION from sessionLog or API
  const loadSession = async (id) => {
    let session = sessionLog.find(s => s.id === id)

    // If not in memory or just a summary from history fetch, try to fetch full data from API
    if (!session || !session.prototype) {
      try {
        setIsLoading(true);
        const data = await getSessionApi(id);
        if (data.success) {
          session = {
            ...session,
            id: data.sessionId,
            title: data.title || 'Untitled Prototype',
            prototype: data.lastOutput,
            domain: data.domain || data.lastOutput?.metadata?.domain || 'general',
            promptHistory: data.prompts || [],
            counters: {
              totalPrompts: data.totalPromptCount || 0,
              mergedPrompts: data.mergedPromptCount || 0
            }
          };
          // Also update it in sessionLog so we don't fetch it again
          setSessionLog(prev => prev.map(s => s.id === id ? session : s));
        }
      } catch (e) {
        console.error("Failed to fetch session:", e);
        setError(e.response?.data?.error?.message || e.message || "Failed to load session");
      } finally {
        setIsLoading(false);
      }
    }

    if (!session) return

    setSessionId(session.id)
    setCurrentPrototype(session.prototype)
    setPromptHistory(session.promptHistory || [])
    setCounters(session.counters || { totalPrompts: 0, mergedPrompts: 0 })
    setDomainInfo({
      current: session.domain || null,
      oldDomain: null,
      changed: false
    })
    setChangeLog([])
    setError(null)
    setGenerationStage('complete')
  }

  // Acknowledge domain change (close modal)
  const acknowledgeDomainChange = () => {
    setShowDomainChangeModal(false)
    setDomainInfo(prev => ({
      ...prev,
      changed: false
    }))
  }

  // DELETE A SESSION
  const deletePrototype = async (id) => {
    try {
      const data = await deleteSessionApi(id);
      if (data.success) {
        setSessionLog(prev => prev.filter(s => s.id !== id));
        if (sessionId === id) {
          clear();
        }
        return true;
      }
    } catch (e) {
      console.error("Failed to delete session:", e);
      setError("Failed to delete prototype");
    }
    return false;
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
        enhancedPrompt,
        originalPrompt,
        promptHistory,
        counters,
        domainInfo,
        changeLog,
        generationStage,
        showDomainChangeModal,
        sessionLog,
        sessionId,
        generate,
        generateCodeForPrototype,
        clear,
        loadSession,
        acknowledgeDomainChange,
        deletePrototype,
        getLayout
      }}
    >
      {children}
    </PrototypeContext.Provider>
  )
}