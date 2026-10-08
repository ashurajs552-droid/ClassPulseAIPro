# 📋 VeriFace AI — Supabase & Vercel Deployment Checklist

This document guides you through setting up Supabase and deploying VeriFace AI to Vercel.

---

## 🛠️ Part 1: Supabase Database Setup

1. **Log in / Sign up**:
   Open [https://supabase.com](https://supabase.com) and create an account or sign in.

2. **Create a New Project**:
   - Click **New Project**.
   - Choose a project name (e.g. `veriface-ai-db`).
   - Set a secure database password.
   - Choose a region close to your users.
   - Click **Create new project** (takes ~1-2 minutes).

3. **Run the Database Schema**:
   - In the left sidebar, click the **SQL Editor** (icon `>_`).
   - Click **New Query**.
   - Open [`supabase-schema.sql`](file:///Users/blinks2780/.gemini/antigravity-ide/scratch/veriface-ai/supabase-schema.sql) in your project.
   - Copy the entire SQL content and paste it into the Supabase SQL Editor.
   - Click **Run** (or `Cmd+Enter`).
   - You should see `Success. No rows returned`.

4. **Retrieve API Credentials**:
   - In the left sidebar, click the **Project Settings** (gear icon) at the bottom.
   - Click **API**.
   - Under **Project URL**, copy your URL (e.g., `https://xyzabc.supabase.co`).
   - Under **Project API keys**, copy the `anon` `public` key.

---

## 🚀 Part 2: Connect Supabase in the Application

You can connect in either of two ways:

### Option A: Directly from the Web App UI (No Code Editing)
1. Open the app (`http://localhost:5173`).
2. Click the **Local Storage / Settings** button in the top navigation bar.
3. Paste your **Supabase URL** and **Anon Key**.
4. Click **Test Connection**. You will see:
   > `✓ Successfully connected to Supabase database!`
5. Click **Save Configuration**.
6. If you have already registered students or recorded attendance locally, click **Sync Local Data to Supabase** to upload them instantly!

### Option B: Using `.env` File
Create a `.env` file in the `veriface-ai` project directory:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

---

## 🌐 Part 3: Deploying to Vercel

### Method A: Connect with GitHub (Recommended)
1. Push your project to a GitHub repository:
   ```bash
   cd /Users/blinks2780/.gemini/antigravity-ide/scratch/veriface-ai
   git init
   git add .
   git commit -m "Initial VeriFace AI release"
   git remote add origin https://github.com/your-username/veriface-ai.git
   git push -u origin main
   ```
2. Log into [Vercel](https://vercel.com) and click **Add New** → **Project**.
3. Select your `veriface-ai` repository.
4. Framework Preset will automatically detect **Vite**.
5. Under **Environment Variables**, add:
   - Name: `VITE_SUPABASE_URL`, Value: `your-project-url`
   - Name: `VITE_SUPABASE_ANON_KEY`, Value: `your-anon-key`
6. Click **Deploy**!

### Method B: Deploying using Vercel CLI
```bash
cd /Users/blinks2780/.gemini/antigravity-ide/scratch/veriface-ai
npx vercel
```
Follow the terminal prompts:
- Set up and deploy: **Yes**
- Link to existing project: **No**
- Project name: `veriface-ai`
- Directory: `./`
- Modify default settings: **No**

---

## 🔒 Security & Camera Permissions Note for Vercel
- Modern browsers require **HTTPS** to allow webcam access (`navigator.mediaDevices.getUserMedia`).
- Vercel automatically provisions free SSL/TLS certificates (`https://your-app.vercel.app`), so camera access works seamlessly out of the box!
