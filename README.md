# Mini Apty - Digital Adoption Platform (DAP)

Mini Apty is a production-grade Digital Adoption Platform (DAP) consisting of an isolated Chrome Manifest V3 extension and a secure Node.js + Express + MySQL + Sequelize backend managed in a `pnpm` workspaces monorepo.

---

## 1. Project Architecture

The monorepo uses a strict TypeScript workspaces structure to share schemas and data contracts:
* **/packages/shared**: Shared interfaces, trigger action type definitions, and Zod validation schemas (`WalkthroughCreateSchema`, `WalkthroughStepCreateSchema`, `LoginSchema`, etc.).
* **/packages/backend**: REST APIs built with Express, Sequelize models (User, Walkthrough, WalkthroughStep), and token/resource ownership middlewares.
* **/packages/extension**: Manifest V3 extension featuring a React popup control panel, background Service Worker agent, content script recorder, and isolated React overlay rendering engine.

---

## 2. Manifest V3 Service Worker & State Management

### State Persistence Design & Trade-offs
Because MV3 background Service Workers are ephemeral and terminate during inactivity, **in-memory global variables are not preserved**.
* **Decision**: All active session states (`recordingState`, `previewState`, and authentication `token`) are strictly stored in `chrome.storage.local`.
* **Subdomain Hops Resilience**: Large sites (like Amazon) redirect between `www.` and non-www subdomains. We normalize origins before checks (`normalizeOrigin`) so active sessions continue matching correctly.
* **PJAX Recovery**: Websites utilizing client-side AJAX/PJAX routing (like Amazon) alter page contents and URLs without full page updates, unmounting our overlay `<mini-apty-root>` from `document.body`. We bind a DOM `MutationObserver` to `document.body` that immediately re-appends our container if PJAX detaches it, maintaining state seamlessly. We also resolved early-return widget bugs inside `startRecording` to restore overlays immediately.

---

## 3. Element Targeting Heuristics & SPA Mutation Observer

### Selector Prioritization Cascade
To make targeting resilient to minor HTML restructures or framework-generated classes (e.g., CSS-in-JS hashes or Tailwind utilities), our selector engine prioritizes candidates in the following cascade:
1. **Custom Test Attributes**: `data-testid`, `data-test`, `data-qa`, `data-apty`.
2. **Stable ID**: Unique IDs (ignoring auto-generated hashes matching patterns like `btn-123` or `vue-381`).
3. **Semantic Form Inputs**: Input tags with stable `name` or `placeholder` attributes.
4. **Tag + Stable Classes**: Tag elements combined with filtered, non-utility class lists.
5. **Hierarchical CSS path**: Ancestral tag strings climbing up to 3 levels.
6. **Positional XPath Fallback**: Root-indexed coordinate string (e.g. `/html/body/main/div[2]/button[1]`).

### Scorer Matching Engine (Preview mode)
Instead of running a naive query selector, the content script scans candidates in the DOM and computes a matching metric score from `0.0` to `1.0` based on tags, XPath coordinates, texts, and attributes.
* **SPA Resilience**: A `MutationObserver` on `document.body` waits for delayed/lazy mounts in React/Vue SPAs. If the element is not found, it waits for mutations and immediately anchors the tooltip when the candidate meets the score threshold.
* **Unmount Detection**: A parent-level mutation observer monitors the active anchored target. If the host page unmounts or replaces the element, the engine detaches coordinates, recalculates candidates, and anchors onto the new node.

---

## 4. Overlay Isolation & Styling Protection

* **Shadow DOM Isolations**: Our React overlay component is mounted inside a closed Shadow Root (`<mini-apty-root>`).
* **Styling Protections**: The shadow root injects custom isolated stylesheet styles (resetting styles via `:host { all: initial }`) to completely block parent page CSS overrides from corrupting the widgets.
* **bfcache (Back-Forward Cache) Protections**: When a user navigates back using browser buttons, pages are loaded from cache, retaining stale overlay elements. We bind to the window `pageshow` listener: if the page is loaded from cache (`event.persisted === true`), we check storage and instantly destroy overlays if the session is inactive.

---

## 5. Network Failure Tolerance & Storage Cache

* **Local Cache Lookups**: Successful walkthrough loads are stored in `chrome.storage.local` under origin-specific cache keys. If the backend is offline, the extension falls back to local cache walkthroughs, enabling tooltips to render without interruption.
* **Offline Queues**: Steps recorded when the backend is offline are pushed to a synchronization queue (`offlineQueue`).
* **Sync Loops**: A background service worker alarm checks connectivity periodically (every 1 minute) and flushes the queue, synchronizing the records to the MySQL database once the server is back online.

---

## 6. Error Handling & Normalization

* **Overlay Error Boundary**: The overlay component is wrapped in a React `ErrorBoundary` class component. If a rendering exception occurs inside our React elements, the error is caught, and a corner warning modal is shown to the user with a reset option, preventing host page crashes.
* **API Error Normalizer**: An API-level utility formats error messages, categorizing issues into:
  - *Network Connections* (Failed fetches)
  - *Authentication Failures* (Invalid tokens, unauthorized edits)
  - *Validation Failures* (Zod parsing rejects)
  - *Unknown Server Issues*

---

## 7. Setup & Run Guide

### 1. Prerequisite Environment Setup
Copy the configuration template and customize the secrets:
```bash
cp .env.example .env
```

### 2. Launch Databases & Servers
Ensure Docker is active, then run:
```bash
# Spin up MySQL and Backend REST service
pnpm db:up
```

Alternatively, you can run the backend service locally:
```bash
# Start backend local dev server (requires MySQL connection parameters in .env)
pnpm dev:backend
```

### 3. Build Extension
To compile shared packages and bundle the extension:
```bash
pnpm build
```
The output is written to `/packages/extension/dist`.

### 4. Install Extension in Chrome
1. Open Chrome and navigate to `chrome://extensions`.
2. Toggle **Developer mode** on the top right.
3. Click **Load unpacked** on the top left and select:
   `<your_project_path>/packages/extension/dist`
