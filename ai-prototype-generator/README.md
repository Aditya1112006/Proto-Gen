# Proto-Gen

An AI-powered prototype generator for designers and non-technical founders. Describe your product idea in natural language, and get back a structured workflow, requirements, and highly responsive, production-ready code prototypes.

## ✨ Features

- **Google Gemini 2.0 Flash**: Blazing fast AI generation powered by Google's latest model.
- **Natural Language to Prototype**: Describe your idea and get structured output (Workflow, Architecture, Requirements).
- **Two Generation Modes**:
  - *Workflow Only*: User flows, requirements, and acceptance criteria.
  - *Workflow + Code*: Everything above plus fully runnable HTML/CSS/JS or React code.
- **Live Sandbox Preview**: Instantly preview generated code artifacts in a secure iframe sandbox.
- **Iterative Prompting**: Follow-up prompts merge intelligently with your current context to refine your app.
- **Terminal Aesthetic**: A custom, fully mobile-responsive "Dark Developer" UI featuring neon accents and glassmorphism.
- **Session Persistence**: Your active workflow is preserved via session IDs stored in localStorage.

## 🏗️ Architecture

```text
ai-prototype-generator/
├── client/                 # React 18 + Vite frontend (Tailwind CSS)
│   ├── src/
│   │   ├── components/     # Responsive UI components (Prompts, Nav, Modals)
│   │   ├── context/        # React Context for session management
│   │   ├── pages/          # Landing Page & Generator Workspace
│   │   └── services/       # API client config
├── server/                 # Express.js + Node.js backend
│   ├── src/
│   │   ├── routes/         # Prototype API endpoints
│   │   ├── services/       # Gemini LLM integration, feature extraction
│   │   └── utils/          # Prompts and heuristics
└── package.json            # Root workspace config
```

## 💻 Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Lucide React (Icons)
- **Backend**: Node.js, Express.js
- **AI Model**: `@google/genai` (Gemini 2.0 Flash)
- **Storage**: In-memory session tracking (or optional MongoDB)

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
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

Open `server/.env` and add your **Gemini API Key**:
```env
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.0-flash
```

### 3. Start the Application
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
4. **Iterate**: Don't like something? Don't start over. Just type "Make the buttons blue and larger" and hit Execute. Proto-Gen will intelligently merge the changes.
5. **Export**: Click the "Pull Artifacts" button to download a ZIP of your generated source code.

## 🚢 Deployment

**Backend (Render / Railway):**
1. Set the root directory to `server`.
2. Add Env Vars: `GEMINI_API_KEY`, `NODE_ENV=production`, and `CORS_ORIGIN=https://your-frontend.com`
3. Build command: `npm install`, Start command: `npm start`

**Frontend (Vercel / Netlify):**
1. Set the root directory to `client`.
2. Add Env Var: `VITE_API_URL=https://your-backend.com`
3. Build command: `npm run build`, Publish directory: `dist`

## 📜 License

MIT License - feel free to build upon this for your own hackathon projects!
