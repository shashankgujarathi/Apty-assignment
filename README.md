# Mini Apty – Simple Overview (For Quick Understanding & Demo)

## What this project is

Mini Apty is a Chrome Extension that helps you create and play **step-by-step walkthroughs on any website**.

It has 3 main parts:

* **Extension (Frontend)** → Runs inside browser (UI + overlay)
* **Backend** → Stores users, walkthroughs, steps
* **Shared package** → Common types between frontend & backend

---

## How the system works (simple flow)

1. User clicks **Start Recording** from extension popup
2. Extension starts capturing clicks on the page
3. Each step is saved (with selectors + path)
4. User saves walkthrough → sent to backend
5. Later, user plays walkthrough
6. Extension finds elements and shows tooltips step-by-step

---

## Key Architecture (very important)

### 1. Extension has 3 parts

* **Popup** → small UI (login, start/stop)
* **Content Script** → runs inside webpage (detects clicks, shows UI)
* **Service Worker** → background logic (state + messaging)

These 3 **cannot directly talk to each other**, so they use:

* `chrome.runtime.sendMessage`
* `chrome.tabs.sendMessage`

---

### 2. State handling (very important)

We DO NOT store state in memory because:

* Service worker can stop anytime

So we use:

```txt
chrome.storage.local
```

We store:

* recordingState
* previewState
* token (auth)

---

### 3. Selector strategy (core logic)

When user clicks an element, we don’t store just one selector.

We store multiple:

1. data-testid (best)
2. id
3. class
4. tag
5. xpath

Why?
Because DOM changes — we need fallback options.

---

### 4. Preview mode (smart part)

When playing a walkthrough:

* We search multiple elements
* Score them based on match
* Pick best match

Also handles:

* React SPA loading delays (MutationObserver)
* Element re-renders

---

### 5. Navigation handling

If next step is on another page:

* We redirect using:

```js
window.location.href
```

Then:

* Page reloads
* Extension resumes from storage

---

### 6. Overlay system

We inject UI into page using:

```txt
Shadow DOM
```

Why?

* Prevent site CSS from breaking our UI
* Prevent our styles from affecting site

---

### 7. Offline handling

If backend is down:

* Steps are stored locally (offline queue)
* Background sync runs every 1 min
* Data syncs when backend is back

---

## Folder structure (simple view)

```
packages/
  backend/     → APIs + DB
  extension/   → Chrome extension
  shared/      → types & schemas
```

---

## How to run the project

### Start backend

```bash
pnpm dev:backend
```

### Build extension

```bash
pnpm build
```

### Load extension

1. Go to chrome://extensions
2. Enable Developer Mode
3. Click "Load unpacked"
4. Select `/packages/extension/dist`
