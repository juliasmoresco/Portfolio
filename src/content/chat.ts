import type { ChatAnswer } from "./types";

/** Lower case, accents off, punctuation to spaces: "Júlia's UX?" → "julia s ux". */
export function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * The answer a typed question points to, or undefined when nothing does. Each keyword found scores: a phrase 3, a
 * whole word 2, a longer form of a word of four letters or more 1 ("design" in "designer"). The highest total wins;
 * on a tie, the answer listed first.
 */
export function matchAnswer(question: string, answers: readonly ChatAnswer[]): ChatAnswer | undefined {
  const q = normalize(question);
  if (!q) return undefined;
  const words = q.split(" ");
  let best: ChatAnswer | undefined;
  let bestScore = 0;
  for (const a of answers) {
    let score = 0;
    for (const raw of a.keywords) {
      const k = normalize(raw);
      if (!k) continue;
      if (k.includes(" ")) {
        if (` ${q} `.includes(` ${k} `)) score += 3;
      } else if (words.includes(k)) score += 2;
      else if (k.length >= 4 && words.some((w) => w.startsWith(k))) score += 1;
    }
    if (score > bestScore) {
      best = a;
      bestScore = score;
    }
  }
  return best;
}
