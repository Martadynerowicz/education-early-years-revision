/*
 * pgce-ui.js — small shared React pieces for the PGCE safety changes.
 * Readable source. Uses the app's own React build (jsx-runtime chunk).
 */
import { _ as reactFactory, t as jsxFactory, y as interop } from "./jsx-runtime-DD5i0qbC.js";
import { TEXT, SUPPORT, MESSAGES, acknowledgeAi } from "./pgce-core.js";

export const React = interop(reactFactory(), 1);
export const jsxRt = jsxFactory();
const { jsx, jsxs } = jsxRt;

export const MIN_WORDS = 15;
export const wordCount = (s) => (String(s || "").trim().match(/\S+/g) || []).length;

/** Grey line under every free-text box. */
export function PersonalNote({ extra }) {
  return jsxs("p", {
    className: "pgce-note",
    children: [TEXT.personalNote, extra ? " " + extra : ""],
  });
}

/** Label shown above every AI output. */
export function AiLabel() {
  return jsx("p", { className: "pgce-ai-label", role: "note", children: TEXT.aiLabel });
}

/** Message shown instead of sending text to AI. */
export function BlockedMessage({ result }) {
  if (!result || result.ok) return null;
  if (result.kind === "safeguarding") {
    return jsxs("div", {
      className: "pgce-card pgce-card-safe",
      role: "alert",
      children: [
        jsx("p", { className: "pgce-card-title", children: "Please talk to someone you trust" }),
        jsx("p", { children: MESSAGES.safeguarding }),
        jsxs("ul", { children: [jsx("li", { children: SUPPORT.childline }), jsx("li", { children: SUPPORT.shout })] }),
      ],
    });
  }
  return jsx("div", { className: "pgce-card pgce-card-warn", role: "alert", children: jsx("p", { children: MESSAGES.personal(result.detail) }) });
}

/** One-time AI notice. The learner must tick and continue before first use. */
export function AiNotice({ onAccept }) {
  const [ticked, setTicked] = React.useState(false);
  return jsxs("div", {
    className: "pgce-card pgce-card-info",
    children: [
      jsx("p", { className: "pgce-card-title", children: "Before you use the AI tool" }),
      jsxs("ul", {
        children: [
          jsx("li", { children: "This is an AI tool. It is not your teacher and not an NCFE examiner." }),
          jsx("li", { children: "It can make mistakes. It does not give official marks or grades." }),
          jsx("li", { children: "It gives hints and feedback. You write your own answer first." }),
          jsx("li", { children: "What you type is sent to an AI service on the internet. Do not write names or personal details." }),
          jsx("li", { children: "If something is worrying you, talk to a trusted adult or the college safeguarding team, not the AI." }),
        ],
      }),
      jsxs("p", { children: ["Read the full ", jsx("a", { href: "/education-early-years-revision/ai-notice.html", children: "AI notice" }), " and ", jsx("a", { href: "/education-early-years-revision/privacy.html", children: "privacy notice" }), "."] }),
      jsxs("label", {
        className: "pgce-check",
        children: [
          jsx("input", { type: "checkbox", checked: ticked, onChange: (e) => setTicked(e.target.checked) }),
          " I understand. I will check important things with my teacher.",
        ],
      }),
      jsx("button", {
        type: "button",
        className: "pgce-btn",
        disabled: !ticked,
        onClick: () => { acknowledgeAi(); onAccept && onAccept(); },
        children: "Continue",
      }),
    ],
  });
}

/** Card shown when AI is switched off. */
export function AiOff({ reason }) {
  return jsx("div", {
    className: "pgce-card pgce-card-info",
    children: jsx("p", { children: reason === "research" ? TEXT.aiOffResearch : TEXT.aiOffPlatform }),
  });
}

/** Did a server-function call fail because there is no AI server here? */
export function looksUnavailable(err) {
  const msg = String((err && (err.message || err)) || "");
  return /403|404|405|501|502|503|Error response|<!DOCTYPE|<html|Failed to fetch|NetworkError|Unexpected token|JSON|content-type|Load failed|not found|Unsupported method/i.test(msg) || !msg;
}
