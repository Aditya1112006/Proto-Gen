import { useState } from 'react'
import { FileCode, Copy, Check, Download, Code2 } from 'lucide-react'

function CodeOutput({ files, content }) {
  const [activeFile, setActiveFile] = useState(0)
  const [copied, setCopied] = useState(false)

  if (!files || files.length === 0) {
    if (!content?.layout_plan) return null

    return (
      <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/30 border border-slate-100 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Code2 className="w-5 h-5 text-primary-500" />
          <h3 className="text-lg font-semibold text-slate-800">Code</h3>
        </div>
        <div className="bg-slate-50 rounded-xl p-6 text-center">
          <p className="text-slate-500">
            No code files generated yet. Switch to "Workflow + Code" mode to generate code.
          </p>
        </div>
      </div>
    )
  }

  const currentFile = files[activeFile]

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(currentFile.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const downloadFile = () => {
    const blob = new Blob([currentFile.content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = currentFile.name
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const downloadAll = () => {
    files.forEach((file) => {
      const blob = new Blob([file.content], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = file.name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    })
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/30 border border-slate-100 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Code2 className="w-5 h-5 text-primary-500" />
          <h3 className="text-lg font-semibold text-slate-800">Generated Code</h3>
        </div>
        <button
          onClick={downloadAll}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <Download className="w-4 h-4" />
          Download All
        </button>
      </div>

      {/* File Tabs */}
      {files.length > 1 && (
        <div className="flex border-b border-slate-100 overflow-x-auto">
          {files.map((file, index) => (
            <button
              key={index}
              onClick={() => {
                setActiveFile(index)
                setCopied(false)
              }}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                activeFile === index
                  ? 'bg-slate-50 text-primary-600 border-b-2 border-primary-500'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <FileCode className="w-4 h-4" />
              {file.name}
            </button>
          ))}
        </div>
      )}

      {/* Code Display */}
      <div className="relative">
        {/* Toolbar */}
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <button
            onClick={copyToClipboard}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-700 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy
              </>
            )}
          </button>
          <button
            onClick={downloadFile}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors"
          >
            <Download className="w-4 h-4" />
            Download
          </button>
        </div>

        {/* Code Block */}
        <pre className="p-6 pt-16 overflow-x-auto text-sm">
          <code>{currentFile.content}</code>
        </pre>
      </div>
    </div>
  )
}

export default CodeOutput
