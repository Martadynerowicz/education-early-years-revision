/*
 * research.js — research mode page logic (local only, nothing is uploaded).
 * Participant code (no names), locked pre-test and post-test, dated history,
 * usage counters, CSV export the learner chooses to hand in, delete my data.
 */
import { CODE_PATTERN, getResearch, saveResearch, emptyResearch, deleteAllLocalData, today } from "/education-early-years-revision/assets/pgce-core.js";
import { QUESTIONS, TEST_VERSION } from "/education-early-years-revision/pgce/research-questions.js";

const $ = (id) => document.getElementById(id);
const show = (el, on) => el.classList.toggle("pgce-hidden", !on);
let currentTest = null; // "pre" | "post"

function render() {
  const r = getResearch();
  const on = !!(r.enabled && r.code);
  show($("join"), !on);
  show($("dashboard"), on && !currentTest);
  show($("test"), !!currentTest);
  if (!on) return;
  $("code-shown").textContent = r.code;
  $("joined-shown").textContent = r.joinedDate || "";
  $("pre-status").textContent = r.pre ? `Done on ${r.pre.date}. Score: ${r.pre.score}/${r.pre.total}.` : "Not done yet.";
  $("post-status").textContent = r.post
    ? `Done on ${r.post.date}. Score: ${r.post.score}/${r.post.total}.`
    : r.pre ? "Not done yet. Your teacher will tell you when." : "Do the pre-test first.";
  $("start-pre").disabled = !!r.pre;
  $("start-post").disabled = !r.pre || !!r.post;
  const c = r.counters;
  $("counters").innerHTML =
    `<li>Times you opened the app in research mode: ${c.sessions}</li>` +
    `<li>Topics opened: ${c.topicsOpened}</li>` +
    `<li>Quizzes finished: ${c.quizzesDone}</li>` +
    `<li>Practice papers finished: ${c.papersDone}</li>`;
  $("history").innerHTML = r.history.length
    ? r.history.slice(-30).map((h) => `<tr><td>${h.date}</td><td>${h.kind}</td><td>${h.id}</td><td>${h.score}/${h.total}</td></tr>`).join("")
    : `<tr><td colspan="4">No quizzes finished yet.</td></tr>`;
  show($("review"), !!r.post);
  if (r.post) renderReview(r);
}

function renderReview(r) {
  const byId = Object.fromEntries(r.post.items.map((i) => [i.id, i]));
  $("review-list").innerHTML = QUESTIONS.map((q, n) => {
    const mine = byId[q.id];
    return `<li><strong>${n + 1}. ${escapeHtml(q.stem)}</strong><br>Correct answer: ${escapeHtml(q.options[q.answer])}` +
      (mine ? ` — you were ${mine.correct ? "right ✔" : "not right this time"}` : "") + `</li>`;
  }).join("");
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/* ---- joining ---- */
$("join-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const code = $("code").value.trim().toUpperCase().replace(/\s+/g, "");
  const err = $("join-error");
  if (!$("agree").checked) { err.textContent = "Please tick the box to show you have read the information sheet and agree."; return; }
  if (!CODE_PATTERN.test(code)) {
    err.textContent = "That code does not look right. Use the code on your slip, like EY-7Q3K (EY, a dash, then 4 letters or numbers). Do not type your name.";
    return;
  }
  const r = getResearch();
  r.enabled = true;
  r.code = code;
  r.joinedDate = r.joinedDate || today();
  saveResearch(r);
  err.textContent = "";
  render();
});
$("code").addEventListener("input", (e) => { e.target.value = e.target.value.toUpperCase(); });

/* ---- tests ---- */
function startTest(kind) {
  currentTest = kind;
  $("test-title").textContent = kind === "pre" ? "Pre-test" : "Post-test";
  $("test-questions").innerHTML = QUESTIONS.map((q, n) =>
    `<fieldset class="pgce-q"><legend><strong>${n + 1}. ${escapeHtml(q.stem)}</strong></legend>` +
    q.options.map((o, i) => `<label><input type="radio" name="q${n}" value="${i}"> <span>${escapeHtml(o)}</span></label>`).join("") +
    `</fieldset>`).join("");
  $("test-error").textContent = "";
  render();
  window.scrollTo(0, 0);
}
$("start-pre").addEventListener("click", () => startTest("pre"));
$("start-post").addEventListener("click", () => startTest("post"));
$("cancel-test").addEventListener("click", () => { currentTest = null; render(); });

