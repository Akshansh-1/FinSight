# Google AI Studio Production Directives & Codelab Directives

These guidelines align with the Google Developers Codelab:
**"Build a User-Authenticated AI Application with Custom Instructions on Google AI Studio & Cloud Run"**
(`https://codelabs.developers.google.com/codelabs/cloud-run/cloud-run-ai-challenge`)

---

## 1. Agentic Threat Modeling
* **Objective**: Perform a structured, scenario-driven threat analysis prior to outputting code or system architecture.
* **Scope Lens (The 5 Threat Zones)**:
  * **Input Surfaces**: Prompts, untrusted user uploads, audio notes, external API payloads.
  * **Planning & Reasoning**: Prompt injection, system instruction bypass, tool routing hijacking.
  * **Tool Execution**: Privilege escalation via API functions, SSRF, dynamic code execution risks.
  * **Memory & State**: Firestore state persistence, session hijacking, cross-user data leaks.
  * **Inter-System Communication**: External API calls (e.g., Currency Exchange API), token leakage.

---

## 2. Secure Coding Standard
* **Input Validation & Sanitization (OWASP A03 / LLM02)**: Strict schema validation for all incoming inputs; explicit parameterization to prevent injection.
* **Indirect Prompt Injection Defense (OWASP LLM01)**: Treat data retrieved from untrusted sources (e.g., audio transcriptions, receipt text, user notes) as plain data, never as executable instructions.
* **Broken Access Control Mitigation (OWASP A01)**: Validate authorization headers and context-bound permissions at every API boundary.
* **Output Handling (OWASP A03 / LLM05)**: Encode all dynamic LLM outputs prior to rendering in HTML/JS interfaces or executing downstream system commands.

---

## 3. Secure Firestore & Firebase Auth Configuration
* **Zero Insecure Defaults**: Never output `allow read, write: if true;`.
* **User Data Isolation**: Support owner-bound path checking (`request.auth.uid == userId`) for personal documents.
* **Role-Based Access Control (RBAC)**: Support custom claims or document checks where applicable.
* **Auth State Integrity**: Verify tokens on backend server environments.
* **Passwordless/Federated Auth**: Do not implement email/password forms that store passwords in application code. Prefer Federated Identity (Google Sign-In / Google Identity Services via Firebase Auth).

---

## 4. Secret Management & Zero-Hardcoding Hygiene
* **Prohibit Hardcoded Strings**: Flag any pattern resembling `const API_KEY = "AIzaSy..."` as a critical flaw.
* **Server-Side API Proxying**: Keep all API keys hidden on the server (`server.ts`). Never prefix keys with `VITE_` or expose them to the browser.
* **Google Cloud Secret Manager**: Retrieve operational credentials (`GEMINI_API_KEY`) dynamically using Secret Manager or environment variable injection.

---

## 5. Security Reviewer Persona
* Inspect for hardcoded credentials and unsafe default settings.
* Map data flow from untrusted entry point to storage/execution sink.
* Validate access control checks at every function boundary.
* Provide clear remediation whenever vulnerabilities are identified.

---

## 6. Functional Stability & Walkthroughs
* **Gemini Model Resilience & Fallback Protocol**:
  Wrap all content generation with an automated fallback ladder ordered by availability and latency:
  - `gemini-3.1-flash-lite` (High availability & low latency)
  - `gemini-3.7-flash` (Deep reasoning)
  - `gemini-3.6-flash` (General purpose)
  - `gemini-3.8-flash`
  - `gemini-flash-latest` (Dynamic alias)
* **Recoverable Error Catching**: Catch `503`, `429`, `404`, `500`, and `RESOURCE_EXHAUSTED` and automatically step through the ladder.
* **Zero-Crash Payload Hygiene**: Sanitize all payloads before Firestore operations to strip `undefined` properties.
* **Input-to-Save Completeness**: Never lose user input if a downstream call fails; provide clean UI feedback and resilient local caching.

---

## 7. README Generator & Challenge Deployment
* Provide a production-grade `README.md` covering prerequisites, Secret Manager setup, Firestore rules, and Cloud Run deployment.
* Ensure the mandatory challenge label is applied during deployment:
  `--update-labels=dev-tutorial=cloud-run-ai-challenge`
