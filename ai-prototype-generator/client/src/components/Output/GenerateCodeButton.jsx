import { useState } from 'react'
import { Code, Loader2, Download, Check, FileCode, X } from 'lucide-react'

function GenerateCodeButton({ onGenerate, hasPrototype, disabled, files = [] }) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [generated, setGenerated] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [generatedFiles, setGeneratedFiles] = useState([])
  const [copiedFile, setCopiedFile] = useState(null)

  const handleClick = async () => {
    if (isGenerating || disabled || !hasPrototype) return

    setIsGenerating(true)
    try {
      const result = await onGenerate()
      setGenerated(true)

      // Store files from the result
      if (result?.data?.files && result.data.files.length > 0) {
        setGeneratedFiles(result.data.files)
        setShowModal(true)
      } else if (files && files.length > 0) {
        setGeneratedFiles(files)
        setShowModal(true)
      }

      setTimeout(() => setGenerated(false), 3000)
    } catch (error) {
      console.error('Generation failed:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDownloadZip = () => {
    // Create a simple zip-like download by creating a blob with file contents
    const fileContents = generatedFiles.map(file => (
      `=== ${file.filename} ===\n\n${file.content || ''}\n\n`
    )).join('\n')

    const blob = new Blob([fileContents], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `prototype-files-${Date.now()}.txt`
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
      <div className="bg-gradient-to-br from-primary-50 to-primary-100/50 rounded-2xl shadow-lg shadow-primary-100/50 border border-primary-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-800 mb-1">Ready to Generate Code?</h3>
            <p className="text-sm text-slate-600">
              {hasPrototype
                ? 'Generate a working code prototype based on your requirements.'
                : 'Enter a prompt first to generate a prototype.'}
            </p>
          </div>

          <button
            onClick={handleClick}
            disabled={!hasPrototype || isGenerating || disabled}
            className={`flex items-center justify-center gap-2 px-6 py-3 font-medium rounded-xl transition-all shadow-lg ${
              generated
                ? 'bg-emerald-500 text-white shadow-emerald-500/30'
                : 'bg-primary-600 text-white shadow-primary-600/30 hover:bg-primary-700 hover:shadow-primary-600/40'
            } disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none`}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating...
              </>
            ) : generated ? (
              <>
                <Check className="w-5 h-5" />
                Generated!
              </>
            ) : (
              <>
                <Code className="w-5 h-5" />
                Generate Code
              </>
            )}
          </button>
        </div>
      </div>

      {/* Files Modal */}
      {showModal && generatedFiles.length > 0 && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div>
                <h3 className="text-lg font-semibold text-slate-800">Generated Files</h3>
                <p className="text-sm text-slate-500">{generatedFiles.length} file{generatedFiles.length > 1 ? 's' : ''} ready to download</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-auto p-6 space-y-4">
              {generatedFiles.map((file, index) => (
                <div key={index} className="border border-slate-200 rounded-xl overflow-hidden">
                  {/* File Header */}
                  <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <FileCode className="w-4 h-4 text-slate-500" />
                      <span className="font-medium text-slate-700">{file.filename}</span>
                      {file.language && (
                        <span className="text-xs px-2 py-0.5 bg-slate-200 text-slate-600 rounded-full">
                          {file.language}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCopyFile(file)}
                        className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                          copiedFile === file.filename
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {copiedFile === file.filename ? 'Copied!' : 'Copy'}
                      </button>
                      <button
                        onClick={() => handleDownloadIndividual(file)}
                        className="text-xs px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-1"
                      >
                        <Download className="w-3 h-3" />
                        Download
                      </button>
                    </div>
                  </div>

                  {/* File Content Preview */}
                  <div className="p-4 bg-slate-50 overflow-auto max-h-48">
                    <pre className="text-xs text-slate-600 font-mono whitespace-pre-wrap">
                      {(file.content || '').substring(0, 500)}
                      {(file.content || '').length > 500 && '...'}
                    </pre>
                  </div>
                </div>
              ))}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-slate-600 font-medium hover:text-slate-800 transition-colors"
              >
                Close
              </button>
              <button
                onClick={handleDownloadZip}
                className="px-4 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download All
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default GenerateCodeButton
