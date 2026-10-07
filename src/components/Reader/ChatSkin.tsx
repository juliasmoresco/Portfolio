import { useContext, useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { getReaderItem, imageUrls, type ChatAnswer, type ReaderItem } from "../../content";
import { matchAnswer } from "../../content/chat";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";
import { emitSelect } from "../../scene/events";
import type { SceneHotspotId } from "../../scene/hotspots";
import { Inline } from "./parts";
import styles from "./Reader.module.css";
import { ZoomContext } from "./zoom";
import { useUi } from "./ui";

type Message = { key: number; from: "zuko" | "you"; text: string; open?: { id: string; label: string } };

/** How long Zuko "types" before a bubble: longer for a longer line, within limits. */
const typingMs = (text: string, reduced: boolean) => (reduced ? 150 : Math.min(450 + text.length * 9, 1300));

/**
 * Zuko, the cat, as a chatbot. He was taught to talk with buttons, so the questions he can answer are big round
 * buttons; a visitor can also type, and the question is matched to an answer by its words (content/chat.ts). Every
 * answer is written in the content file from the rest of the portfolio, and some offer to open that object (the
 * résumé, the case, the phone). Nothing leaves the page. His face is a real photo; clicking it shows him at his
 * buttons, as proof.
 */
export function ChatSkin({ item }: { item: ReaderItem }) {
  const ui = useUi();
  const chat = item.chat!;
  const reduced = usePrefersReducedMotion();
  const enlarge = useContext(ZoomContext);
  const photo = chat.photo && imageUrls[chat.photo.image] ? chat.photo : undefined;
  const byId = (id: string) => chat.answers.find((a) => a.id === id);
  const [messages, setMessages] = useState<Message[]>([]);
  const [typing, setTyping] = useState(true);
  const [offer, setOffer] = useState<string[]>(chat.start);
  const [asked, setAsked] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const logRef = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);
  const seq = useRef(0);

  // Zuko says his lines one bubble at a time, "typing" before each; then `done` runs.
  const say = (lines: string[], open?: Message["open"], done?: () => void) => {
    timers.current.forEach(window.clearTimeout);
    timers.current = [];
    setTyping(true);
    let at = 0;
    lines.forEach((text, i) => {
      at += typingMs(text, reduced);
      timers.current.push(
        window.setTimeout(() => {
          const last = i === lines.length - 1;
          setMessages((m) => [...m, { key: ++seq.current, from: "zuko", text, open: last ? open : undefined }]);
          if (last) {
            setTyping(false);
            done?.();
          }
        }, at),
      );
    });
  };

  useEffect(() => {
    say(chat.greeting);
    return () => timers.current.forEach(window.clearTimeout);
  }, []);

  // Keep the newest bubble in view.
  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTo({ top: log.scrollHeight, behavior: reduced ? "auto" : "smooth" });
  }, [messages, typing, reduced]);

  const nextOffer = (answer: ChatAnswer | undefined, nowAsked: string[]) => {
    const pool = [...(answer?.next ?? []), ...chat.start, ...chat.answers.filter((a) => a.next).map((a) => a.id)];
    const fresh = [...new Set(pool)].filter((id) => !nowAsked.includes(id) && byId(id));
    return (fresh.length >= 2 ? fresh : [...new Set([...(answer?.next ?? []), ...chat.start])].filter((id) => id !== answer?.id)).slice(0, 4);
  };

  const respond = (question: string, answer: ChatAnswer | undefined) => {
    setMessages((m) => [...m, { key: ++seq.current, from: "you", text: question }]);
    const nowAsked = answer ? [...asked, answer.id] : asked;
    setAsked(nowAsked);
    setOffer([]);
    const open = answer ? answer.open : chat.fallbackOpen;
    say(answer ? answer.reply : chat.fallback, open && getReaderItem(open.id) ? open : undefined, () => setOffer(nextOffer(answer, nowAsked)));
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const q = draft.trim();
    if (!q || typing) return;
    setDraft("");
    respond(q, matchAnswer(q, chat.answers));
  };

  return (
    <div className={styles.chat}>
      <header className={styles.chatHead}>
        {photo ? (
          <button
            type="button"
            className={styles.chatAvatar}
            aria-label={`${photo.alt} (${ui.enlarge})`}
            title="Proof that I talk with buttons"
            onClick={() => enlarge({ images: [imageUrls[photo.image]], alt: photo.alt, fit: true })}
          >
            <img src={imageUrls[chat.avatar]} alt="" draggable={false} />
          </button>
        ) : (
          <span className={styles.chatAvatar}>
            <img src={imageUrls[chat.avatar]} alt="" draggable={false} />
          </span>
        )}
        <span className={styles.chatWho}>
          <span className={styles.chatName}>{item.title}</span>
          <span className={styles.chatStatus}>{typing ? "typing…" : item.kind}</span>
        </span>
      </header>

      <div ref={logRef} className={styles.chatLog} role="log" aria-live="polite" aria-label={`Conversation with ${item.title}`}>
        {messages.map((m) => (
          <div key={m.key} className={styles.chatRow} data-from={m.from}>
            <p className={styles.chatBubble}>
              <Inline text={m.text} />
            </p>
            {m.open && (
              <button type="button" className={styles.chatOpen} onClick={() => emitSelect({ id: m.open!.id as SceneHotspotId })}>
                {m.open.label} →
              </button>
            )}
          </div>
        ))}
        {typing && (
          <div className={styles.chatRow} data-from="zuko" aria-hidden="true">
            <p className={`${styles.chatBubble} ${styles.chatTyping}`}>
              <span />
              <span />
              <span />
            </p>
          </div>
        )}
      </div>

      <div className={styles.chatButtons} role="group" aria-label={ui.zukoKnows}>
        {offer.map((id, i) => {
          const a = byId(id)!;
          return (
            <button key={id} type="button" className={styles.chatKey} style={{ "--i": i } as CSSProperties} disabled={typing} onClick={() => respond(a.button, a)}>
              {a.button}
            </button>
          );
        })}
      </div>

      <form className={styles.chatForm} onSubmit={submit}>
        <input
          className={styles.chatInput}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={chat.placeholder}
          aria-label={ui.yourQuestion}
          maxLength={200}
          autoComplete="off"
          enterKeyHint="send"
        />
        <button type="submit" className={styles.chatSend} disabled={!draft.trim() || typing}>
          {ui.ask}
        </button>
      </form>
    </div>
  );
}
