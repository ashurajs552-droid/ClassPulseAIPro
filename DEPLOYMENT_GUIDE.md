# 🚀 ClassPulseAIPro — Vercel Deployment & Supabase Guide

This comprehensive guide will walk you through deploying **ClassPulseAIPro** to **Vercel** in less than 3 minutes, connecting your live Supabase database, and setting up Google OAuth for production.

---

## ⚡ Quick 1-Minute Deployment via Vercel Dashboard

Since your code is already pushed to GitHub at **[https://github.com/ashurajs552-droid/ClassPulseAIPro.git](https://github.com/ashurajs552-droid/ClassPulseAIPro.git)**, deploying to Vercel requires just a few clicks:

### Step 1: Import Project to Vercel
1. Go to [https://vercel.com](https://vercel.com) and log in (or sign up with GitHub).
2. On your Vercel Dashboard, click **"Add New..."** (top right) → Select **"Project"**.
3. Under **"Import Git Repository"**, find and select **`ClassPulseAIPro`** (or paste `https://github.com/ashurajs552-droid/ClassPulseAIPro`).
4. Click **"Import"**.

---

### Step 2: Configure Project Settings
Vercel automatically detects the framework via `vercel.json`:
* **Framework Preset**: `Vite` (auto-detected)
* **Root Directory**: `./` (default)
* **Build Command**: `npm run build` (auto-detected)
* **Output Directory**: `dist` (auto-detected)

---



### Step 4: Click Deploy!
1. Click **"Deploy"**.
2. Vercel will bundle the application and deploy within ~45 seconds.
3. You will receive a live production URL:
   `https://class-pulse-ai-pro.vercel.app` (or similar custom sub-domain).

---

## 💻 Alternative: Deploying via Vercel CLI (Terminal)

You can also deploy directly from your local terminal using the Vercel CLI:

```bash
cd /Users/blinks2780/.gemini/antigravity-ide/scratch/veriface-ai
npx vercel
```

Follow the interactive prompts:
* **Set up and deploy?**: `y`
* **Which scope?**: Press `Enter` (select your Vercel account)
* **Link to existing project?**: `N`
* **Project name**: `classpulse-ai-pro`
* **In which directory is your code located?**: `./`
* **Want to modify settings?**: `N`

To deploy straight to production:
```bash
npx vercel --prod
```

---

## 🔑 Crucial Post-Deployment Steps (Supabase & Google Auth)

Once your live Vercel URL is generated (e.g. `https://class-pulse-ai-pro.vercel.app`), complete these two quick settings:

### 1. Enable Instant Email Login in Supabase (No Confirmation Required)
By default, Supabase requires users to click an email verification link before logging in, which triggers `Email not confirmed`.
To enable instant password logins:
1. Open your [Supabase Project Dashboard](https://supabase.com/dashboard/project/your-project-id).
2. Go to **Authentication** (left sidebar) → **Providers** → Click on **Email**.
3. Toggle **OFF** **"Confirm email"**.
4. Click **Save**.

---

### 2. Update Supabase URL Configuration for Vercel
To ensure OAuth and redirect links point to your live Vercel app:
1. In your Supabase Dashboard, go to **Authentication** → **URL Configuration**.
2. Set **Site URL** to your Vercel production URL:
   ```text
   https://class-pulse-ai-pro.vercel.app
   ```
3. Under **Redirect URLs**, add:
   ```text
   https://class-pulse-ai-pro.vercel.app/**
   http://localhost:5173/**
   ```
4. Click **Save**.

---

### 3. Connect Google OAuth
1. Go to the [Google Cloud Console Credentials Page](https://console.cloud.google.com/apis/credentials).
2. Create an **OAuth 2.0 Client ID** (Type: **Web application**).
3. Under **Authorized Javascript Origins**, add:
   ```text
   https://class-pulse-ai-pro.vercel.app
   https://your-project-id.supabase.co
   ```
4. Under **Authorized redirect URIs**, add:
   ```text
   https://your-project-id.supabase.co/auth/v1/callback
   ```
5. In your Supabase Dashboard, go to **Authentication** → **Providers** → **Google**:
   - Toggle **Enable Google provider** to **ON**.
   - Paste your **Client ID** and **Client Secret**.
   - Click **Save**.

---

## 🛡️ Camera & HTTPS Permissions on Vercel
* All modern browsers (Chrome, Safari, Firefox, Edge) require a secure **HTTPS** context to allow webcam access (`navigator.mediaDevices.getUserMedia`).
* Vercel automatically equips all deployments with free, auto-renewing SSL/TLS certificates, so the camera scanner and distraction vision work seamlessly on desktop and mobile.

---

## 📦 What Makes This Build Vercel-Ready?
* **Zero External Model CDN Dependencies**: Neural weights for TinyFace, SSD MobileNet, 68 Landmark mesh, and 128D embeddings are bundled locally in `/public/models/`.
* **SPA Routing**: `vercel.json` contains route rewrites so direct navigation and refreshes on `/` never return 404.
* **Aggressive Model Caching**: `vercel.json` sets `Cache-Control: public, max-age=31536000, immutable` for neural weights, ensuring instantaneous model loading after the first visit.
