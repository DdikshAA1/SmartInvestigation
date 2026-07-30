# 🛡️ Vanguard AI: Smart Policing & Investigation Platform

[![Vite](https://img.shields.io/badge/Vite-B736FF?style=flat&logo=vite&logoColor=white)](#)
[![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)](#)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](#)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat&logo=tailwind-css&logoColor=white)](#)
[![Express](https://img.shields.io/badge/Express.js-000000?style=flat&logo=express&logoColor=white)](#)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=flat&logo=postgresql&logoColor=white)](#)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle_ORM-C5F74F?style=flat&logo=drizzle&logoColor=black)](#)

Vanguard AI is a state-of-the-art, next-generation **Smart Policing & Investigation Platform** designed to revolutionize public safety intake, crime analysis, and suspect tracking. Powered by a 3-tiered AI agent (OpenAI GPT-4o, Gemini 1.5 Flash, and a Local Fallback NLP Engine), the platform acts as an automated, empathetic intake officer capable of processing, classifying, and reporting incidents dynamically in over 10+ regional and global languages (including Hindi, Hinglish, Bengali, Tamil, Telugu, and more).

---

## 🌟 Core Features

### 💬 1. Multilingual Confidential AI Intake (Chatbot)
- **Automatic Language & Script Mirroring**: Dynamically detects scripts (Devanagari, Tamil, Bengali, Telugu, Gujarati, Gurmukhi, etc.) or Romanized dialects (Hinglish) and responds in the exact dialect used by the victim.
- **3-Tier AI Resilience**:
  1. **Tier 1 (OpenAI GPT-4o)**: Deep semantic understanding and natural dialogue flow.
  2. **Tier 2 (Gemini 1.5 Flash)**: High-speed, backup generative reasoning.
  3. **Tier 3 (Local NLP Script Engine)**: Rule-based, fully stateful fallback system mapping dynamic warnings, openings, and follow-up questions to prevent repetitions.
- **Categorization & Action Plans**: Detects and advises on critical scenarios:
  - **Financial Cyber Fraud**: Golden Hour freeze guidelines, National Cyber Helpline **1930**, and card/UPI block alerts.
  - **Cyberstalking & Blackmail**: Extortion prevention protocols, Women Helpline **1091**, and digital evidence protection.
  - **Lost/Stolen Mobile Phones**: Govt CEIR portal (`ceir.gov.in`) IMEI blocking steps.
  - **Physical Danger / Emergencies**: Direct integration for National Emergency **112**.
- **Real-Time Notification System**: Triggers instant email alerts (configured via Nodemailer SMTP to `dikshar1123@gmail.com`) for critical threat levels.

### 📊 2. Smart Investigation Dashboard
- **Geographic Crime Hotspots**: Interactive map layout plotting risk indices across municipal sectors.
- **Crime Trend Analytics**: Dynamic chart visualizations parsing month-on-month crime pattern shifts.
- **Suspect Management & OSINT Profiler**: Risk-scoring mechanism with social-media network connection visualization and target reports.
- **Confidential Intake Feed**: Live complaints and critical alerts stream matching keywords to assist supervisor review.

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Monorepo Manager** | PNPM Workspaces |
| **Frontend** | React 19, TypeScript, Tailwind CSS, Vite, Radix UI, Lucide Icons, Leaflet Maps, Recharts |
| **Backend API** | Node.js 24, Express 5, TypeScript |
| **Database & ORM** | PostgreSQL, Electric SQL PGlite (Serverless-optimized fallback), Drizzle ORM |
| **AI Processing** | OpenAI SDK, Google Gen AI SDK |
| **Alert Notifications** | Nodemailer (SMTP/Ethereal Mock) |

---

## 📂 Project Structure

```
Smart-Policing-AI/
├── api/                             # Serverless API deployment entry point
├── artifacts/
│   ├── api-server/                  # Express backend & database setup
│   │   ├── src/
│   │   │   ├── routes/              # Routes for chat, suspects, alerts, cases
│   │   │   └── index.ts
│   │   └── package.json
│   ├── investigation-dashboard/     # React + Vite frontend panel
│   │   ├── src/
│   │   │   ├── components/          # UI elements
│   │   │   ├── pages/               # Dashboard pages (Alerts, Suspects, OSINT)
│   │   │   └── App.tsx
│   │   └── package.json
│   └── mockup-sandbox/              # Mock sandboxes for fast prototyping
├── lib/
│   └── db/                          # Database connection schema and seeds
└── package.json                     # Root pnpm workspaces configuration
```

---

## 🚀 Setup & Execution

### 1. Prerequisites
Ensure you have **Node.js v24+** and **pnpm** installed globally:
```bash
npm install -g pnpm
```

### 2. Installation
Clone the repository and install workspace dependencies:
```bash
git clone https://github.com/DdikshAA1/SmartInvestigation.git
cd Smart-Policing-AI
pnpm install
```

### 3. Environment Variables
Create a `.env` file in the root workspace or in `artifacts/api-server/`:
```env
OPENAI_API_KEY=your_openai_api_key
GEMINI_API_KEY=your_gemini_api_key
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_alert_email@gmail.com
SMTP_PASS=your_email_password
```

### 4. Running Locally

Start both the backend server and frontend dashboard concurrently:

*   **Start Backend API** (Port `5000`):
    ```bash
    pnpm --filter @workspace/api-server run dev
    ```
*   **Start Frontend Panel** (Port `3000`):
    ```bash
    pnpm --filter @workspace/investigation-dashboard run dev
    ```

---

## 🏗️ Building & Validating

- **Run Full Typecheck**:
  ```bash
  pnpm run typecheck
  ```
- **Build Production Bundles**:
  ```bash
  pnpm run build
  ```

---

## 🛡️ License
Distributed under the MIT License. See `LICENSE` for more information.
