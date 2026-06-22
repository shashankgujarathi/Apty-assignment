# Mini Apty – Simple Overview

## What is Mini Apty?

Mini Apty is a Chrome extension that lets you record and replay step-by-step guides on any website.

Example:
Click here → then here → then fill this — all shown directly on the website.

--------------------------------------------------------------------------------------------------------------

## How it works 

1. You click Start Recording
2. The extension tracks what you click
3. Each step gets saved
4. You save the walkthrough (sent to backend)
5. Later, you play it
6. The extension guides you step-by-step on the page

-------------------------------------------------------------------------------------------------------------

## Main parts of the system

### 1. Chrome Extension (Frontend)

This has 3 main pieces:

* Popup → where you log in and start/stop recording
* Content Script → runs inside the website (tracks clicks, shows tooltips)
* Service Worker → handles background logic and communication

These parts can’t talk directly, so they use messaging like:

* `chrome.runtime.sendMessage`
* `chrome.tabs.sendMessage`

---

### 2. Backend

Stores:

* Users
* Walkthroughs
* Steps

---

### 3. Shared Package

Contains common types used by both frontend and backend.

---

## concepts used in the project

### State handling

We don’t store data in memory because the extension can shut down anytime.

So we use:

chrome.storage.local

This stores things like:

* recording state
* preview state
* login token

-------------------------------------------------------------------------------------------------------------

### How we identify elements 

When you click something, we don’t rely on just one selector.

We save multiple options:

* data-testid (best)
* id
* class
* tag
* xpath

 Why? Because websites reloads/changes, Dom gets changed — this gives us backup options.

-------------------------------------------------------------------------------------------------------------

### Playing a walkthrough (Preview mode)

When replaying steps:

* We try multiple selectors
* Score matches
* Pick the best one

Also handles:

* React delays (using MutationObserver)
* UI re-renders

-------------------------------------------------------------------------------------------------------------

### Page navigation

If the next step is on another page:

* We redirect using:

window.location.href

After reload:

* The extension resumes from saved state

-------------------------------------------------------------------------------------------------------------

### Overlay UI

We inject our UI into the page using Shadow DOM

Reason:-
* Website styles won’t break our UI
* Our styles won’t affect the website

---

### Offline support

If backend is down:

* Steps are saved locally
* Sync runs every minute
* Data is sent when backend is back

---

## Project structure

```
packages/
  backend/     → APIs + database
  extension/   → Chrome extension
  shared/      → common types
```

---

## How to run it

### Start backend

pnpm dev:backend

### Build extension

pnpm build

### Load extension in Chrome

1. Go to `chrome://extensions`
2. Turn on Developer Mode
3. Click Load unpacked
4. Select `/packages/extension/dist`
