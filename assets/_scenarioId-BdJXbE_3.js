/*
 * Placement scenario page. Readable replacement for the minified chunk.
 * Changes: personal-details note under each box; the model answer opens
 * after the learner has written an attempt. Responses are never saved or sent.
 * College build: each task also gets "Check with AI (Copilot)", which copies a
 * prompt for the learner to paste into Microsoft Copilot (assets/pgce-copilot.js).
 */
import { t as Link } from "./link-CGW0isQW.js";
import { o as scenarioRoute } from "./index-DY0MT8UW.js";
import { t as Button } from "./button-32Po9crL.js";
import { t as Textarea } from "./textarea-BUz1xwuu.js";
import { t as scenarios } from "./scenarios-B4WwqMTA.js";
import { React, jsxRt, PersonalNote, wordCount, MIN_WORDS } from "./pgce-ui.js";
import { CopilotCheck } from "./pgce-copilot.js";

const { jsx, jsxs } = jsxRt;

function ScenarioPage() {
  const { scenarioId } = scenarioRoute.useParams();
  const sc = scenarios.find((s) => s.id === scenarioId);
  const [open, setOpen] = React.useState({});
  const [texts, setTexts] = React.useState({});

  if (!sc) {
    return jsxs("div", {
      children: [
        jsx("h1", { className: "font-display text-3xl font-semibold", children: "Scenario not found" }),
        jsx(Link, { to: "/placement", className: "mt-4 inline-block text-sm text-primary", children: "All scenarios" }),
      ],
    });
  }

  return jsxs("article", {
    className: "mx-auto max-w-2xl",
    children: [
      jsxs("p", { className: "text-[11px] font-medium uppercase tracking-[0.18em] text-muted", children: [sc.setting, " · ", sc.difficulty] }),
      jsx("h1", { className: "mt-2 font-display text-3xl font-semibold leading-tight", children: sc.title }),
      jsx("p", { className: "mt-5 rounded-xl bg-bg-warm px-4 py-4 text-sm leading-relaxed", children: sc.situation }),
      jsx("div", {
        className: "mt-8 space-y-8",
        children: sc.tasks.map((task, i) => {
          const attempted = wordCount(texts[i]) >= MIN_WORDS;
          return jsxs("section", {
            className: "rounded-xl border border-border bg-surface p-5",
            children: [
              jsxs("p", { className: "text-[11px] font-medium uppercase tracking-wider text-muted", children: ["Task ", i + 1, " · ", task.marks, " marks"] }),
              jsx("h2", { className: "mt-2 font-display text-xl font-semibold leading-snug", children: task.prompt }),
              jsx(Textarea, {
                className: "mt-4",
                value: texts[i] ?? "",
                onChange: (e) => setTexts((t) => ({ ...t, [i]: e.target.value })),
                placeholder: "Write your response before revealing the model.",
              }),
              jsx(PersonalNote, { extra: "This box is not saved or sent anywhere." }),
              jsx(CopilotCheck, {
                stem: task.prompt,
                scenario: sc.situation,
                marks: task.marks,
                points: task.bullets || [],
                answer: texts[i] ?? "",
                allowed: `${sc.title || ""} ${sc.situation || ""} ${task.prompt || ""}`,
              }),
              jsx(Button, {
                className: "mt-3",
                variant: "outline",
                disabled: !open[i] && !attempted,
                onClick: () => setOpen((o) => ({ ...o, [i]: !o[i] })),
                children: open[i] ? "Hide model" : "Show model answer",
              }),
              !attempted && !open[i] && jsx("p", { className: "pgce-note", children: `Write at least ${MIN_WORDS} words to unlock the model answer.` }),
              open[i] &&
                jsxs("div", {
                  className: "mt-4 rounded-lg bg-bg px-4 py-4",
                  children: [
                    jsx("p", { className: "text-sm leading-relaxed", children: task.model }),
                    jsx("ul", { className: "mt-3 list-disc space-y-1 pl-5 text-sm text-muted", children: task.bullets.map((b) => jsx("li", { children: b }, b)) }),
                  ],
                }),
            ],
          }, task.prompt);
        }),
      }),
    ],
  });
}

export { ScenarioPage as component };
