# ⚡ VeriFace AI — High-Precision Face Recognition & Real-Time Emotion Attendance System

> A next-generation, biometric facial recognition and real-time emotion telemetry system with automated attendance marking, Supabase cloud sync, and 100% Vercel deployment readiness.

---

## 🌟 Key Features

### 1. 🎯 Near-100% Biometric Recognition Accuracy
- **Multi-Angle 3D Biometric Enrollment**: Rather than relying on a single static photograph, students enroll with a 3-stage guided facial capture (Frontal Neutral, Natural Expression/Smile, and 15° Angle Tilt).
- **Multi-Descriptor Clustering**: Enrolled students store multiple 128-dimensional L2-normalized feature vectors. The AI `FaceMatcher` matches incoming camera frames against the closest cluster sample.
- **SSD MobileNet v1 Neural Engine**: Deep learning architecture with 68 facial landmark detection and ResNet-34 embeddings for high accuracy. High-speed TinyFace detector also available.
- **Continuous Temporal Verification Lock**: Avoids camera flicker and false triggers by requiring consistent identity verification over a stable lock window (~1 second) before marking attendance.
- **Adjustable Strictness Calibration**: Slider in the UI lets administrators fine-tune Euclidean distance sensitivity (from `0.40` ultra-strict to `0.58` relaxed).

### 2. 🎭 Real-Time Emotion Telemetry & Classroom Mood Radar
- Real-time classification of **7 facial emotions**: Neutral (Focused), Happy, Surprised, Sad, Angry, Fearful, and Disgusted.
- Floating HUD pills displaying dominant emotion, animated emoji, and probability percentage above each detected face.
- **Live Classroom Radar**: Real-time attentiveness and engagement gauge with visual emotion distribution bars.
- Emotion at the instant of attendance confirmation is stamped and permanently recorded in the database.

### 3. ⚡ Zero-Touch Automated Attendance
- Automatically stamps attendance once a student is locked in.
- Plays synthesized ascending bell chimes (via Web Audio API) with celebratory confetti.
- Prevents duplicate marks for the same student on the same day.
- Live attendance feed updating in real time.

### 4. 🗄️ Supabase Cloud Database + Offline Fallback
- Dual-mode architecture: Works 100% out of the box with local storage/IndexedDB, and seamlessly connects to Supabase Cloud.
- One-click **Sync to Supabase** button to push any offline records to the cloud.
- Includes pre-configured `supabase-schema.sql` with zero-error RLS policies.

### 5. 🚀 Vercel Ready
- Bundled offline neural weights in `/public/models/` (zero dependence on external CDN availability or CORS).
- Pre-configured `vercel.json` with SPA routing rewrites and model caching headers.

---

## 🚀 Quick Start Guide

### 1. Run Locally
```bash
# Navigate to project directory
cd /Users/blinks2780/.gemini/antigravity-ide/scratch/veriface-ai

# Start the development server
npm run dev
```
Open **`http://localhost:5173`** in your browser.

---

## ☁️ Supabase Setup (3 Minutes)

1. Go to [Supabase](https://supabase.com) and create a free project.
2. In your Supabase dashboard, navigate to **SQL Editor** → **New Query**.
3. Copy and paste the contents of [`supabase-schema.sql`](./supabase-schema.sql) and click **Run**.
4. Navigate to **Project Settings** → **API**.
5. Copy your **Project URL** and **anon public Key**.
6. In the VeriFace AI web app, click **Local Storage / Settings** in the top right:
   - Paste your **Supabase URL** and **Anon Key**.
   - Click **Test Connection**, then **Save Configuration**.
   - (Optional) Click **Sync Local Data to Supabase** to transfer any students you enrolled locally.

Alternatively, create a `.env` file in the project root:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

---

## 🚀 Deploying to Vercel

### Method 1: Via Vercel CLI
```bash
# Install Vercel CLI (if not installed)
npm install -g vercel

# Deploy
vercel
```

### Method 2: Via GitHub & Vercel Dashboard
1. Push this directory to your GitHub repository.
2. Go to [Vercel](https://vercel.com) → **Add New Project** → Import your repository.
3. In **Environment Variables**, add:
   - `VITE_SUPABASE_URL`: Your Supabase URL
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase Anon Key
4. Click **Deploy**.

The `vercel.json` file is already pre-configured to handle SPA routes and serve AI model weights properly.

---

## 📁 Project Architecture

```
veriface-ai/
├── public/
│   ├── favicon.svg             # Cyber biometric SVG icon
│   └── models/                 # Bundled neural weights (SSD MobileNet, Landmarks, Recognition, Expressions)
├── src/
│   ├── components/
│   │   ├── Navbar.jsx          # Top cyber-glass bar with tabs & cloud status
│   │   ├── LiveScanner.jsx     # Webcam HUD, emotion radar, and auto-attendance
│   │   ├── StudentEnrollment.jsx # 3D multi-angle biometric registration & directory
│   │   ├── AttendanceLogs.jsx  # Logs table, date filters, analytics & CSV export
│   │   └── SettingsModal.jsx   # Supabase cloud config & AI model calibration
│   ├── services/
│   │   ├── faceEngine.js       # Face-api detection, descriptors & emotion analysis
│   │   ├── supabaseClient.js   # Dynamic Supabase client & connection validator
│   │   └── storageService.js   # Dual-mode Supabase/Local storage repository
│   ├── utils/
│   │   └── audio.js            # Web Audio API synthesizer for feedback chimes
│   ├── App.jsx                 # App root & state coordinator
│   ├── index.css               # Cyber-Vision design system & glassmorphism tokens
│   └── main.jsx
├── supabase-schema.sql         # Supabase database table definitions & RLS policies
├── vercel.json                 # Vercel deployment configuration
└── package.json
```
