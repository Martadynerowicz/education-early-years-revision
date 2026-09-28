/*
 * pgce.js — loaded on every page (type="module").
 * 1. Adds the footer (not-endorsed statement + links).
 * 2. Hides the "Ask AI" navigation where AI is switched off.
 * 3. Research mode (local only): counts sessions, topics opened and quizzes
 *    done, keeps a dated history of quiz/paper scores, and stops free-text
 *    answers being saved. Nothing is uploaded.
 * 4. Staff test banner, only when pgce/config.js has staffTestBanner: true
 *    (the in-app AI version; never the college Copilot build or Android).
 */
import { KEYS, TEXT, getResearch, saveResearch, isResearchMode, aiStatus, today } from "/education-early-years-revision/assets/pgce-core.js";

/* ---- 1. footer ---- */
function addFooter() {
  if (document.querySelector(".pgce-footer")) return;
  const f = document.createElement("footer");
  f.className = "pgce-footer";
  f.setAttribute("data-pgce", "footer");
  f.innerHTML =
    `<p>${TEXT.footer}</p>` +
    `<p><a href="/education-early-years-revision/privacy.html">Privacy notice</a> <a href="/education-early-years-revision/ai-notice.html">AI notice</a> <a href="/education-early-years-revision/research.html">Research mode</a></p>`;
  document.body.appendChild(f);
}

function addResearchBadge() {
  if (!isResearchMode() || document.querySelector(".pgce-research-badge")) return;
  const a = document.createElement("a");
  a.className = "pgce-research-badge";
  a.href = "/education-early-years-revision/research.html";
  a.textContent = "Research mode on";
  document.body.appendChild(a);
}

/* ---- staff test banner (in-app AI version only) ---- */
export const STAFF_BANNER =
  "Staff test version — AI feedback uses a non-college AI service. Do not use with students until approved by the college Head of IT.";
function addStaffBanner() {
  const cfg = window.PGCE_CONFIG || {};
  if (cfg.staffTestBanner !== true || document.querySelector(".pgce-staff-banner")) return;
  const d = document.createElement("div");
  d.className = "pgce-staff-banner";
  d.setAttribute("role", "note");
  d.setAttribute("data-pgce", "staff-banner");
  d.textContent = STAFF_BANNER;
  document.body.insertBefore(d, document.body.firstChild);
}

/* ---- 2. AI navigation ---- */
function applyAiClass() {
  document.documentElement.classList.toggle("pgce-no-ai", !aiStatus().available);
}

/* ---- 3. research mode tracking ---- */
function countSession() {
  if (!isResearchMode()) return;
  try {
    if (sessionStorage.getItem("pgce-session-counted")) return;
    sessionStorage.setItem("pgce-session-counted", "1");
  } catch { return; }
  const r = getResearch();
  r.counters.sessions += 1;
  saveResearch(r);
}

let lastPath = null;
function trackPath() {
  // strip the site base path (e.g. GitHub Pages "/education-early-years-revision")
  const base = (window.PGCE_CONFIG && window.PGCE_CONFIG.basePath) || "";
  let path = location.pathname;
  if (base && path.startsWith(base)) path = path.slice(base.length) || "/";
  path = path.replace(/\.html$/, "");
  if (path === lastPath) return;
  lastPath = path;
  if (!isResearchMode()) return;
  if (/^\/revise\/[^/]+$/.test(path)) {
    const r = getResearch();
    r.counters.topicsOpened += 1;
    saveResearch(r);
  }
}

// Watch the app's own progress store. When a quiz or paper score is saved,
// record it (date only). In research mode, strip saved free-text answers.
function snapshot(state) {
  const out = {};
  for (const [group, kind] of [["quizScores", "quiz"], ["examScores", "paper"]]) {
    for (const [id, v] of Object.entries((state && state[group]) || {})) out[`${kind}:${id}`] = v && v.at;
  }
  return out;
}
let previous = {};
try { previous = snapshot((JSON.parse(localStorage.getItem(KEYS.progress) || "{}") || {}).state); } catch {}

const originalSetItem = Storage.prototype.setItem;
Storage.prototype.setItem = function (key, value) {
  if (this === window.localStorage && key === KEYS.progress && isResearchMode()) {
    try {
      const parsed = JSON.parse(value);
      if (parsed && parsed.state) {
        if (parsed.state.openAttempts && Object.keys(parsed.state.openAttempts).length) {
          parsed.state.openAttempts = {}; // no free text stored in research mode
          value = JSON.stringify(parsed);
        }
        const now = snapshot(parsed.state);
        const r = getResearch();
        let changed = false;
        for (const [k, at] of Object.entries(now)) {
          if (at && previous[k] !== at) {
            const [kind, id] = k.split(":");
            const src = kind === "quiz" ? parsed.state.quizScores[id] : parsed.state.examScores[id];
            r.history.push({
              date: today(),
              kind,
              id,
              score: kind === "quiz" ? src.correct : src.marks,
              total: src.total,
            });
            if (kind === "quiz") r.counters.quizzesDone += 1;
            else r.counters.papersDone += 1;
            changed = true;
          }
        }
        previous = now;
        if (changed) saveResearch(r);
      }
    } catch { /* never break the app */ }
  }
  return originalSetItem.call(this, key, value);
};

/* ---- start ---- */
applyAiClass();
countSession();
trackPath();
setInterval(trackPath, 1000);
window.addEventListener("popstate", trackPath);
function afterHydration() {
  setTimeout(() => { addStaffBanner(); addFooter(); addResearchBadge(); applyAiClass(); }, 600);
}
if (document.readyState === "complete") afterHydration();
else window.addEventListener("load", afterHydration);
