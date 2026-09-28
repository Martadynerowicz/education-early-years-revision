/*
 * pgce-copilot.js — "Check with AI (Copilot)" for the college-compliant build.
 * Readable source (not minified).
 *
 * The app itself sends NOTHING to any AI service. When the learner presses the
 * button, this code:
 *   1. checks they have written an answer first;
 *   2. runs the on-device safeguarding / personal-data check (pgce-core.js);
 *   3. builds a feedback prompt and copies it to the clipboard;
 *   4. opens Microsoft Copilot (copilot.cloud.microsoft, the work and school
 *      address) in a new tab and explains how to paste it.
 * The learner chooses to paste it into Copilot while signed in with their
 * college Microsoft account. Nothing is recorded or stored, and no network
 * request is made by the app.
 *
 * It only appears when pgce/config.js has `copilot: true` (set by
 * tools/build_pages_site.py --copilot). It is always hidden in research mode
 * and in the Android app.
 */
import { checkText, isResearchMode, isNativeApp } from "./pgce-core.js";
import { React, jsxRt, BlockedMessage, wordCount, MIN_WORDS } from "./pgce-ui.js";

const { jsx, jsxs } = jsxRt;

// Microsoft's work and school (Entra ID) address for Copilot Chat, so students
// sign in with their college account. copilot.microsoft.com is Microsoft's
// address for personal accounts, so it is NOT used here.
// Source: https://learn.microsoft.com/en-gb/copilot/manage
export const COPILOT_URL = "https://copilot.cloud.microsoft/";

export const COPILOT_TEXT = {
  button: "Check with AI (Copilot)",
  label: "Microsoft Copilot is AI — not your teacher or an NCFE examiner. It can make mistakes.",
  needAnswer: `Write your own answer first (at least ${MIN_WORDS} words). Then Copilot can give feedback on it.`,
  copied:
    "Your question and answer have been copied. In Copilot: 1) sign in with your college account, " +
    "2) paste (Ctrl+V), 3) press send. Do not add your name or personal details.",
  copyFailed:
    "Copying did not work on this device. Select all the text in the box below, copy it (Ctrl+C), " +
    "then paste it into Copilot (Ctrl+V) and press send. Do not add your name or personal details.",
  recopied: "Copied again.",
};

/** Is the Copilot button switched on for this build, and allowed right now? */
export function copilotEnabled() {
  const cfg = window.PGCE_CONFIG || {};
  if (cfg.copilot !== true) return false;
  if (isNativeApp()) return false;
  if (isResearchMode()) return false;
  return true;
}

/**
 * Build the text the learner pastes into Copilot. Plain en-GB.
 * @param {{stem:string, scenario?:string, command?:string, marks?:number,
 *          points?:string[], answer:string}} q
 * The model / example answer is deliberately NOT included (the learner can
 * see what they paste, and it must not become a copy-able answer).
 */
export function buildCopilotPrompt(q) {
  const marks = Number(q.marks);
  const hasMarks = Number.isFinite(marks) && marks > 0;
  const lines = [];
  lines.push(
    "You are giving practice feedback to a 16–17 year old student studying Early Years (NCFE CACHE level 3). " +
      "Do not rewrite their answer or write a model answer. " +
      "List which of the mark-scheme points below they have covered and which they have missed. " +
      "Give one short hint for each missed point. " +
      (hasMarks ? `Suggest a rough mark out of ${marks}. ` : "") +
      "Use simple, friendly English. " +
      "End by reminding them this is AI feedback, not their teacher or an NCFE examiner, and it can make mistakes."
  );
  lines.push("");
  lines.push("Question:");
  if (q.scenario) lines.push(`Scenario: ${String(q.scenario).trim()}`);
  const stem = String(q.stem || "").trim();
  const cmd = q.command && !stem.toLowerCase().startsWith(String(q.command).toLowerCase()) ? q.command + ": " : "";
  lines.push(`${cmd}${stem}${hasMarks ? ` (${marks} mark${marks === 1 ? "" : "s"})` : ""}`);
  lines.push("");
  lines.push("Mark-scheme points:");
  const points = (q.points || []).map((p) => String(p).trim()).filter(Boolean);
  if (points.length) points.forEach((p) => lines.push(`- ${p}`));
  else lines.push("- (no mark-scheme points are listed for this question: give general feedback on how well the answer covers the question)");
  lines.push("");
  lines.push("Student answer:");
  lines.push(String(q.answer || "").trim());
  return lines.join("\n");
}

