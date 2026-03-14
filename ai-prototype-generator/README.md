# AI Prototype Generator

An AI-powered prototype generator for designers and non-technical founders. Describe your product idea in natural language, and get back a structured workflow, requirements, and even runnable code prototypes.

## Features

- **Natural Language to Prototype**: Describe your idea and get structured output
- **Domain-Aware Merging**: Same-domain prompts automatically merge; different-domain prompts start fresh
- **Two Generation Modes**:
  - **Workflow Only**: User flows, requirements, and acceptance criteria
  - **Workflow + Code**: Everything above plus HTML/CSS/JS or React code
- **Session Persistence**: Your work is preserved via session IDs stored in localStorage
- **Interactive File Management**: Download generated code as individual files or bundled text

## Architecture

```
ai-prototype-generator/
├── client/                 # React + Vite frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── context/        # React Context for state management
│   │   ├── pages/          # Page components
│   │   └── services/       # API client
│   └── ...
├── server/                 # Express + OpenAI backend
│   ├── src/
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic (LLM, domain detection, merging)
│   │   └── utils/          # Prompt templates
│   └── ...
└── package.json            # Root with concurrently for dev
```

## Tech Stack

**Frontend**:
- React 18 with Hooks
- Vite for fast development
- Tailwind CSS for styling
- Axios for API calls
- Lucide React for icons

**Backend**:
- Express.js
- OpenAI GPT-4o Mini for generation
- In-memory session storage (Map-based)
- CORS enabled for local development

## Prerequisites

- Node.js 18+ and npm
- OpenAI API key ([get one here](https://platform.openai.com/api-keys))

## Installation

### 1. Clone and Install Dependencies

```bash
cd ai-prototype-generator

# Install all dependencies (root + client + server)
npm run install:all
```

Or install manually:
```bash
# Root
npm install

# Client
cd client && npm install && cd ..

# Server
cd server && npm install && cd ..
```

### 2. Configure Environment Variables

**Server** (create `server/.env`):
```env
PORT=5000
NODE_ENV=development
OPENAI_API_KEY=your_openai_api_key_here
CORS_ORIGIN=http://localhost:5173
```

**Client** (create `client/.env`):
```env
VITE_API_URL=http://localhost:5000
```

Copy from the provided examples:
```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

Then edit `server/.env` to add your OpenAI API key.

### 3. Start Development Server

```bash
# From the root directory
npm run dev
```

This starts both:
- **Client** at http://localhost:5173 (Vite dev server)
- **Server** at http://localhost:5000 (Express API)

Or run individually:
```bash
npm run client   # Start frontend only
npm run server   # Start backend only
```

## Usage

1. **Open the app** at http://localhost:5173
2. **Enter your product idea** in the text box
   - Example: "Build a meal-planning app for busy students"
3. **Select mode**:
   - **Workflow Only**: Get user flows, requirements, and acceptance criteria
   - **Workflow + Code**: Also get runnable HTML/CSS/JS code
4. **Click Generate** to create your prototype
5. **Add more prompts** to refine:
   - Same domain: Automatically merges with current prototype
   - Different domain: Clears and starts fresh with notification
6. **Generate Code** (if in Workflow Only mode initially)
7. **Download files** individually or as a bundle

## API Endpoints

### POST `/api/prototype/generate`
Generate or merge a prototype.

**Request**:
```json
{
  "prompt": "Build a meal-planning app for students",
  "mode": "workflow",          // or "workflow+code"
  "sessionId": "optional-uuid" // omit to create new session
}
```

**Response**:
```json
{
  "success": true,
  "sessionId": "uuid-string",
  "domainChanged": false,
  "metadata": {
    "title": "Meal Planner",
    "domain": "food_delivery",
    "merged_prompt_count": 2,
    "total_prompt_count": 3,
    "change_log": [{"when": "2024-01-15T...", "note": "Added grocery export"}],
    "files": [{"filename": "App.jsx", "language": "jsx"}]
  },
  "content": {
    "workflow": "...",
    "requirements": [...],
    "layout": "...",
    "raw": {...}
  },
  "files": [{"filename": "...", "content": "...", "language": "..."}]
}
```

### POST `/api/prototype/code`
Generate code for existing prototype.

### POST `/api/prototype/clear`
Clear session and return new session ID.

### GET `/api/prototype/session/:sessionId`
Get current session state.

### GET `/api/health`
Health check endpoint.

## Domain Detection

The system uses keyword-based scoring to detect domains:

| Domain | Keywords |
|--------|----------|
| `food_delivery` | food, delivery, restaurant, order, meal, grocery |
| `ecommerce` | shop, store, product, cart, checkout, payment |
| `social_media` | social, post, feed, follow, like, comment, share |
| `finance` | bank, finance, money, transaction, budget, investment |
| `health_fitness` | health, fitness, workout, exercise, gym, medical |
| `education` | learn, course, student, teacher, class, lesson |
| `productivity` | task, todo, project, calendar, schedule |
| `entertainment` | game, video, movie, music, streaming |
| `travel` | travel, trip, booking, hotel, flight |
| `real_estate` | property, apartment, rent, lease, mortgage |

**Similarity threshold**: 0.3 (Jaccard similarity with domain keyword matching)

## Development

### Project Structure

```
client/src/
├── components/
│   ├── Counters/         # CounterDisplay.jsx
│   ├── History/            # HistoryList.jsx
│   ├── Layout/             # Header.jsx, Layout.jsx
│   ├── Output/             # CodeOutput.jsx, GenerateCodeButton.jsx, WorkflowOutput.jsx
│   └── PromptInput/        # PromptInput.jsx
├── context/
│   └── PrototypeContext.jsx  # Global state + localStorage persistence
├── pages/
│   ├── LandingPage.jsx
│   └── PrototypeGenerator.jsx
└── services/
    └── api.js              # API client functions

server/src/
├── routes/
│   └── prototype.js        # API routes
├── services/
│   ├── domainDetector.js   # Domain detection logic
│   ├── llmService.js       # OpenAI integration
│   └── promptMerger.js     # Session management & merging
├── utils/
│   └── promptTemplates.js  # SYSTEM_PROMPT and formatters
└── index.js                # Express app setup
```

### Adding New Features

**Domain Keywords**: Edit `server/src/services/domainDetector.js`

**System Prompt**: Modify `server/src/utils/promptTemplates.js`

**UI Components**: Add to `client/src/components/` and import in pages

## Troubleshooting

### "Cannot find module 'openai'"
```bash
cd server && npm install
```

### "OPENAI_API_KEY is not set"
- Copy `server/.env.example` to `server/.env`
- Add your API key to `server/.env`

### Port already in use
Change the port in `server/.env`:
```env
PORT=5001
```

And update `client/.env`:
```env
VITE_API_URL=http://localhost:5001
```

### CORS errors
Ensure `CORS_ORIGIN` in `server/.env` matches your client's URL (usually `http://localhost:5173` for Vite).

## License

MIT

## Contributing

This is a hackathon project. Feel free to fork and extend!

## Credits

Built with:
- [OpenAI](https://openai.com/) for GPT-4o Mini
- [React](https://react.dev/) for UI
- [Tailwind CSS](https://tailwindcss.com/) for styling
- [Express](https://expressjs.com/) for API
- [Vite](https://vitejs.dev/) for build tooling
