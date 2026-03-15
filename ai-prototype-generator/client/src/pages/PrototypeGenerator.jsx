import { useState } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { usePrototypeContext } from '../context/PrototypeContext'
import PromptInput from '../components/PromptInput/PromptInput'
import HistoryList from '../components/History/HistoryList'
import CounterDisplay from '../components/Counters/CounterDisplay'
import WorkflowOutput from '../components/Output/WorkflowOutput'
import CodeOutput from '../components/Output/CodeOutput'
import GenerateCodeButton from '../components/Output/GenerateCodeButton'
import GenerationStatus from '../components/GenerationStatus'

function PrototypeGenerator() {

  const [mode, setMode] = useState('workflow')

  const {
    isLoading,
    error,
    currentPrototype,
    promptHistory,
    counters,
    domainInfo,
    changeLog,
    generationStage,
    generate,
    generateCodeForPrototype,
    clear
  } = usePrototypeContext()

  const handleSubmit = async (prompt) => {
    if (!prompt) return
    await generate(prompt, mode)
  }

  const handleGenerateCode = async () => {
    await generateCodeForPrototype()
  }

  const handleClear = async () => {
    await clear()
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Prototype Generator
          </h1>
          <p className="text-slate-600">
            Describe your product idea. We'll detect domains, merge related prompts, and generate a prototype.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">

          {/* Left Column */}
          <div className="lg:col-span-1 space-y-6">

            {/* Prompt Input */}
            <PromptInput
              onSubmit={handleSubmit}
              isLoading={isLoading}
              mode={mode}
              setMode={setMode}
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

            {/* Clear Button */}
            {counters.totalPrompts > 0 && (
              <button
                onClick={handleClear}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 text-slate-600 font-medium rounded-xl hover:bg-slate-100 transition-colors border border-slate-200"
              >
                <RefreshCw className="w-4 h-4" />
                Start New Prototype
              </button>
            )}

          </div>

          {/* Right Column */}
          <div className="lg:col-span-2 space-y-6">

            {/* Generation Status */}
            <GenerationStatus stage={generationStage} />

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-800">Error</p>
                    <p className="text-sm text-red-600 mt-1">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Empty State */}
            {!currentPrototype && !isLoading && !error && (
              <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/30 border border-slate-100 p-12 text-center">

                <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <svg
                    className="w-10 h-10 text-slate-400"
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

                <h3 className="text-xl font-semibold text-slate-800 mb-2">
                  Ready to Generate
                </h3>

                <p className="text-slate-500 max-w-md mx-auto">
                  Enter your product idea in the text box on the left. Try:
                  "Build a meal-planning app for busy students"
                </p>

              </div>
            )}

            {/* Workflow Output */}
            {currentPrototype?.content && (
              <WorkflowOutput
                content={currentPrototype.content}
                metadata={currentPrototype.metadata}
              />
            )}

            {/* Generate Code */}
            {currentPrototype?.content && mode === 'workflow' && (
              <GenerateCodeButton
                onGenerate={handleGenerateCode}
                hasPrototype={!!currentPrototype}
                disabled={isLoading}
                files={currentPrototype?.metadata?.files || []}
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
    </div>
  )
}

export default PrototypeGenerator