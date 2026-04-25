import { useState, useRef } from 'react'
import { Code, Loader2, Download, Check, FileCode, X, Copy } from 'lucide-react'
import BuildProcessModal from './BuildProcessModal'

function GenerateCodeButton({ onGenerate, hasPrototype, disabled, files = [] }) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [generated, setGenerated] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [generatedFiles, setGeneratedFiles] = useState([])
  const [copiedFile, setCopiedFile] = useState(null)
  const [copiedAll, setCopiedAll] = useState(false)

  // Build animation state
  const [showBuildModal, setShowBuildModal] = useState(false)
  const buildPromiseRef = useRef(null)

  const handleClick = async () => {
    if (isGenerating || disabled || !hasPrototype) return

    setIsGenerating(true)

    // Create a promise that the build modal will track
    let resolvePromise
    const promise = new Promise((resolve) => { resolvePromise = resolve })
    buildPromiseRef.current = promise

    // Open the animated build overlay
    setShowBuildModal(true)

    try {
      const result = await onGenerate()

      // Signal to the build modal that the real work is done
      resolvePromise()

      if (result?.success) {
        setGenerated(true)

        // Store files from the result
        const filesFromResult = (result.data?.files || []).map(f => ({
          filename: f.filename || f.name || 'unnamed.txt',
          language: f.language || 'text',
          content: f.content || ''
        }))
        
        if (filesFromResult.length > 0) {
          setGeneratedFiles(filesFromResult)
        } else if (files && files.length > 0) {
          setGeneratedFiles(files.map(f => ({
            filename: f.filename || f.name || 'unnamed.txt',
            language: f.language || 'text',
            content: f.content || ''
          })))
        }

        setTimeout(() => setGenerated(false), 3000)
      } else {
        // Even on logical failure, resolve so the modal can close
      }
    } catch (error) {
      console.error('Generation failed:', error)
      resolvePromise() // let the animation finish gracefully
    } finally {
      setIsGenerating(false)
    }
  }

  const handleBuildComplete = () => {
    // Called when the build animation finishes
  }

  const handleBuildClose = () => {
    setShowBuildModal(false)
    // Now show the files modal if we have files
    if (generatedFiles.length > 0) {
      setShowModal(true)
    }
  }

  const handleDownloadZip = () => {
    const fileContents = generatedFiles.map(file => (
      `/* === ${file.filename} === */\n\n${file.content || ''}\n\n`
    )).join('\n')

    const blob = new Blob([fileContents], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `archive_build_${Date.now()}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleCopyFile = async (file) => {
    try {
      await navigator.clipboard.writeText(file.content || '')
      setCopiedFile(file.filename)
      setTimeout(() => setCopiedFile(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleCopyAll = async () => {
    try {
      const allContent = generatedFiles.map(file => (
        `/* ========== ${file.filename} ========== */\n\n${file.content || ''}\n\n`
      )).join('\n')

      await navigator.clipboard.writeText(allContent)
      setCopiedAll(true)
      setTimeout(() => setCopiedAll(false), 2000)
    } catch (err) {
      console.error('Failed to copy all:', err)
    }
  }

  const handleDownloadIndividual = (file) => {
    const blob = new Blob([file.content || ''], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = file.filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <div className="glass-card p-6 border-l-4 border-l-neon-green relative overflow-hidden group">
        <div className="absolute inset-0 bg-neon-green/5 group-hover:bg-neon-green/10 transition-colors"></div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 relative z-10">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-widest font-mono mb-2">Build Target Available</h3>
            <p className="text-sm text-gray-400 font-mono">
              {hasPrototype
                ? '> Run compiler to generate UI implementation payload.'
                : '> Awaiting valid workflow blueprint.'}
            </p>
          </div>

          <button
            onClick={handleClick}
            disabled={!hasPrototype || isGenerating || disabled}
            className={`w-full sm:w-auto min-h-[44px] flex items-center justify-center gap-2 px-8 py-4 font-bold uppercase tracking-widest text-xs transition-all border ${
              generated
                ? 'bg-neon-green text-dark-950 border-neon-green shadow-[0_0_20px_rgba(57,255,20,0.5)]'
                : 'bg-dark-950 text-neon-green border-neon-green hover:bg-neon-green hover:text-dark-950 hover:shadow-[0_0_30px_rgba(57,255,20,0.4)]'
            } disabled:opacity-30 disabled:border-dark-600 disabled:text-dark-500 disabled:bg-dark-950 disabled:hover:shadow-none disabled:cursor-not-allowed font-mono`}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Compiling...
              </>
            ) : generated ? (
              <>
                <Check className="w-4 h-4" />
                Done
              </>
            ) : (
              <>
                <Code className="w-4 h-4" />
                $ make build
              </>
            )}
          </button>
        </div>
      </div>

      {/* Build Process Animation Modal */}
      <BuildProcessModal
        isOpen={showBuildModal}
        realWorkPromise={buildPromiseRef.current}
        onComplete={handleBuildComplete}
        onClose={handleBuildClose}
      />

      {/* Files Modal */}
      {showModal && generatedFiles.length > 0 && (
        <div className="fixed inset-0 bg-dark-950/90 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-dark-900 border border-dark-600 shadow-[0_0_50px_rgba(57,255,20,0.1)] max-w-5xl w-full max-h-[85vh] overflow-hidden flex flex-col font-mono text-gray-300">
            {/* Modal Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0 px-4 sm:px-6 py-4 border-b border-dark-700 bg-dark-950">
              <div>
                <h3 className="text-sm font-bold text-neon-green uppercase tracking-widest">Compiler Result</h3>
                <p className="text-xs text-gray-500 mt-1">[{generatedFiles.length} ARTIFACTS MEMORY_MAPPED]</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="self-end sm:self-auto min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-red-900/40 hover:text-red-500 rounded-sm transition-colors text-gray-500 border border-transparent hover:border-red-500/50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-auto p-6 space-y-6 bg-dark-950/50 scrollbar-hide">
              {generatedFiles.map((file, index) => (
                <div key={index} className="border border-dark-700 bg-dark-900 overflow-hidden relative group">
                  {/* File Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0 px-4 py-3 bg-dark-950 border-b border-dark-800">
                    <div className="flex items-center gap-3">
                      <FileCode className="w-4 h-4 text-neon-green" />
                      <span className="font-bold text-gray-200 text-sm tracking-wide break-all">{file.filename}</span>
                      {file.language && (
                        <span className="text-[10px] px-2 py-0.5 border border-dark-600 text-gray-400 bg-dark-800 uppercase whitespace-nowrap hidden sm:inline-block">
                          {file.language}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button
                        onClick={() => handleCopyFile(file)}
                        className={`w-full sm:w-auto flex-1 min-h-[44px] sm:min-h-0 flex items-center justify-center text-xs px-4 py-1.5 font-bold uppercase transition-colors border ${
                          copiedFile === file.filename
                            ? 'bg-neon-green/20 text-neon-green border-neon-green/50'
                            : 'bg-dark-800 border-dark-600 text-gray-400 hover:text-neon-cyan hover:border-neon-cyan/50 hover:bg-neon-cyan/10'
                        }`}
                      >
                        {copiedFile === file.filename ? 'YANKED' : 'YANK'}
                      </button>
                      <button
                        onClick={() => handleDownloadIndividual(file)}
                        className="w-full sm:w-auto flex-1 min-h-[44px] sm:min-h-0 flex items-center justify-center text-xs px-4 py-1.5 font-bold uppercase transition-colors border text-gray-400 bg-dark-800 border-dark-600 hover:text-neon-purple hover:border-neon-purple/50 hover:bg-neon-purple/10 gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5" />
                        SAVE
                      </button>
                    </div>
                  </div>

                  {/* File Content Preview */}
                  <div className="p-4 overflow-auto max-h-60 relative group-hover:bg-dark-800/20 transition-colors">
                    <pre className="text-xs text-gray-400 font-mono whitespace-pre-wrap leading-relaxed">
                      {(file.content || '').substring(0, 800)}
                      {(file.content || '').length > 800 && '\n... [TRUNCATED_BUFFER]'}
                    </pre>
                  </div>
                </div>
              ))}
            </div>

            {/* Modal Footer */}
            <div className="px-4 sm:px-6 py-4 border-t border-dark-700 bg-dark-950 flex flex-col-reverse sm:flex-row justify-between items-center gap-4 sm:gap-0">
              <button
                onClick={() => setShowModal(false)}
                className="w-full sm:w-auto min-h-[44px] flex items-center justify-center px-6 py-2 border border-dark-600 text-gray-400 font-bold uppercase tracking-widest text-xs hover:text-white hover:border-gray-500 transition-colors"
              >
                Close
              </button>
              <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-3 items-center">
                <button
                  onClick={handleCopyAll}
                  className={`w-full sm:w-auto min-h-[44px] flex items-center justify-center px-6 py-2 font-bold uppercase tracking-widest text-xs transition-colors gap-2 border ${
                    copiedAll
                      ? 'bg-neon-green/20 text-neon-green border-neon-green/50'
                      : 'bg-dark-800 border-dark-600 text-gray-300 hover:text-neon-cyan hover:border-neon-cyan/50 hover:bg-neon-cyan/10'
                  }`}
                >
                  <Copy className="w-3.5 h-3.5" />
                  {copiedAll ? 'YANKED_ALL' : 'YANK_ALL'}
                </button>
                <button
                  onClick={handleDownloadZip}
                  className="w-full sm:w-auto min-h-[44px] flex items-center justify-center px-6 py-2 font-bold uppercase tracking-widest text-xs bg-neon-green text-dark-950 hover:bg-neon-green/80 transition-colors shadow-[0_0_15px_rgba(57,255,20,0.3)] gap-2 border border-neon-green"
                >
                  <Download className="w-3.5 h-3.5" />
                  SAVE _ALL
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default GenerateCodeButton
