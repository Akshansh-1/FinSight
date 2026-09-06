# Financial Journal & Budget Tracker (FinSight)

A user-authenticated, AI-powered financial journaling application built with **React**, **Express**, **Google Gemini 3.6 Flash**, and **Cloud Firestore**.

Users log financial entries, expenses, or questions in any currency. Gemini provides structured analysis (categorization, amount extraction, overspend risk assessment, direct financial companion advice, and recurring expense detection). Exchange rates are automatically fetched and converted into the user's home currency using a free public FX rate API with zero API keys required. All data is isolated strictly to the authenticated user using owner-bound Firestore security rules.

---

## Architecture Overview

| Component | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend SPA** | React 19, Tailwind CSS, Lucide Icons | Responsive single-page interface with real-time Firestore listeners |
| **Full-Stack Proxy** | Express.js, TypeScript (`tsx` / `esbuild`) | Secure proxy ensuring `GEMINI_API_KEY` remains server-side |
| **User Identity** | Firebase Authentication (Google Sign-In) | Passwordless, federated authentication |
| **Backend Database** | Cloud Firestore | Owner-isolated document persistence for interactions and recurring budgets |
| **AI Processing Engine** | Gemini 3.6 Flash via `@google/genai` | Natural language parsing, category identification, risk assessment, and budget suggestions |
| **FX Conversion** | Free Open Exchange Rate API + Local Cache | Multi-currency normalization into user's home currency |
| **Secret Management** | Google Cloud Secret Manager / Environment Variables | Zero-hardcoding credential hygiene |

---

## Agentic Threat Model & Security Architecture

### The 5 Threat Zones & OWASP Countermeasure Matrix

| Threat Zone | Potential Risk Scenario | OWASP Mapping | Implemented Countermeasure |
| :--- | :--- | :--- | :--- |
| **1. Input Surfaces** | Malicious user text in free-text journal aiming to trigger prompt injection or NoSQL injection | LLM01 / A03 | Defensive null-safe deserialization, delimiter wrapping (`"""`), treating input strictly as data |
| **2. Planning & Reasoning** | Prompt injection attempting to alter financial advice or produce arbitrary JSON | LLM02 / LLM07 | Strict Gemini response schema enforcement (`responseSchema`), structured server parsing |
| **3. Tool Execution** | SSRF or dynamic code execution via external FX rate service | A10 (SSRF) | Vetted public endpoint with strict timeout controller and embedded fallback rate matrix |
| **4. Memory & State** | Cross-user data leaks, session tampering, or unauthorized document reads | A01 (Broken Access Control) | Owner-bound Firestore security rules (`request.auth.uid == userId`), strict undefined-stripping |
| **5. Inter-System Communication**| Leaking `GEMINI_API_KEY` to client browser inspection | A02 (Cryptographic Failures) | All Gemini API calls executed exclusively on Express server; key never prefixed with `VITE_` |

---

## Prerequisites & Environment Setup

1. **Google Cloud SDK (`gcloud` CLI)** installed and authenticated:
   ```bash
   gcloud auth login
   gcloud config set project YOUR_PROJECT_ID
   ```

2. **Enable Required Google Cloud APIs**:
   ```bash
   gcloud services enable \
     run.googleapis.com \
     secretmanager.googleapis.com \
     firestore.googleapis.com \
     cloudbuild.googleapis.com \
     identitytoolkit.googleapis.com \
     oauth2.googleapis.com
   ```

3. **Node.js Environment**:
   - Node.js 20+ installed locally.

---

## Secret Management Configuration

Store `GEMINI_API_KEY` in Google Cloud Secret Manager to eliminate any hardcoded credentials.

```bash
# 1. Create and populate the secret
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"
echo -n "YOUR_ACTUAL_GEMINI_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# 2. Grant the default Cloud Run service account access to read the secret
PROJECT_NUMBER=$(gcloud projects describe YOUR_PROJECT_ID --format="value(projectNumber)")

gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## Cloud Firestore Security Rules

Deploy the owner-bound security rules to ensure user data isolation:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // User data is strictly isolated to the authenticated owner
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      match /{document=**} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

Deploy the rules via Firebase CLI or AI Studio tool:
```bash
firebase deploy --only firestore:rules
```

---

## Local Development

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment Variables**:
   Create a `.env` file in the root directory:
   ```env
   GEMINI_API_KEY="your-gemini-api-key"
   NODE_ENV="development"
   ```

3. **Start the Unified Server (Express + Vite)**:
   ```bash
   npm run dev
   ```
   The application runs on `http://localhost:3000`.

---

## Deployment to Google Cloud Run

Deploy directly using the Cloud Run container workflow:

