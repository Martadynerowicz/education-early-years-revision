/*
 * Open-question player with "Check with AI" (renamed from the old examiner marking).
 * Readable replacement for the minified chunk (same file name and export).
 * - hint first (mark-scheme points one at a time, no AI needed)
 * - model answer only after a genuine attempt (MIN_WORDS words)
 * - AI feedback: one-time notice, safeguarding check, AI label, no official mark
 * - answers are not saved in research mode; AI is off in research mode / Android
 * - college build: "Check with AI (Copilot)" copies a prompt for Microsoft Copilot
 *   instead (assets/pgce-copilot.js). The app sends nothing itself.
 */
import { n as markServer } from "./examiner-MiPVojhB.js";
import { l as useProgress } from "./index-DY0MT8UW.js";
import { t as Button } from "./button-32Po9crL.js";
import { t as Textarea } from "./textarea-BUz1xwuu.js";
import { aiStatus, hasAcknowledgedAi, checkText, markAiUnavailable, isResearchMode, AI_GUIDE } from "./pgce-core.js";
import { CopilotCheck, copilotEnabled } from "./pgce-copilot.js";
import { React, jsxRt, PersonalNote, AiLabel, BlockedMessage, AiNotice, AiOff, looksUnavailable, wordCount, MIN_WORDS } from "./pgce-ui.js";

const { jsx, jsxs } = jsxRt;

