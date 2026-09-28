/*
 * "Ask AI" page (renamed from the old examiner page). Readable replacement for the
 * minified chunk. Same file name so the app's route table still loads it.
 * - one-time AI notice, AI label on every output
 * - learner must write a first attempt before asking (hints, not full answers)
 * - client-side safeguarding / personal-data check: blocked text is never sent
 * - switched off in research mode and in the Android app
 */
import { t as askServer } from "./examiner-MiPVojhB.js";
import { t as Button } from "./button-32Po9crL.js";
import { t as Textarea } from "./textarea-BUz1xwuu.js";
import { aiStatus, hasAcknowledgedAi, checkText, markAiUnavailable, AI_GUIDE } from "./pgce-core.js";
import { React, jsxRt, PersonalNote, AiLabel, BlockedMessage, AiNotice, AiOff, looksUnavailable, wordCount } from "./pgce-ui.js";

const { jsx, jsxs } = jsxRt;
const MIN_ATTEMPT_WORDS = 8;
const SUGGESTIONS = [
  "What is the difference between a child in need and a child at risk?",
  "Give me hints for planning a 15-mark answer on why attachment theory matters in a nursery.",
  "How should I structure a 6-mark 'analyse' question on behaviour policy?",
  "What is the graduated approach in the SEND Code of Practice?",
];

function AskAi() {
  const [question, setQuestion] = React.useState("");
  const [attempt, setAttempt] = React.useState("");
  const [answer, setAnswer] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [blocked, setBlocked] = React.useState(null);
  const [acked, setAcked] = React.useState(true);
  const [status, setStatus] = React.useState({ available: true, reason: null });

  React.useEffect(() => {
    setAcked(hasAcknowledgedAi());
    setStatus(aiStatus());
  }, []);

  async function send() {
    setError(null);
    setAnswer(null);
    const check = checkText(question + "\n" + attempt);
    setBlocked(check.ok ? null : check);
    if (!check.ok) return;
    setBusy(true);
    try {
      const res = await askServer({
        data: { question: `${AI_GUIDE}\n\nLearner's question: ${question}\n\nLearner's first attempt: ${attempt}` },
      });
      if (!res || !res.ok) {
        setError((res && res.error) || "The AI tool did not answer. Try again later.");
      } else {
        setAnswer(res.text);
      }
    } catch (err) {
      if (looksUnavailable(err)) {
        markAiUnavailable();
        setStatus(aiStatus());
      } else {
        setError("The AI tool did not answer. Try again later.");
      }
    } finally {
      setBusy(false);
    }
  }

  const ready = question.trim().length >= 8 && wordCount(attempt) >= MIN_ATTEMPT_WORDS;

  let body;
  if (!status.available) {
    body = jsx(AiOff, { reason: status.reason });
  } else if (!acked) {
    body = jsx(AiNotice, { onAccept: () => setAcked(true) });
  } else {
    body = jsxs(React.Fragment, {
      children: [
        jsx("div", {
          className: "mt-6 flex flex-wrap gap-2",
          children: SUGGESTIONS.map((s) =>
            jsx("button", {
              type: "button",
              onClick: () => setQuestion(s),
              className: "rounded-full border border-border bg-surface px-3 py-2 text-left text-xs text-muted hover:border-primary/40 hover:text-fg",
              children: s,
            }, s)
          ),
        }),
        jsx("label", { className: "pgce-field-label", htmlFor: "pgce-q", children: "1. Your question" }),
        jsx(Textarea, {
          id: "pgce-q",
          className: "mt-2 min-h-24",
          value: question,
          onChange: (e) => setQuestion(e.target.value),
          placeholder: "e.g. How can practitioners support a child with EAL in Reception?",
        }),
        jsx(PersonalNote, {}),
        jsx("label", { className: "pgce-field-label", htmlFor: "pgce-a", children: "2. Your first try: what do you already know?" }),
        jsx(Textarea, {
          id: "pgce-a",
          className: "mt-2 min-h-24",
          value: attempt,
          onChange: (e) => setAttempt(e.target.value),
          placeholder: `Write at least ${MIN_ATTEMPT_WORDS} words. The AI builds hints on your ideas.`,
        }),
        jsx(PersonalNote, {}),
        jsx(Button, {
          className: "mt-3",
          disabled: busy || !ready,
          onClick: () => void send(),
          children: busy ? "Thinking…" : "Get hints",
        }),
        !ready && jsx("p", { className: "pgce-note", children: `Write your question and at least ${MIN_ATTEMPT_WORDS} words of your own first.` }),
        jsx(BlockedMessage, { result: blocked }),
        error && jsx("p", { className: "mt-3 text-sm text-danger", children: error }),
        answer &&
          jsxs("div", {
            className: "mt-8 rounded-xl border border-border bg-surface px-5 py-5",
            children: [
              jsx(AiLabel, {}),
              jsx("div", { className: "mt-3 whitespace-pre-wrap text-sm leading-relaxed", children: answer }),
              jsx("p", { className: "pgce-note", children: "Check important points with your teacher before you rely on them." }),
            ],
          }),
      ],
    });
  }

  return jsxs("div", {
    className: "mx-auto max-w-2xl",
    children: [
      jsx("p", { className: "text-[11px] font-medium uppercase tracking-[0.18em] text-muted", children: "AI revision helper" }),
      jsx("h1", { className: "mt-2 font-display text-4xl font-semibold", children: "Ask AI" }),
      jsx("p", {
        className: "mt-2 text-muted",
        children: "Ask a revision question. Write what you already know first — the AI gives hints and feedback, not a finished answer. It is not your teacher and it can be wrong.",
      }),
      body,
    ],
  });
}

export { AskAi as component };
