/*
 * pgce-core.js — shared safety, AI and research-mode helpers.
 * Readable source (not minified). Imported by the rewritten components
 * (ask, open-player, _paperId, _scenarioId) and by /pgce/pgce.js.
 * Everything here runs in the browser only. Nothing is uploaded.
 */

export const KEYS = {
  progress: "nest-progress-v1", // the app's existing local progress store
  research: "pgce-research-v1", // research mode data (this device only)
  aiAck: "pgce-ai-ack-v1", // learner has read the AI notice
  aiUnavailable: "pgce-ai-unavailable", // sessionStorage flag after a failed AI call
};

export const TEXT = {
  aiLabel: "AI — not your teacher or an NCFE examiner. It can make mistakes.",
  personalNote: "Do not write names or personal details about you, children or staff.",
  footer: "Independent revision resource. Not endorsed by NCFE, CACHE or the DfE.",
  aiOffResearch: "AI features are switched off while research mode is on.",
  aiOffPlatform: "AI features are not available in this version of the app. Use the model answer and mark scheme instead, and check with your teacher.",
};

export const SUPPORT = {
  childline: "Childline: call 0800 1111 (free, 24 hours) or visit childline.org.uk",
  shout: "Shout: text SHOUT to 85258 (free, 24 hours)",
};