function OpenPlayer({ question }) {
  const saved = useProgress((s) => s.openAttempts[question.id]?.answer ?? "");
  const saveOpen = useProgress((s) => s.saveOpen);
  const [answer, setAnswer] = React.useState(saved);
  const [hints, setHints] = React.useState(0);
  const [showModel, setShowModel] = React.useState(false);
  const [feedback, setFeedback] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [blocked, setBlocked] = React.useState(null);
  const [askNotice, setAskNotice] = React.useState(false);
  const [status, setStatus] = React.useState({ available: true, reason: null });
  const [research, setResearch] = React.useState(false);
  const [copilot, setCopilot] = React.useState(false);

  React.useEffect(() => {
    setStatus(aiStatus());
    setResearch(isResearchMode());
    setCopilot(copilotEnabled());
  }, []);

  const words = wordCount(answer);
  const attempted = words >= MIN_WORDS;
  const scheme = question.markScheme || [];

  function persist() {
    if (!isResearchMode()) saveOpen(question.id, answer);
  }

  async function checkWithAi() {
    setError(null);
    setFeedback(null);
    if (!hasAcknowledgedAi()) {
      setAskNotice(true);
      return;
    }
    const allowed = `${question.scenario || ""} ${question.stem || ""}`;
    const check = checkText(answer, allowed);
    setBlocked(check.ok ? null : check);
    if (!check.ok) return;
    persist();
    setBusy(true);
    try {
      const res = await markServer({
        data: {
          stem: `${AI_GUIDE}\n\n${question.command}: ${question.stem}`,
          marks: question.marks,
          markScheme: question.markScheme,
          answer,
          modelAnswer: question.modelAnswer,
        },
      });
      if (!res || !res.ok) setError((res && res.error) || "The AI tool did not answer. Try again later.");
      else setFeedback(res.text);
    } catch (err) {
      if (looksUnavailable(err)) {
        markAiUnavailable();
        setStatus(aiStatus());
      } else setError("The AI tool did not answer. Try again later.");
    } finally {
      setBusy(false);
    }
  }

  return jsxs("article", {
    className: "rounded-xl border border-border bg-surface p-5",
    children: [
      jsxs("p", {
        className: "text-[11px] font-medium uppercase tracking-[0.16em] text-muted",
        children: [question.command, " · ", question.marks, " marks · ", question.ao],
      }),
      question.scenario && jsx("p", { className: "mt-3 rounded-md bg-bg-warm px-3 py-3 text-sm leading-relaxed text-fg", children: question.scenario }),
      jsx("h2", { className: "mt-3 font-display text-xl font-semibold leading-snug", children: question.stem }),
      jsx("label", { className: "mt-5 block text-xs font-medium uppercase tracking-wider text-muted", children: "Your answer" }),
      jsx(Textarea, {
        className: "mt-2",
        value: answer,
        onChange: (e) => setAnswer(e.target.value),
        onBlur: persist,
        placeholder: "Write as you would in the exam. Use because / therefore / this means for explain questions.",
      }),
      jsx(PersonalNote, { extra: research ? "Research mode is on: your answer is not saved." : "" }),
      jsxs("div", {
        className: "mt-4 flex flex-wrap gap-2",
        children: [
          jsx(Button, {
            variant: "outline",
            disabled: hints >= scheme.length,
            onClick: () => setHints((h) => Math.min(h + 1, scheme.length)),
            children: hints === 0 ? "Get a hint" : hints >= scheme.length ? "No more hints" : "Another hint",
          }),
          status.available &&
            jsx(Button, {
              onClick: () => void checkWithAi(),
              disabled: busy || answer.trim().length < 12,
              children: busy ? "Checking…" : "Check with AI",
            }),
          jsx(Button, {
            variant: "outline",
            disabled: !attempted,
            onClick: () => { persist(); setShowModel(true); },
            children: "Show model answer",
          }),
        ],
      }),
      jsx(CopilotCheck, {
        stem: question.stem,
        scenario: question.scenario,
        command: question.command,
        marks: question.marks,
        points: scheme,
        modelAnswer: question.modelAnswer,
        answer,
        allowed: `${question.scenario || ""} ${question.stem || ""}`,
      }),
      !attempted && jsx("p", { className: "pgce-note", children: `Write at least ${MIN_WORDS} words (you have ${words}) to unlock the model answer.` }),
      !status.available && !copilot && jsx(AiOff, { reason: status.reason }),
      askNotice && !hasAcknowledgedAi() && jsx(AiNotice, { onAccept: () => { setAskNotice(false); void checkWithAi(); } }),
      jsx(BlockedMessage, { result: blocked }),
      error && jsx("p", { className: "mt-3 text-sm text-danger", children: error }),
      hints > 0 &&
        jsxs("div", {
          className: "mt-6 rounded-lg border border-border bg-bg px-4 py-4",
          children: [
            jsx("p", { className: "text-xs font-medium uppercase tracking-wider text-muted", children: "Hints from the mark scheme" }),
            jsx("ul", { className: "mt-2 list-disc space-y-1 pl-5 text-sm text-fg", children: scheme.slice(0, hints).map((h) => jsx("li", { children: h }, h)) }),
          ],
        }),
      feedback &&
        jsxs("div", {
          className: "mt-6 rounded-lg border border-primary/20 bg-primary-soft/50 px-4 py-4",
          children: [
            jsx(AiLabel, {}),
            jsx("p", { className: "text-xs font-medium uppercase tracking-wider text-primary", children: "AI feedback (practice only — not a mark)" }),
            jsx("pre", { className: "mt-2 whitespace-pre-wrap font-sans text-sm leading-relaxed text-fg", children: feedback }),
          ],
        }),
      showModel &&
        jsxs("div", {
          className: "mt-6 rounded-lg border border-border bg-bg px-4 py-4",
          children: [
            jsx("p", { className: "text-xs font-medium uppercase tracking-wider text-muted", children: "Model answer" }),
            jsx("p", { className: "mt-2 text-sm leading-relaxed", children: question.modelAnswer }),
            jsx("p", { className: "mt-4 text-xs font-medium uppercase tracking-wider text-muted", children: "Mark scheme" }),
            jsx("ul", { className: "mt-2 list-disc space-y-1 pl-5 text-sm text-fg", children: scheme.map((h) => jsx("li", { children: h }, h)) }),
            jsx("p", { className: "pgce-note", children: "Compare your answer point by point. Which marks would you give yourself? Ask your teacher if you are unsure." }),
          ],
        }),
    ],
  });
}

export { OpenPlayer as t };