$("submit-test").addEventListener("click", () => {
  const answers = QUESTIONS.map((_, n) => {
    const el = document.querySelector(`input[name="q${n}"]:checked`);
    return el ? Number(el.value) : null;
  });
  const missing = answers.filter((a) => a === null).length;
  if (missing) { $("test-error").textContent = `Please answer every question (${missing} left). Guess if you are not sure.`; return; }
  if (!confirm("Submit now? You can only do this test once.")) return;
  const items = QUESTIONS.map((q, n) => ({ id: q.id, correct: answers[n] === q.answer ? 1 : 0 }));
  const score = items.reduce((s, i) => s + i.correct, 0);
  const r = getResearch();
  if (r[currentTest]) { currentTest = null; render(); return; } // locked: already done
  r[currentTest] = { date: today(), version: TEST_VERSION, score, total: QUESTIONS.length, items };
  saveResearch(r);
  const kind = currentTest;
  currentTest = null;
  render();
  alert(kind === "pre"
    ? `Thank you. Your pre-test score is ${score}/${QUESTIONS.length}. The answers are not shown yet, so the post-test is fair.`
    : `Thank you. Your post-test score is ${score}/${QUESTIONS.length}. You can now see the answers below.`);
});

/* ---- CSV export ---- */
function buildCsv() {
  const r = getResearch();
  const rows = [["participant_code", "record", "item", "score", "total", "date"]];
  for (const kind of ["pre", "post"]) {
    const t = r[kind];
    if (!t) continue;
    for (const i of t.items) rows.push([r.code, `${kind}_test_item`, i.id, i.correct, 1, t.date]);
    rows.push([r.code, `${kind}_test_total`, t.version || "", t.score, t.total, t.date]);
  }
  for (const h of r.history) rows.push([r.code, `app_${h.kind}`, h.id, h.score, h.total, h.date]);
  const c = r.counters;
  const d = today();
  rows.push([r.code, "counter", "sessions", c.sessions, "", d]);
  rows.push([r.code, "counter", "topics_opened", c.topicsOpened, "", d]);
  rows.push([r.code, "counter", "quizzes_done", c.quizzesDone, "", d]);
  rows.push([r.code, "counter", "papers_done", c.papersDone, "", d]);
  return rows.map((row) => row.map((v) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(",")).join("\n") + "\n";
}

$("export-download").addEventListener("click", () => {
  const r = getResearch();
  const blob = new Blob([buildCsv()], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `research-${r.code}-${today()}.csv`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
});
$("export-show").addEventListener("click", () => {
  $("csv-text").value = buildCsv();
  show($("csv-box"), true);
});
$("export-copy").addEventListener("click", async () => {
  const text = buildCsv();
  $("csv-text").value = text;
  show($("csv-box"), true);
  try {
    await navigator.clipboard.writeText(text);
    $("copy-msg").textContent = "Copied. Paste it where your teacher asked.";
  } catch {
    $("csv-text").select();
    $("copy-msg").textContent = "Select the text below and copy it.";
  }
});

/* ---- stop / delete ---- */
$("turn-off").addEventListener("click", () => {
  if (!confirm("Turn off research mode? Your research data stays on this device until you delete it.")) return;
  const r = getResearch();
  r.enabled = false;
  saveResearch(r);
  render();
});
$("resume").addEventListener("click", () => {
  const r = getResearch();
  if (r.code) { r.enabled = true; saveResearch(r); }
  render();
});
for (const id of ["delete-all", "delete-all-2"]) {
  $(id).addEventListener("click", () => {
    if (!confirm("Delete all data this app has saved on this device? This includes research results, quiz scores and saved answers. This cannot be undone.")) return;
    deleteAllLocalData();
    currentTest = null;
    alert("Deleted. Nothing from this app is left on this device.");
    render();
    show($("resume-box"), false);
  });
}

// Show "turn research mode back on" if there is a code but it is switched off.
const start = getResearch();
show($("resume-box"), !!(start.code && !start.enabled));
render();
