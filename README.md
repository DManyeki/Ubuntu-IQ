# MindCare Kenya 🇰🇪

**MindCare** is an evidence-based, culturally-adapted Progressive Web Application (PWA) designed to support Kenyan students (ages 18-22) during the high-stress waiting period for KCSE results. It combines immediate mental health support with standardized career guidance.

---

## 🚀 Key Features

### 1. 🧠 AI Companion (Chat)
*   **Model:** Powered by Google's **Gemini 2.5 Flash** for low-latency, empathetic responses.
*   **Cultural Adaptation:** Fluent in **English**, **Kiswahili**, and **Sheng** (Nairobi urban slang).
*   **Context-Aware:** The AI knows your assessment results. If you score high on Anxiety, it adapts its tone. If you match with Engineering, it provides specific advice for that field.
*   **Privacy:** Chat history is stored locally in the browser session.

### 2. 📋 RIASEC Career Assessment
*   **Scientific Basis:** Based on Dr. John Holland's RIASEC theory (Realistic, Investigative, Artistic, Social, Enterprising, Conventional).
*   **Format:** 24 questions with a "slider" interface for ease of use.
*   **Visualizations:** Interactive **Radar/Spider Chart** showing personality distribution.
*   **Kenya-Specific Database:** Matches personality types to local careers, emphasizing **TVET** (Technical and Vocational Education and Training) pathways alongside university degrees.
*   **Rich Results:** Includes salary ranges (KES), education requirements, and credible resource links (KUCCPS, HELB, TVETA).

### 3. 💓 Rapid Mood Scaler (IMS-12)
*   **Scientific Basis:** Adapted from the **Immediate Mood Scaler (IMS-12)**.
*   **Format:** 12-item visual slider test assessing **Depression** and **Anxiety** symptoms.
*   **Logic:** Uses a decision tree algorithm to determine:
    *   Dominant Symptom (Anxiety vs. Depression)
    *   Intensity (Mild, Moderate, Severe)
    *   Crisis Risk
*   **Visualization:** Interactive Gauge and Bar charts.
*   **Recommendation Engine:** Provides evidence-based interventions (CBT, ACT, Mindfulness) specific to the user's state (e.g., *4-7-8 Breathing* for Anxiety, *Behavioral Activation* for Depression).

### 4. 🚨 Crisis Intervention Protocol
*   **Always-On Safety:** A `CrisisBanner` is sticky at the top of the app.
*   **Automated Escalation:** If the Mood Scaler detects a score ≥ 4.5/6.0, the crisis banner automatically expands.
*   **Resources:** Direct, clickable links to **Befrienders Kenya (0722 178 177)** and **Kenya Red Cross (1199)**.

### 5. 💾 Session Persistence
*   **Tech:** Custom `useSessionStorage` hook.
*   **Behavior:** Users can refresh the page or switch tabs without losing their chat history, assessment progress, or test results. Data is cleared when the tab is closed for privacy.

---

## 🛠️ Technical Architecture

### Tech Stack
*   **Frontend Library:** React 19
*   **Build Tool:** Vite (implied environment)
*   **Language:** TypeScript
*   **Styling:** Tailwind CSS (Mobile-First Design)
*   **AI Integration:** `@google/genai` SDK
*   **Icons:** Lucide React

### Folder Structure
```
/
├── components/
│   ├── App.tsx             # Main Layout & Router Logic
│   ├── ChatInterface.tsx   # AI Chat w/ Markdown Rendering
│   ├── Assessment.tsx      # RIASEC Career Test Logic
│   ├── MoodAssessment.tsx  # IMS-12 Mood Test Logic
│   ├── RiasecChart.tsx     # SVG Radar Chart
│   ├── MoodChart.tsx       # SVG Gauge/Bar Chart
│   └── CrisisBanner.tsx    # Emergency Overlay
├── services/
│   ├── careerData.ts       # RIASEC Logic & Kenya Career DB
│   ├── moodData.ts         # IMS-12 Logic & Strategy Library
│   └── geminiService.ts    # AI API Configuration
├── hooks/
│   └── useSessionStorage.ts # State Persistence
├── types.ts                # TypeScript Interfaces
├── index.html              # Entry Point
└── index.tsx               # React Mount
```

---

## 🧪 Scientific Context

### Career Matching
The app uses a localized matching algorithm. Instead of generic global careers, it maps RIASEC codes to the Kenyan economic context:
*   **Realistic:** Engineering, Agriculture, Plumbing (TVET).
*   **Investigative:** Software Dev, Medicine.
*   **Enterprising:** Entrepreneurship (Hustle), Business Management.

### Mental Health Interventions
Strategies are drawn from:
*   **CBT (Cognitive Behavioral Therapy):** Cognitive Restructuring, Behavioral Activation.
*   **ACT (Acceptance and Commitment Therapy):** Cognitive Defusion.
*   **DBT (Dialectical Behavior Therapy):** Distress Tolerance (Cold Water Shock).
*   **Physiological:** Diaphragmatic Breathing (4-7-8).

---

## 📱 Mobile Optimization
*   **Touch Targets:** Sliders and buttons are sized for thumbs (44px+).
*   **Layout:** Uses `dvh` (Dynamic Viewport Height) to prevent layout shifts on mobile browsers with address bars.
*   **Sticky Elements:** Headers and Crisis Banners remain visible while scrolling.

---

## 🔒 Privacy & Security
*   **Client-Side Storage:** All sensitive data (mood scores, chat logs) is stored in `sessionStorage`.
*   **No PII:** The app does not request names, emails, or phone numbers.
*   **Ephemeral:** Data is wiped when the browser session ends.

---

## 🚀 Running Locally

1.  Clone the repository.
2.  Install dependencies (if package.json existed): `npm install`
3.  Set your Google Gemini API Key in the environment variables.
4.  Run the development server: `npm run dev`
