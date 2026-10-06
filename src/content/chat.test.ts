import { describe, expect, it } from "vitest";
import { matchAnswer, normalize } from "./chat";
import { getReaderItem, imageUrls } from "./index";

const chat = getReaderItem("cat", "en")!.chat!;
const chatPt = getReaderItem("cat", "pt")!.chat!;
const ask = (q: string) => matchAnswer(q, chat.answers)?.id;

describe("Zuko's answers", () => {
  it("understands questions in Portuguese on the Portuguese site", () => {
    const askPt = (q: string) => matchAnswer(q, chatPt.answers)?.id;
    expect(askPt("Quem é a Júlia?")).toBe("who");
    expect(askPt("O que ela faz hoje?")).toBe("now");
    expect(askPt("Onde ela já trabalhou?")).toBe("experience");
    expect(askPt("Como falo com ela?")).toBe("contact");
    expect(askPt("Que idiomas ela fala?")).toBe("languages");
    expect(askPt("Ela dá mentoria?")).toBe("mentoring");
    expect(askPt("o que ela faz no fim de semana")).toBe("hobbies");
    // the buttons in Portuguese match their own answers
    for (const a of chatPt.answers) expect(askPt(a.button)).toBe(a.id);
  });

  it("normalizes accents, case and punctuation", () => {
    expect(normalize("Quem é a Júlia?")).toBe("quem e a julia");
  });

  it("finds the answer a question points to, in English or Portuguese", () => {
    expect(ask("Who is Julia?")).toBe("who");
    expect(ask("where does she work now?")).toBe("now");
    expect(ask("What companies has she worked for?")).toBe("experience");
    expect(ask("tell me about the burger king project")).toBe("case");
    expect(ask("how can I contact her")).toBe("contact");
    expect(ask("Onde ela estudou?")).toBe("education");
    expect(ask("does she speak english")).toBe("languages");
    expect(ask("what tools does she use")).toBe("tools");
    expect(ask("do you like treats")).toBe("zuko");
  });

  it("says so when nothing matches", () => {
    expect(ask("qwerty")).toBeUndefined();
    expect(ask("   ")).toBeUndefined();
  });

  it("has its pictures", () => {
    expect(imageUrls[chat.avatar]).toBeDefined();
    if (chat.photo) expect(imageUrls[chat.photo.image]).toBeDefined();
  });

  it("opens only items that exist", () => {
    for (const a of chat.answers) if (a.open) expect(getReaderItem(a.open.id), a.id).toBeDefined();
    if (chat.fallbackOpen) expect(getReaderItem(chat.fallbackOpen.id)).toBeDefined();
  });
});
