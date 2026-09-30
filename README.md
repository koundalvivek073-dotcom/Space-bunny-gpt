# 🐰 Space Bunny GPT

A high-performance, precision AI assistant featuring interactive 3D WebGL spatial dynamics, voice synthesis controls, and 100% private local storage.

🌐 **Live Demo:** [https://mint-gpt.netlify.app](https://mint-gpt.netlify.app)

---

## ✨ Features

- 🧠 **Multi-Model Intelligence**: Powered by **Space Bunny Alpha** with high-speed reasoning, alongside DeepSeek R1, GPT-4o, Claude 3.5 Sonnet, and Llama 3.3 via OpenRouter.
- 🌌 **Interactive 3D WebGL Background**: Immersive spatial particles and geometric field built with Three.js that responds in real-time to user scrolling and AI generation.
- 🎙️ **Voice Output & Audio Controls**: Integrated Text-to-Speech playback with interactive toggle and one-click instant Stop controls.
- 🔒 **100% Private & Local Storage**: All conversation history, search indexes, and custom settings remain securely stored on the client side via browser `localStorage`—no database required.
- 📝 **Rich Markdown & Code Rendering**: Full GitHub Flavored Markdown support with code highlighting, one-click copy, and safe external link handling (`target="_blank"`).
- 🌓 **Adaptive Light & Dark Modes**: Carefully tailored high-contrast themes for comfortable readability in any lighting environment.
- 🔍 **Instant Chat Search**: Fast real-time search across all conversations, prompt titles, and message histories.
- 📤 **Export Capabilities**: Download chats anytime as formatted Markdown (`.md`) or structured JSON files.

---

## 🛠️ Tech Stack

- **Frontend**: [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Vite](https://vitejs.dev/), [Tailwind CSS v4](https://tailwindcss.com/)
- **3D Graphics**: [Three.js](https://threejs.org/)
- **Icons & UI**: [Lucide React](https://lucide.dev/), [Motion](https://motion.dev/)
- **Markdown & Security**: [Marked](https://marked.js.org/), [DOMPurify](https://github.com/cure53/DOMPurify)
- **Backend / Proxy**: [Express](https://expressjs.com/), [Node.js](https://nodejs.org/)

---

## 🚀 Quick Start

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- `npm` or `bun`

### 2. Clone the Repository
```bash
git clone https://github.com/koundalvivek073-dotcom/Space-bunny-gpt.git
cd Space-bunny-gpt
```

### 3. Install Dependencies
```bash
npm install --legacy-peer-deps
```

### 4. Configure Environment Variables
Create a `.env` file in the root directory:
```env
OPENROUTER_API_KEY="sk-or-v1-your-openrouter-api-key"
```
*(Optional: add `GEMINI_API_KEY` if utilizing Gemini voice TTS utilities)*

### 5. Run the Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📦 Build for Production

```bash
# Build the production bundle
npm run build

# Start the production server
npm start
```

---

## 📄 License
This project is open source and available under the [MIT License](LICENSE).
