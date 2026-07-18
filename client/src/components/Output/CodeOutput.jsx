import { useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { FileCode, Copy, Check, Download, Code2, Monitor, Maximize2, Minimize2, Archive } from 'lucide-react'

function CodeOutput({ files, content, sessionId }) {
  const [activeTab, setActiveTab] = useState('preview') // 'preview' or file index
  const [copied, setCopied] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [exportToast, setExportToast] = useState(null)

  // ── Dead Anchor Guardian ──────────────────────────────────────────────────
  // Injected into every iframe. Intercepts clicks on anchor tags or buttons
  // that reference a #section which doesn't exist in the generated HTML.
  // Instead of navigating to a blank page, it shows a friendly in-page toast.
  const DEAD_ANCHOR_GUARDIAN = `
<script id="__proto_gen_guardian__">
(function() {
  function showGuardianToast(label) {
    var existing = document.getElementById('__pg_toast__');
    if (existing) existing.remove();
    var toast = document.createElement('div');
    toast.id = '__pg_toast__';
    toast.style.cssText = [
      'position:fixed','bottom:24px','right:24px','z-index:99999',
      'background:#1a1a2e','color:#fff','border:1px solid rgba(191,90,242,0.5)',
      'border-radius:8px','padding:14px 20px','font-family:monospace',
      'font-size:13px','max-width:320px','box-shadow:0 4px 24px rgba(0,0,0,0.5)',
      'display:flex','gap:12px','align-items:center','animation:pgSlideIn 0.3s ease'
    ].join(';');
    toast.innerHTML =
      '<span style="font-size:18px">⚠️</span>' +
      '<div>' +
        '<div style="font-weight:700;color:#bf5af2;margin-bottom:2px">Section not generated</div>' +
        '<div style="color:#aaa;font-size:11px">"' + label + '" was referenced but its content section was not included in this build. Refine your prompt to add it.</div>' +
      '</div>';
    var style = document.createElement('style');
    style.textContent = '@keyframes pgSlideIn{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}';
    document.head.appendChild(style);
    document.body.appendChild(toast);
    setTimeout(function(){ if(toast.parentNode) toast.parentNode.removeChild(toast); }, 4500);
  }

  function trySmartScroll(hash) {
    var target = document.querySelector(hash);
    if (target) { target.scrollIntoView({ behavior: 'smooth', block: 'start' }); return true; }
    // Fuzzy: strip leading # and try partial ID/class match
    var key = hash.replace('#','').toLowerCase();
    var all = document.querySelectorAll('[id],[data-section]');
    for (var i = 0; i < all.length; i++) {
      var id = (all[i].id || all[i].dataset.section || '').toLowerCase();
      if (id && (id.includes(key) || key.includes(id))) {
        all[i].scrollIntoView({ behavior: 'smooth', block: 'start' }); return true;
      }
    }
    return false;
  }

  document.addEventListener('click', function(e) {
    var el = e.target.closest('a, button, [onclick], [data-target], [data-section-target]');
    if (!el) return;

    // Case 1: anchor with href="#something"
    if (el.tagName === 'A') {
      var href = el.getAttribute('href') || '';
      if (href.startsWith('#') && href.length > 1) {
        var found = trySmartScroll(href);
        if (!found) {
          e.preventDefault();
          e.stopPropagation();
          showGuardianToast(el.textContent.trim() || href.replace('#',''));
        }
        return;
      }
      // Blank external links that try to navigate away
      if (href === '#' || href === '' || href === 'javascript:void(0)') {
        e.preventDefault();
      }
    }

    // Case 2: button or element with onclick that calls showSection/navigateTo/etc.
    // We DON'T intercept these — the app's own JS should handle them.
    // But we listen for the page going blank AFTER a short delay.
  }, true);

  // Blank-page detector: if body becomes empty or near-empty after any click, restore
  var lastBodyLen = 0;
  setInterval(function() {
    var len = (document.body.innerText || '').trim().length;
    if (lastBodyLen > 100 && len < 20) {
      showGuardianToast('This section');
    }
    lastBodyLen = len;
  }, 600);
})();
</script>`

  // Build the merged HTML document for the iframe preview
  const previewSrcDoc = useMemo(() => {
    if (!files || files.length === 0) return ''

    const htmlFile = files.find(f => (f.name || f.filename || '').endsWith('.html'))
    const cssFile = files.find(f => (f.name || f.filename || '').endsWith('.css'))
    const jsFile = files.find(f => (f.name || f.filename || '').endsWith('.js'))

    if (!htmlFile) return '<html><body style="background:#0a0a0f;color:#39ff14;font-family:monospace;padding:20px;"><p>[SYS_ERR] No HTML root found in build artifact.</p></body></html>'

    let html = htmlFile.content || ''

    // Inject CSS inline
    if (cssFile?.content) {
      const styleTag = `<style>\n${cssFile.content}\n</style>`
      html = html.replace(/<link[^>]*href=["']styles\.css["'][^>]*\/?>/gi, '')
      html = html.replace(/<link[^>]*href=["']style\.css["'][^>]*\/?>/gi, '')
      if (html.includes('</head>')) {
        html = html.replace('</head>', `${styleTag}\n</head>`)
      } else {
        html = `${styleTag}\n${html}`
      }
    }

    // Inject JS inline
    if (jsFile?.content) {
      const scriptTag = `<script>\n${jsFile.content}\n</script>`
      html = html.replace(/<script[^>]*src=["']app\.js["'][^>]*><\/script>/gi, '')
      html = html.replace(/<script[^>]*src=["']script\.js["'][^>]*><\/script>/gi, '')
      if (html.includes('</body>')) {
        html = html.replace('</body>', `${scriptTag}\n</body>`)
      } else {
        html = `${html}\n${scriptTag}`
      }
    }

    // Inject the Dead Anchor Guardian as the VERY FIRST script in <head>
    // so it runs before any app JS and can intercept all navigation.
    if (html.includes('<head>')) {
      html = html.replace('<head>', `<head>\n${DEAD_ANCHOR_GUARDIAN}`)
    } else if (html.includes('<html>')) {
      html = html.replace('<html>', `<html>\n${DEAD_ANCHOR_GUARDIAN}`)
    } else {
      html = `${DEAD_ANCHOR_GUARDIAN}\n${html}`
    }

    return html
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files])

  if (!files || files.length === 0) {
    if (!content?.layout_plan) return null

    return (
      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-4 border-b border-dark-700 pb-2">
          <Code2 className="w-5 h-5 text-neon-green" />
          <h3 className="text-sm font-bold text-white uppercase tracking-widest font-mono">Source Code</h3>
        </div>
        <div className="bg-dark-950 border border-dark-800 p-6 text-center">
          <p className="text-gray-500 font-mono text-sm">
            &gt; Awaiting flag `--emit=code` or switch to "Workflow + Code" mode.
          </p>
        </div>
      </div>
    )
  }

  const currentFile = typeof activeTab === 'number' ? files[activeTab] : null

  const copyToClipboard = async () => {
    if (!currentFile) return
    try {
      await navigator.clipboard.writeText(currentFile.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const downloadFile = () => {
    if (!currentFile) return
    const blob = new Blob([currentFile.content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = currentFile.name || currentFile.filename || 'file.txt'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  /**
   * Export all generated files as a server-built ZIP archive.
   * We call the backend /api/export/zip endpoint which uses 'archiver' to
   * bundle files properly, then trigger a browser download of the blob.
   *
   * Fallback: if no sessionId is available (e.g. older session format),
   * we fall back to downloading files individually.
   */
  const exportAsZipArchive = async () => {
    if (isExporting) return

    if (!sessionId) {
      // Legacy fallback — individual file downloads
      files.forEach((file) => {
        const blob = new Blob([file.content], { type: 'text/plain' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = file.name || file.filename || 'file.txt'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      })
      return
    }

    try {
      setIsExporting(true)
      setExportToast(null)

      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5001'
      const response = await fetch(`${apiBase}/api/export/zip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err?.error?.message || `Export failed (${response.status})`)
      }

      // Stream the response blob and trigger a browser file download.
      const zipBlob = await response.blob()
      const downloadUrl = URL.createObjectURL(zipBlob)
      const anchor = document.createElement('a')
      anchor.href = downloadUrl
      anchor.download = `proto-gen-export.zip`
      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)
      URL.revokeObjectURL(downloadUrl)

      setExportToast({ type: 'success', message: 'ZIP exported successfully!' })
    } catch (err) {
      console.error('[CodeOutput] ZIP export error:', err)
      setExportToast({ type: 'error', message: err.message || 'Export failed' })
    } finally {
      setIsExporting(false)
      setTimeout(() => setExportToast(null), 4000)
    }
  }

  const containerClass = isFullscreen
    ? 'fixed inset-0 z-[9999] bg-dark-950 flex flex-col font-mono'
    : 'glass-card overflow-hidden font-mono text-sm'

  const contentToRender = (
    <div className={containerClass}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0 px-4 sm:px-6 py-4 border-b border-dark-700 bg-dark-900/80">
        <div className="flex items-center gap-2">
          <Code2 className="w-5 h-5 text-neon-green" />
          <h3 className="text-sm font-bold text-white uppercase tracking-widest">Compiler Output</h3>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1 min-h-[44px] sm:min-h-0 px-3 py-1.5 text-xs font-bold text-gray-400 hover:text-neon-cyan hover:bg-neon-cyan/10 border border-transparent hover:border-neon-cyan/50 rounded-sm transition-colors uppercase tracking-widest"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Preview'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button
            id="zip-export-btn"
            onClick={exportAsZipArchive}
            disabled={isExporting}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 min-h-[44px] sm:min-h-0 px-3 py-1.5 text-xs font-bold text-dark-950 bg-neon-green hover:bg-neon-green/80 disabled:opacity-50 disabled:cursor-wait rounded-sm transition-colors uppercase tracking-widest"
          >
            {isExporting ? (
              <>
                <div className="w-4 h-4 border-2 border-dark-950/30 border-t-dark-950 rounded-full animate-spin" />
                Packing...
              </>
            ) : (
              <>
                <Archive className="w-4 h-4" />
                Export .zip
              </>
            )}
          </button>
        </div>
      </div>

      {/* Export toast notification */}
      {exportToast && (
        <div className={`px-4 py-2 text-xs font-mono font-bold flex items-center gap-2 ${
          exportToast.type === 'success'
            ? 'bg-neon-green/10 border-b border-neon-green/30 text-neon-green'
            : 'bg-red-900/20 border-b border-red-500/30 text-red-400'
        }`}>
          {exportToast.type === 'success' ? '✓' : '✗'} {exportToast.message}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-dark-800 overflow-x-auto bg-dark-950/50 scrollbar-hide">
        {/* Live Preview Tab */}
        <button
          onClick={() => { setActiveTab('preview'); setCopied(false) }}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold uppercase tracking-widest whitespace-nowrap transition-colors ${
            activeTab === 'preview'
              ? 'bg-neon-cyan/10 text-neon-cyan border-b-2 border-neon-cyan'
              : 'text-gray-500 hover:text-gray-300 hover:bg-dark-800 border-b-2 border-transparent'
          }`}
        >
          <Monitor className="w-4 h-4" />
          Live_Render
        </button>

        {/* Divider */}
        <div className="w-px bg-dark-800 my-2 mx-1" />

        {/* File Tabs */}
        {files.map((file, index) => (
          <button
            key={index}
            onClick={() => { setActiveTab(index); setCopied(false) }}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold whitespace-nowrap transition-colors ${
              activeTab === index
                ? 'bg-neon-green/5 text-neon-green border-b-2 border-neon-green'
                : 'text-gray-500 hover:text-gray-300 hover:bg-dark-800 border-b-2 border-transparent'
            }`}
          >
            <FileCode className="w-4 h-4" />
            {file.name || file.filename || `blob_${index}.txt`}
          </button>
        ))}
      </div>

      {/* Content Area */}
      {activeTab === 'preview' ? (
        /* ─── Live Preview Iframe ─── */
        <div className={`bg-white ${isFullscreen ? 'flex-1 overflow-hidden' : ''} relative`}>
          <iframe
            srcDoc={previewSrcDoc}
            title="Live Code Preview"
            sandbox="allow-scripts allow-modals"
            className={`w-full border-0 bg-white ${isFullscreen ? 'h-full' : ''}`}
            style={{ minHeight: isFullscreen ? '100%' : '600px' }}
          />
        </div>
      ) : (
        /* ─── Code Editor View ─── */
        <div className="relative bg-dark-950 min-h-[500px]">
          {/* Toolbar */}
          <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
            <button
              onClick={copyToClipboard}
              className="flex items-center gap-2 px-3 py-1.5 bg-dark-800/80 border border-dark-600 text-gray-300 text-xs font-bold uppercase tracking-widest rounded-sm hover:border-neon-green hover:text-neon-green transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  YANKED
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  YANK
                </>
              )}
            </button>
            <button
              onClick={downloadFile}
              className="flex items-center gap-2 px-3 py-1.5 bg-dark-800/80 border border-dark-600 text-gray-300 text-xs font-bold uppercase tracking-widest rounded-sm hover:border-neon-cyan hover:text-neon-cyan transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              SAVE
            </button>
          </div>

          {/* Code Block */}
          <pre className="p-6 pt-16 text-sm text-gray-300 font-mono h-full overflow-auto whitespace-pre-wrap break-words leading-relaxed">
            <code>{currentFile?.content}</code>
          </pre>
        </div>
      )}
    </div>
  )

  if (isFullscreen) {
    return createPortal(contentToRender, document.body)
  }

  return contentToRender
}

export default CodeOutput
