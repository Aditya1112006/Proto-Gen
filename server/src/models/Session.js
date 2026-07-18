import mongoose from 'mongoose';

const sessionSchema = mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    // Optional: linked to a registered user. Null means guest session.
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    domain: {
      type: String,
      default: null,
    },
    title: {
      type: String,
      default: null,
    },
    prompts: [
      {
        text: String,
        timestamp: String,
        domain: String,
      },
    ],
    mergedPromptCount: {
      type: Number,
      default: 0,
    },
    totalPromptCount: {
      type: Number,
      default: 0,
    },
    mergedRequirements: {
      functional: [String],
      non_functional: [String],
    },
    canonicalRequirements: [String],
    changeLog: [
      {
        when: String,
        note: String,
      },
    ],
    lastOutput: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const Session = mongoose.model('Session', sessionSchema);

export default Session;
