/*
 * Exam-style paper player. Readable replacement for the minified chunk.
 * Change: written answers are no longer scored by word count. After the
 * learner has written an answer and opened the model answer, they mark
 * themselves against the mark scheme. Multiple-choice is still marked exactly.
 */
import { t as Link } from "./link-CGW0isQW.js";
import { l as useProgress, r as paperRoute, u as cn } from "./index-DY0MT8UW.js";
import { t as Button } from "./button-32Po9crL.js";
import { t as Textarea } from "./textarea-BUz1xwuu.js";
import { n as papers } from "./exams-D_vx5f-A.js";
import { React, jsxRt, PersonalNote, wordCount, MIN_WORDS } from "./pgce-ui.js";

const { jsx, jsxs } = jsxRt;
const LETTERS = ["A", "B", "C", "D"];

function PaperPlayer({ paper }) {
  const saveExam = useProgress((s) => s.saveExam);
  const questions = React.useMemo(() => paper.sections.flatMap((s) => s.questions), [paper]);
  const [index, setIndex] = React.useState(0);
  const [choices, setChoices] = React.useState({});
  const [written, setWritten] = React.useState({});
  const [revealed, setRevealed] = React.useState({});
  const [selfMarks, setSelfMarks] = React.useState({});
  const [finished, setFinished] = React.useState(false);
  const q = questions[index];

  if (!q) return jsx("p", { className: "text-muted", children: "This paper has no questions yet." });

  const isMcq = !!q.options;
  const choice = choices[q.id];
  const isRevealed = revealed[q.id];
  const text = written[q.id] ?? "";
  const canReveal = isMcq ? choice !== undefined : wordCount(text) >= MIN_WORDS;

  function marksFor(item) {
    if (item.options) return choices[item.id] === item.answerIndex ? item.marks : 0;
    return selfMarks[item.id] ?? 0; // self-assessed against the mark scheme
  }
  const total = questions.reduce((sum, item) => sum + marksFor(item), 0);
  const unmarked = questions.filter((item) => !item.options && (written[item.id] ?? "").trim() && selfMarks[item.id] === undefined).length;

  function finish() {
    saveExam(paper.id, total, paper.totalMarks);
    setFinished(true);
  }

  if (finished) {
    return jsxs("div", {
      className: "mx-auto max-w-2xl",
      children: [
        jsx("p", { className: "text-[11px] font-medium uppercase tracking-[0.18em] text-muted", children: paper.title }),
        jsxs("h1", { className: "mt-2 font-display text-4xl font-semibold", children: [total, "/", paper.totalMarks] }),
        jsx("p", {
          className: "mt-2 text-muted",
          children: "Multiple-choice answers are marked exactly. Written answers use the marks you gave yourself against the mark scheme. This is practice, not an official mark — check your self-marking with your teacher.",
        }),
        unmarked > 0 && jsx("p", { className: "pgce-note", children: `${unmarked} written answer(s) were not self-marked and count as 0.` }),
        jsx("ol", {
          className: "mt-8 space-y-3",
          children: questions.map((item) =>
            jsxs("li", {
              className: "rounded-lg border border-border bg-surface px-4 py-3",
              children: [
                jsxs("p", {
                  className: "text-xs font-semibold text-primary",
                  children: ["Q", item.number, " · ", marksFor(item), "/", item.marks, item.options ? "" : " (self-marked)"],
                }),
                jsx("p", { className: "mt-1 text-sm", children: item.stem }),
                jsx("p", { className: "mt-2 text-sm text-muted", children: item.modelAnswer }),
              ],
            }, item.id)
          ),
        }),
        jsx(Button, { className: "mt-6", onClick: () => setFinished(false), children: "Review questions" }),
      ],
    });
  }

  return jsxs("div", {
    className: "mx-auto max-w-2xl",
    children: [
      jsxs("div", {
        className: "flex items-center justify-between gap-3",
        children: [
          jsxs("p", { className: "text-[11px] font-medium uppercase tracking-[0.16em] text-muted", children: [paper.title, " · Q", q.number] }),
          jsxs("p", { className: "tabular-nums text-sm text-muted", children: [index + 1, "/", questions.length, " · ", total, " marks so far"] }),
        ],
      }),
      jsx("div", {
        className: "mt-3 h-1 overflow-hidden rounded-full bg-sunken",
        children: jsx("div", { className: "h-full bg-primary", style: { width: `${((index + 1) / questions.length) * 100}%` } }),
      }),
      q.scenario && jsx("p", { className: "mt-6 rounded-md bg-bg-warm px-3 py-3 text-sm leading-relaxed", children: q.scenario }),
      jsx("h1", { className: "mt-6 font-display text-2xl font-semibold leading-snug", children: q.stem }),
      jsxs("p", {
        className: "mt-2 text-xs font-medium uppercase tracking-wider text-subtle",
        children: [q.marks, " mark", q.marks === 1 ? "" : "s", " · ", q.ao, q.qwc ? " · QWC" : ""],
      }),
      isMcq &&
        jsx("ol", {
          className: "mt-6 flex flex-col gap-2",
          children: q.options.map((opt, i) => {
            const right = isRevealed && i === q.answerIndex;
            const wrong = isRevealed && choice === i && i !== q.answerIndex;
            return jsx("li", {
              children: jsxs("button", {
                type: "button",
                onClick: () => setChoices((c) => ({ ...c, [q.id]: i })),
                className: cn(
                  "flex w-full items-start gap-3 rounded-lg border px-3 py-3.5 text-left text-sm",
                  choice === i && !isRevealed && "border-primary bg-primary-soft/50",
                  right && "border-tested bg-tested/10",
                  wrong && "border-ready bg-ready/10",
                  choice !== i && !isRevealed && "border-border bg-surface"
                ),
                children: [
                  jsx("span", {
                    className: "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border border-border text-xs font-semibold",
                    children: LETTERS[i],
                  }),
                  jsx("span", { className: "pt-0.5", children: opt }),
                ],
              }),
            }, i);
          }),
        }),
      !isMcq &&
        jsxs(React.Fragment, {
          children: [
            jsx(Textarea, {
              className: "mt-6",
              value: text,
              onChange: (e) => setWritten((w) => ({ ...w, [q.id]: e.target.value })),
              placeholder: "Write as you would in the exam hall.",
            }),
            jsx(PersonalNote, {}),
          ],
        }),
      isRevealed &&
        jsxs("div", {
          className: "mt-6 rounded-lg border border-border bg-surface px-4 py-4",
          children: [
            jsx("p", { className: "text-xs font-medium uppercase tracking-wider text-muted", children: "Model answer" }),
            jsx("p", { className: "mt-2 text-sm leading-relaxed", children: q.modelAnswer }),
            jsx("ul", { className: "mt-3 list-disc space-y-1 pl-5 text-sm text-muted", children: q.markScheme.map((m) => jsx("li", { children: m }, m)) }),
            !isMcq &&
              jsxs("div", {
                className: "pgce-selfmark",
                children: [
                  jsx("p", { className: "text-sm font-medium", children: "Mark your own answer: how many marks does it earn against the mark scheme?" }),
                  jsx("div", {
                    className: "mt-2 flex flex-wrap gap-2",
                    children: Array.from({ length: q.marks + 1 }, (_, n) =>
                      jsx("button", {
                        type: "button",
                        "aria-pressed": selfMarks[q.id] === n,
                        className: cn("pgce-mark-btn", selfMarks[q.id] === n && "pgce-mark-btn-on"),
                        onClick: () => setSelfMarks((s) => ({ ...s, [q.id]: n })),
                        children: String(n),
                      }, n)
                    ),
                  }),
                ],
              }),
          ],
        }),
      jsxs("div", {
        className: "mt-6 flex flex-wrap gap-2",
        children: [
          jsx(Button, {
            variant: "outline",
            disabled: !canReveal,
            onClick: () => setRevealed((r) => ({ ...r, [q.id]: true })),
            children: "Show answer",
          }),
          index > 0 && jsx(Button, { variant: "ghost", onClick: () => setIndex((i) => i - 1), children: "Previous" }),
          index + 1 < questions.length
            ? jsx(Button, { onClick: () => setIndex((i) => i + 1), children: "Next" })
            : jsx(Button, { onClick: finish, children: "Finish paper" }),
        ],
      }),
      !canReveal &&
        jsx("p", {
          className: "pgce-note",
          children: isMcq ? "Choose an option first." : `Write at least ${MIN_WORDS} words to see the model answer.`,
        }),
    ],
  });
}

function PaperPage() {
  const { paperId } = paperRoute.useParams();
  const paper = papers.find((p) => p.id === paperId);
  if (!paper) {
    return jsxs("div", {
      children: [
        jsx("h1", { className: "font-display text-3xl font-semibold", children: "Paper not found" }),
        jsx(Link, { to: "/practice", className: "mt-4 inline-block text-sm text-primary", children: "Back to practice" }),
      ],
    });
  }
  return jsx(PaperPlayer, { paper });
}

export { PaperPage as component };