/** Old-style copy through a hidden textarea. Returns true if it worked. */
function execCommandCopy(text) {
  let ok = false;
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  ta.style.position = "fixed";
  ta.style.top = "-1000px";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  try {
    ta.focus();
    ta.select();
    ta.setSelectionRange(0, text.length);
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  document.body.removeChild(ta);
  return ok;
}

/** Copy text: navigator.clipboard first, then the execCommand fallback. */
export async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to the fallback */
  }
  return execCommandCopy(text);
}

/**
 * The button and its panel. Renders nothing unless copilotEnabled().
 * Props: stem, scenario, command, marks, points, answer, allowed
 * (allowed = question text; names that appear there are allowed in the answer).
 */
export function CopilotCheck(props) {
  const [enabled, setEnabled] = React.useState(false); // decided after mount (no hydration mismatch)
  const [state, setState] = React.useState(null); // null | "need" | "blocked" | "copied" | "failed"
  const [blocked, setBlocked] = React.useState(null);
  const [prompt, setPrompt] = React.useState("");
  const [recopied, setRecopied] = React.useState(false);
  const boxRef = React.useRef(null);

  React.useEffect(() => { setEnabled(copilotEnabled()); }, []);
  // The answer changed after a copy: hide the old panel so it is never stale.
  React.useEffect(() => { setState(null); setBlocked(null); setPrompt(""); }, [props.answer]);

  if (!enabled) return null;

  async function onClick() {
    setRecopied(false);
    if (!copilotEnabled()) { setEnabled(false); return; }
    const answer = String(props.answer || "");
    if (wordCount(answer) < MIN_WORDS) { setBlocked(null); setState("need"); return; }
    const check = checkText(answer, props.allowed || `${props.scenario || ""} ${props.stem || ""}`);
    if (!check.ok) { setBlocked(check); setState("blocked"); return; }
    setBlocked(null);
    const text = buildCopilotPrompt({ ...props, answer });
    setPrompt(text);
    const ok = await copyText(text);
    setState(ok ? "copied" : "failed");
    try { window.open(COPILOT_URL, "_blank", "noopener,noreferrer"); } catch { /* the link in the panel still works */ }
  }

  async function copyAgain() {
    const ok = await copyText(prompt);
    setRecopied(ok);
    if (!ok) setState("failed");
    if (!ok && boxRef.current) { boxRef.current.focus(); boxRef.current.select(); }
  }

  const showPanel = state === "copied" || state === "failed";
  return jsxs("div", {
    className: "pgce-copilot",
    "data-pgce": "copilot",
    children: [
      jsx("button", {
        type: "button",
        className: "pgce-btn pgce-copilot-btn",
        onClick: () => void onClick(),
        children: COPILOT_TEXT.button,
      }),
      state === "need" && jsx("p", { className: "pgce-note", role: "status", children: COPILOT_TEXT.needAnswer }),
      state === "blocked" && jsx(BlockedMessage, { result: blocked }),
      showPanel &&
        jsxs("div", {
          className: "pgce-card pgce-card-info pgce-copilot-panel",
          role: "status",
          children: [
            jsx("p", { className: "pgce-ai-label", children: COPILOT_TEXT.label }),
            jsx("p", { children: state === "copied" ? COPILOT_TEXT.copied : COPILOT_TEXT.copyFailed }),
            state === "failed" &&
              jsx("textarea", {
                ref: boxRef,
                className: "pgce-copilot-text",
                readOnly: true,
                value: prompt,
                "aria-label": "Text to paste into Copilot",
                onFocus: (e) => e.target.select(),
              }),
            jsxs("div", {
              className: "pgce-row",
              children: [
                jsx("button", { type: "button", className: "pgce-btn pgce-btn-outline", onClick: () => void copyAgain(), children: "Copy again" }),
                jsx("a", { className: "pgce-btn pgce-btn-outline", href: COPILOT_URL, target: "_blank", rel: "noopener noreferrer", children: "Open Microsoft Copilot" }),
              ],
            }),
            recopied && jsx("p", { className: "pgce-note", children: COPILOT_TEXT.recopied }),
            jsx("p", { className: "pgce-note", children: "This app does not send your answer anywhere. Only paste it into Copilot while signed in with your college account." }),
          ],
        }),
    ],
  });
}
