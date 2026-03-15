function GenerationStatus({ stage }) {
  const steps = {
    detecting: "🧠 Detecting domain...",
    merging: "🔗 Merging prompts...",
    generating: "⚙️ Generating prototype...",
    complete: "✅ Prototype ready!",
    error: "❌ Generation failed"
  }

  if (!stage) return null

  return (
    <div
      style={{
        padding: "10px",
        borderRadius: "8px",
        background: "#f0f9ff",
        marginBottom: "10px",
        fontSize: "14px",
        fontWeight: 500,
        color: "#0369a1",
        display: "flex",
        alignItems: "center",
        gap: "8px"
      }}
    >
      {steps[stage] || stage}
    </div>
  )
}

export default GenerationStatus