/* ---------- small storage helpers ---------- */
function readJSON(store, key, fallback) {
  try {
    const raw = store.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
function writeJSON(store, key, value) {
  try {
    store.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or blocked: ignore */
  }
}

/** Local date as YYYY-MM-DD. Research data keeps the date only, never the time. */
export function today() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/* ---------- research mode ---------- */
export const CODE_PATTERN = /^EY-[A-HJ-NP-Z2-9]{4}$/; // e.g. EY-7Q3K (no I, O, 0 or 1)

export function emptyResearch() {
  return {
    version: 1,
    enabled: false,
    code: null,
    joinedDate: null,
    pre: null, // { date, score, total, items: [{ id, correct }] }
    post: null,
    history: [], // [{ date, kind: "quiz" | "paper", id, score, total }]
    counters: { sessions: 0, topicsOpened: 0, quizzesDone: 0, papersDone: 0 },
  };
}

export function getResearch() {
  const r = readJSON(localStorage, KEYS.research, null);
  if (!r || typeof r !== "object") return emptyResearch();
  return { ...emptyResearch(), ...r, counters: { ...emptyResearch().counters, ...(r.counters || {}) } };
}

export function saveResearch(r) {
  writeJSON(localStorage, KEYS.research, r);
}

export function isResearchMode() {
  const r = getResearch();
  return !!(r.enabled && r.code);
}

/** Delete everything this app stores on this device. */
export function deleteAllLocalData() {
  for (const key of [KEYS.progress, KEYS.research, KEYS.aiAck]) {
    try { localStorage.removeItem(key); } catch {}
  }
  try { sessionStorage.clear(); } catch {}
}

/* ---------- AI availability and notice ---------- */
export function isNativeApp() {
  const cap = window.Capacitor;
  return !!(cap && (typeof cap.isNativePlatform !== "function" || cap.isNativePlatform()));
}

export function aiStatus() {
  const cfg = window.PGCE_CONFIG || {};
  if (cfg.aiEnabled === false || isNativeApp()) return { available: false, reason: "platform" };
  try {
    if (sessionStorage.getItem(KEYS.aiUnavailable)) return { available: false, reason: "platform" };
  } catch {}
  if (isResearchMode()) return { available: false, reason: "research" };
  return { available: true, reason: null };
}

export function markAiUnavailable() {
  try { sessionStorage.setItem(KEYS.aiUnavailable, "1"); } catch {}
}

export function hasAcknowledgedAi() {
  try { return localStorage.getItem(KEYS.aiAck) === "1"; } catch { return false; }
}
export function acknowledgeAi() {
  try { localStorage.setItem(KEYS.aiAck, "1"); } catch {}
}

/**
 * Extra instructions sent with every AI request. The AI server's own prompt
 * lives in Grok Build and cannot be changed from this code, so this is a
 * best-effort guard: hints and feedback first, no persona, point to a teacher.
 */
export const AI_GUIDE =
  "[Instructions for the AI tool: The learner is a 16-17 year old revising. " +
  "Give short feedback and hints only. Do not write a full model answer. " +
  "Use function-based phrasing and do not use 'I'. Do not call yourself a teacher or examiner. " +
  "Do not give an official mark. End by suggesting the learner checks with their teacher. " +
  "If the text mentions harm, abuse or distress, do not answer the question; tell them to speak to a trusted adult or Childline (0800 1111).]";

/* ---------- client-side safeguarding and personal-data check ---------- */

// First-person or disclosure-style phrases. Topic words alone (for example
// "abuse" in an exam answer about signs of abuse) do NOT trigger the check.
const SAFEGUARDING_PATTERNS = [
  /\b(kill(ing)?|hurt(ing)?|harm(ing)?|cut(ting)?|burn(ing)?|starv(e|ing)) (my ?self|myself)\b/i,
  /\bself[- ]?harm(ing)?\b.*\b(i|me|my)\b|\b(i|i'm|im|i am)\b.*\bself[- ]?harm/i,
  /\bsuicid(e|al)\b/i,
  /\b(want|wanna|going) to die\b/i,
  /\bend (it all|my life)\b/i,
  /\b(don'?t|do not) want to (live|be alive|be here)\b/i,
  /\boverdos(e|ed|ing)\b/i,
  /\b(no ?one|nobody) (cares|would care|would miss me|will help)\b/i,
  /\b(he|she|they|my [a-z]+|someone|somebody) (hits?|hurts?|beats?|kicks?|punch(es)?|touch(es|ed)?|chokes?|slaps?) me\b/i,
  /\b(hit|hurt|beat|kicked|punched|touched|choked|slapped|raped|assaulted|abused|groomed) me\b/i,
  /\b(i am|i'm|im|i was|i've been|i have been) (being )?(abused|raped|assaulted|groomed|hurt at home|beaten|bullied|threatened|blackmailed)\b/i,
  /\b(i|i'm|im|i am) (don'?t|do not|not) feel safe\b|\b(i|i'm|im|i am) not safe\b/i,
  /\b(scared|afraid|frightened) (to go home|of (my|him|her|them))\b/i,
  /\b(run(ning)? away from home|kicked me out)\b/i,
  /\b(told me|makes me|made me) (to )?keep (it )?(a )?secret\b/i,
  /\bsend (him|her|them) (nudes|pics|pictures|photos)\b/i,
];

const PERSONAL_PATTERNS = [
  { re: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i, what: "an email address" },
  { re: /(\+44\s?7\d{3}|\(?07\d{3}\)?)\s?\d{3}\s?\d{3}\b/, what: "a phone number" },
  { re: /\b0\d{2,4}[\s-]?\d{3,4}[\s-]?\d{3,4}\b/, what: "a phone number" },
  { re: /\b[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}\b/, what: "a postcode" },
  { re: /\bmy name is\b|\bmy name's\b|\bi am called\b|\bi'm called\b/i, what: "your name" },
  { re: /\b(date of birth|d\.?o\.?b\.?|born on)\b/i, what: "a date of birth" },
  { re: /(^|\s)@[A-Za-z0-9_.]{3,}/, what: "a social media username" },
];

// Name-like patterns: a title before a capitalised word ("Mrs Patel"), a child
// "called"/"named" someone, or a named school, nursery or college.
const NAME_PATTERNS = [
  /\b(?:Mr|Mrs|Miss|Ms|Mx|Dr)\.? ([A-Z][a-z'-]+)/g,
  /\b(?:called|named|name was) ([A-Z][a-z'-]+)/g,
  /\b([A-Z][a-z'-]+(?: [A-Z][a-z'-]+)*) (?:Primary|Nursery|Academy|School|College|Pre-?school|Infants|Juniors)\b/g,
];

/**
 * Check learner text before it is sent to AI.
 * @param {string} text  what the learner typed
 * @param {string} allowed  question/scenario text: names that appear there are allowed
 * @returns {{ok:true} | {ok:false, kind:"safeguarding"|"personal", detail:string}}
 */
export function checkText(text, allowed = "") {
  const t = String(text || "");
  for (const re of SAFEGUARDING_PATTERNS) {
    if (re.test(t)) return { ok: false, kind: "safeguarding", detail: "" };
  }
  for (const p of PERSONAL_PATTERNS) {
    if (p.re.test(t)) return { ok: false, kind: "personal", detail: p.what };
  }
  const allowedWords = new Set((String(allowed).match(/[A-Z][a-z'-]+/g) || []).map((w) => w.toLowerCase()));
  for (const re of NAME_PATTERNS) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(t))) {
      const words = (m[1] || "").split(" ");
      if (words.some((w) => w && !allowedWords.has(w.toLowerCase()))) {
        return { ok: false, kind: "personal", detail: "a name" };
      }
    }
  }
  return { ok: true };
}

export const MESSAGES = {
  safeguarding:
    "It sounds like something difficult might be happening. Your message has not been sent to the AI. " +
    "You deserve support from a real person. Please talk to a trusted adult, your tutor, or the college safeguarding team. " +
    "If you are in danger right now, call 999.",
  personal: (what) =>
    `Your text seems to include ${what || "personal details"}. It has not been sent. ` +
    "Please remove names and personal details (about you, children or staff) and try again.",
};
