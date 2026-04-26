import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { AlertCircle, RefreshCw, LayoutTemplate } from 'lucide-react'
import { usePrototypeContext } from '../context/PrototypeContext'
import PromptInput from '../components/PromptInput/PromptInput'
import HistoryList from '../components/History/HistoryList'
import CounterDisplay from '../components/Counters/CounterDisplay'
import WorkflowOutput from '../components/Output/WorkflowOutput'
import CodeOutput from '../components/Output/CodeOutput'
import GenerateCodeButton from '../components/Output/GenerateCodeButton'
import GenerationStatus from '../components/GenerationStatus'
import DomainChangeModal from '../components/Modals/DomainChangeModal'
import SessionList from '../components/History/SessionList'
import EnhancedPromptBanner from '../components/Output/EnhancedPromptBanner'

function PrototypeGenerator() {

  const navigate = useNavigate()
  const location = useLocation()

  const {
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
    acknowledgeDomainChange
  } = usePrototypeContext()

  const handleSubmit = async (prompt) => {
    if (!prompt) return
    await generate(prompt, 'workflow')
  }

  useEffect(() => {
    if (location.state?.loadSessionId) {
      loadSession(location.state.loadSessionId);
      // Clear state so it doesn't re-trigger on hot reload
      navigate(location.pathname, { replace: true, state: {} });
    } else if (location.state?.initialPrompt) {
      const initialPrompt = location.state.initialPrompt;
      navigate(location.pathname, { replace: true, state: {} });
      handleSubmit(initialPrompt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  const handleGenerateCode = async () => {
    await generateCodeForPrototype()
  }

  const handleClear = async () => {
    await clear()
  }

  return (
    <div className="min-h-screen bg-dark-950 py-8 px-4 sm:px-6 lg:px-8 relative font-mono text-gray-300">
      <div className="bg-grid-pattern absolute inset-0 z-0 opacity-40 mix-blend-overlay"></div>
      <div className="scanline"></div>

      <div className="max-w-7xl mx-auto relative z-10 animate-fade-in">

        {/* Header */}
        <div className="mb-8 border-b border-dark-800 pb-6">
          <div className="inline-block px-3 py-1 bg-neon-purple/10 border border-neon-purple/30 text-neon-purple text-xs tracking-wider uppercase mb-4 shadow-[0_0_10px_rgba(191,90,242,0.1)]">
            Workspace Active
          </div>
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
            Prototype Generator
          </h1>
          <p className="text-gray-400 max-w-2xl text-sm leading-relaxed">
            INPUT_REQUIREMENTS &gt; DETECT_DOMAINS &gt; MERGE_PROMPTS &gt; COMPILE_PROTOTYPE
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">

          {/* Left Column */}
          <div className="lg:col-span-1 space-y-6">

            {/* Prompt Input */}
            <PromptInput
              onSubmit={handleSubmit}
              isLoading={isLoading}
              promptHistory={promptHistory}
              counters={counters}
              domainChanged={domainInfo.changed}
              oldDomain={domainInfo.oldDomain}
            />

            {/* Counters */}
            {(counters.totalPrompts > 0 || domainInfo.changed) && (
              <CounterDisplay
                totalPrompts={counters.totalPrompts}
                mergedPrompts={counters.mergedPrompts}
                domainChanged={domainInfo.changed}
                oldDomain={domainInfo.oldDomain}
                newDomain={domainInfo.current}
                changeLog={changeLog}
              />
            )}

            {/* History */}
            <HistoryList
              prompts={promptHistory}
              domainChanged={domainInfo.changed}
            />

            {/* Session History */}
            <SessionList
              sessionLog={sessionLog}
              activeSessionId={sessionId}
              onLoadSession={loadSession}
            />

            {/* Clear Button */}
            {counters.totalPrompts > 0 && (
              <button
                onClick={handleClear}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 text-gray-400 font-bold uppercase tracking-widest text-xs hover:bg-dark-800 hover:text-red-500 hover:border-red-500/50 transition-all border border-dark-600 font-mono"
              >
                <RefreshCw className="w-4 h-4" />
                $ rm -rf ./prototype
              </button>
            )}

          </div>

          {/* Right Column */}
          <div className="lg:col-span-2 space-y-6">

            {/* Generation Status */}
            <GenerationStatus stage={generationStage} />

            {/* Enhanced Prompt Banner */}
            <EnhancedPromptBanner
              originalPrompt={originalPrompt}
              enhancedPrompt={enhancedPrompt}
            />

            {/* Error */}
            {error && (
              <div className="bg-red-900/20 border border-red-500/30 p-4 font-mono">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-red-500 uppercase tracking-widest">PIPELINE_FAULT</p>
                    <p className="text-sm text-red-400 mt-1">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Empty State */}
            {!currentPrototype && !isLoading && !error && (
              <div className="glass-card p-12 text-center font-mono">

                <div className="w-20 h-20 bg-dark-800 border border-dark-600 flex items-center justify-center mx-auto mb-6">
                  <svg
                    className="w-10 h-10 text-neon-green/30"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                    />
                  </svg>
                </div>

                <h3 className="text-lg font-bold text-white mb-2 uppercase tracking-widest">
                  Awaiting Input
                </h3>

                <p className="text-gray-500 max-w-md mx-auto text-sm">
                  &gt; Enter system specifications in the left panel. Try:
                  "Build a meal-planning app for busy students"
                </p>

              </div>
            )}

            {/* Generate Code (Moved above Workflow Output for visibility) */}
            {currentPrototype?.content && (
              <GenerateCodeButton
                onGenerate={handleGenerateCode}
                hasPrototype={!!currentPrototype}
                disabled={isLoading}
                files={currentPrototype?.metadata?.files || []}
              />
            )}

            {/* Workflow Output */}
            {currentPrototype?.content && (
              <WorkflowOutput
                content={currentPrototype.content}
                metadata={currentPrototype.metadata}
                features={currentPrototype.features || []}
                pipelineSteps={currentPrototype.pipelineSteps || []}
              />
            )}



            {/* Code Output */}
            {currentPrototype?.metadata?.files?.length > 0 && (
              <CodeOutput
                files={currentPrototype.metadata.files}
                content={currentPrototype.content}
              />
            )}

          </div>
        </div>
      </div>

      {/* Domain Change Modal */}
      <DomainChangeModal
        isOpen={showDomainChangeModal}
        onClose={acknowledgeDomainChange}
        onStartNew={() => {
          acknowledgeDomainChange()
          clear()
        }}
        oldDomain={domainInfo.oldDomain}
        newDomain={domainInfo.current}
      />
    </div>
  )
}

export default PrototypeGenerator