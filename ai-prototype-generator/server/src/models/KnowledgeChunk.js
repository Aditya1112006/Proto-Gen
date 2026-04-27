import mongoose from 'mongoose';

/**
 * KnowledgeChunk — a unit of UI/design knowledge stored in the Vector DB.
 *
 * Each document holds:
 *   - text      : the raw human-readable content (template, pattern, guideline)
 *   - embedding : 768-dimensional vector from Gemini text-embedding-004
 *   - category  : "template" | "pattern" | "guideline" | "component"
 *   - tags      : keyword tags for lightweight filtering
 *
 * MongoDB Atlas Vector Search index (create manually once — see README):
 *   Index name : "vector_index"
 *   Field      : embedding  (768 dims, cosine similarity)
 */
const knowledgeChunkSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    text: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      enum: ['template', 'pattern', 'guideline', 'component', 'layout'],
      default: 'template',
    },
    tags: {
      type: [String],
      default: [],
    },
    // 768-dimensional vector from text-embedding-004
    embedding: {
      type: [Number],
      required: true,
    },
  },
  {
    timestamps: true,
    collection: 'knowledge_chunks',
  }
);

// Standard text index for fallback keyword search
knowledgeChunkSchema.index({ title: 'text', text: 'text', tags: 'text' });

const KnowledgeChunk = mongoose.model('KnowledgeChunk', knowledgeChunkSchema);

export default KnowledgeChunk;
