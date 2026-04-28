# Proto-Gen

An AI-powered prototype generator for designers and non-technical founders. Describe your product idea in natural language, and get back a structured workflow, requirements, and highly responsive, production-ready code prototypes.

## ✨ Features

- **Google Gemini 3.1 Flash Lite**: Blazing fast AI generation powered by Google's latest preview model, with robust fallback chains to Gemini 3 Flash and 2.5 Flash.
- **AI Prompt Enhancer**: Automatically expands brief, rough user ideas into detailed UI/UX specifications using Gemini, acting like an elite Product Manager to ensure comprehensive prototypes.
- **RAG Knowledge Retrieval**: Grounds AI responses in curated UI/UX knowledge via a MongoDB vector similarity search for superior, standard-compliant designs.
- **Incremental Updates**: Follow-up prompts act as delta changes, intelligently modifying only the requested elements without regenerating the entire prototype from scratch.
- **Natural Language to Prototype**: Describe your idea and get structured output (Workflow, Architecture, Requirements).
- **Two Generation Modes**:
  - *Workflow Only*: User flows, requirements, and acceptance criteria.
  - *Workflow + Code*: Everything above plus fully runnable HTML/CSS/JS or React code.
- **Live Sandbox Preview**: Instantly preview generated code artifacts in a secure iframe sandbox.
- **Terminal Aesthetic & UX**: A custom, fully mobile-responsive "Dark Developer" UI featuring neon accents, glassmorphism, and a sticky build status navigation that persists while you scroll.

## 🏗️ Architecture

```text
ai-prototype-generator/
├── client/                 # React 18 + Vite frontend (Tailwind CSS)
│   ├── src/
│   │   ├── components/     # UI Components (Prompts, Modals, Output, Layout)
│   │   ├── context/        # React Context for session & auth management
│   │   ├── hooks/          # Custom React hooks (useAuth, usePrototype)
│   │   ├── pages/          # Application views (Landing, Generator, Auth)
│   │   ├── services/       # API clients and data fetching logic
│   │   ├── state/          # Global state management (Zustand/Preview state)
│   │   └── utils/          # Formatting and helper utilities
├── server/                 # Express.js + Node.js backend
│   ├── src/
│   │   ├── config/         # Database and environment configurations
│   │   ├── middleware/     # Auth and rate-limiting middleware
│   │   ├── models/         # Mongoose schemas (Session, User, KnowledgeChunk)
│   │   ├── routes/         # Express API endpoints
│   │   ├── scripts/        # Seeding and maintenance scripts
│   │   ├── services/       # Gemini LLM, RAG, Prompt Enhancer, Domain Detector
│   │   └── utils/          # LLM prompt templates and heuristics
└── package.json            # Root workspace config
```

## 💻 Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Lucide React (Icons)
- **Backend**: Node.js, Express.js
- **AI Model**: `@google/genai` (Gemini 3.1 Flash Lite Preview & Gemini 3 Flash)
- **Storage**: MongoDB (Mongoose) for RAG knowledge base, user data, and session tracking

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- MongoDB instance (local or Atlas)
- Go to [Google AI Studio](https://aistudio.google.com/) and get a free Gemini API key.

### 1. Install Dependencies
```bash
git clone <your-repo>
cd ai-prototype-generator

# Install root, client, and server dependencies
npm run install:all
```

### 2. Configure Environment Variables
Copy the specific configuration files:
```bash
cp .env.example server/.env
cp client/.env.example client/.env
```

Open `server/.env` and add your **Gemini API Key** and **MongoDB URI**:
```env
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-3.1-flash-lite-preview
MONGODB_URI=mongodb://localhost:27017/ai-prototype-generator
```

### 3. Seed Knowledge Base
To enable the RAG Knowledge Retrieval feature, seed the initial knowledge base:
```bash
cd server
npm run seed
cd ..
```

### 4. Start the Application
```bash
# Run both frontend and backend concurrently
npm run dev
```
- Client runs at: `http://localhost:5173`
- Server runs at: `http://localhost:5001`

---

## 📖 Usage

1. **Visit the Workspace**: Go to `http://localhost:5173` and click "Enter Workspace".
2. **Describe Your App**: Type a detailed prompt (e.g., *"Build a responsive e-commerce dashboard with a dark mode toggle"*).
3. **Choose a Mode**: Select **Workflow Only** to plan, or **Workflow + Code** to get instant HTML/CSS output.
4. **Iterate**: Don't like something? Don't start over. Just type "Make the buttons blue and larger" and hit Execute. Proto-Gen will apply delta changes incrementally using its prompt enhancer.
5. **Export**: Click the "Pull Artifacts" button to compile and download your generated source code.

## 🚢 Deployment

**Backend (Render / Railway):**
1. Set the root directory to `server`.
2. Add Env Vars: `GEMINI_API_KEY`, `MONGODB_URI`, `NODE_ENV=production`, and `CORS_ORIGIN=https://your-frontend.com`
3. Build command: `npm install`, Start command: `npm start`

**Frontend (Vercel / Netlify):**
1. Set the root directory to `client`.
2. Add Env Var: `VITE_API_URL=https://your-backend.com`
3. Build command: `npm run build`, Publish directory: `dist`

## 📜 License

MIT License - feel free to build upon this for your own hackathon projects!