```bash
# 1. Build and deploy container to Cloud Run with Secret Manager binding
gcloud run deploy financial-journal-app \
  --source=. \
  --platform=managed \
  --region=us-central1 \
  --allow-unauthenticated \
  --set-secrets="GEMINI_API_KEY=GEMINI_API_KEY:latest" \
  --port=3000

# 2. Apply mandatory campaign verification label
gcloud run services update financial-journal-app \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region=us-central1
```

---

## Comprehensive Functional Walkthrough & Test Guide

Every interaction can be verified systematically:

### Test Case 1: Google Authentication & Owner Session
1. Navigate to the root URL.
2. Verify that the **Landing Page** appears with the **"Sign In with Google"** button and zero financial data is exposed.
3. Click **"Sign In with Google"**.
4. Complete Google authentication.
5. Confirm transition to private dashboard showing your user avatar and home currency selector.

### Test Case 2: Multi-Currency Journaling & Live FX Conversion
1. In the journal input box, enter a foreign currency expense:
   `"Paid €45 for dinner at an upscale Italian bistro with coworkers"`
2. Click **"Analyze & Record Entry"**.
3. Verify that:
   - Status changes to **"Analyzing & Persisting..."**
   - The analysis card displays Category **"Food & Dining"**, original amount **€45.00**, and converted amount in your selected home currency (e.g. `$48.91 USD`).
   - Assessment flag shows **"On Track"** or **"Overspend Risk"**.
   - Gemini companion advice is displayed in a direct, warm tone.
   - The entry is immediately rendered in the **Journal & Analysis History** list.

### Test Case 3: Recurring Expense Detection & Explicit User Confirmation
1. In the journal input, enter a recurring subscription:
   `"Subscribed to Spotify Family plan for $16.99/month"`
2. Click **"Analyze & Record Entry"**.
3. Verify that:
   - The **"Recurring Detected"** badge appears.
   - A distinct prompt box appears: **"Suggested Recurring Budget Line: Spotify Family plan • $16.99 / monthly"**.
   - Note that **no budget line is saved automatically**.
4. Click the explicit button **"Confirm & Add Budget Line"**.
5. Verify that the budget line is immediately saved to Firestore and appears under **Recurring Budgets & Subscriptions** with an active progress bar.

### Test Case 4: Manual Recurring Budget Creation
1. In the Recurring Budgets card, click **"New Budget Line"**.
2. Enter label: `"Grocery Cap"`, amount: `400`, currency: `USD`, frequency: `Monthly`, category: `Food & Dining`.
3. Click **"Save Budget Line"**.
4. Verify the modal closes and the new budget line card appears with current monthly grocery spend tracked against the $400 cap.

### Test Case 5: Dashboard Aggregation & Category Spend Chart
1. Log an additional entry in another category (e.g., `"Spent $65 on fuel at Chevron station"`).
2. Check the top metric **"Spend This Month"**; confirm it accurately sums converted amounts.
3. Verify the **"Spend by Category"** chart shows proportional colored bars for **Food & Dining** and **Transportation**.

### Test Case 6: History Filtering & Search
1. In the History section, type `"Spotify"` into the search box.
2. Confirm the list immediately filters to only matching entries.
3. Change the Flag dropdown to `"Overspend Risk"` and verify only flagged entries appear.

### Test Case 7: Entry & Budget Deletion
1. In the History list, click the trash can icon on a test entry and confirm deletion.
2. Verify the entry is removed from Firestore and the list.
3. In Recurring Budgets, click the trash icon on a budget line; confirm deletion.

### Test Case 8: Sign Out & Session Teardown
1. Click the Sign Out icon in the top right navbar.
2. Confirm you are cleanly returned to the Landing Page and private dashboard state is cleared.

### Test Case 9: Multi-Turn Mindful Financial Sage (AI Advisor)
1. In the dashboard, click the tab **"Mindful Financial Sage (AI Advisor)"**.
2. Click one of the quick starter chips, such as `"Where are my biggest expense leaks based on my logs?"` or type a custom question:
   `"How can I cut $100 without feeling deprived?"`
3. Click **"Ask"**.
4. Verify that:
   - Gemini responds with personalized advice grounded in your actual logged entries and active budgets.
   - Click **"Save Insight"** on the response.
   - Confirm a green **"Saved to Journal"** indicator appears and the takeaway is persisted directly to your Firestore journal interactions (`users/{userId}/interactions`).

### Test Case 10: AI Financial Health Digest & Vault Export
1. In the navbar or tab area, click **"AI Digest"** / **"Generate AI Health Digest"**.
2. Click **"Synthesize Financial Digest"**.
3. Verify that:
   - A multi-metric scorecard appears showing **Mindfulness Score (0-100)**, **Needs vs Wants Ratio**, **Net Cashflow**, and an executive summary.
   - Review the **14-Day Mindful Action Plan**.
   - Click **"Export Vault (JSON)"** and **"Export (Markdown)"**; verify that your complete, isolated financial history downloads as an offline backup file.
