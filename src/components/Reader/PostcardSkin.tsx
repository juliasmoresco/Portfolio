import { useMemo, useState } from "react";
import type { ReaderItem } from "../../content";
import { postcardFrontSvg } from "../../scene/postcardArt";
import styles from "./Reader.module.css";

/** A stamp: a perforated edge round a cuia of chimarrão, the south of Brazil's mate gourd. */
function Stamp() {
  const holes = Array.from({ length: 10 }, (_, i) => i);
  return (
    <svg className={styles.postcardStamp} viewBox="0 0 80 96" aria-hidden="true">
      <rect x="2" y="2" width="76" height="92" fill="#fbf6ea" stroke="#d9c9ad" />
      {holes.map((i) => (
        <g key={i} fill="#efe6d4">
          <circle cx={4 + i * 8} cy="2" r="2.4" />
          <circle cx={4 + i * 8} cy="94" r="2.4" />
          {i < 12 && <circle cx="2" cy={6 + i * 9.4} r="2.4" />}
          {i < 12 && <circle cx="78" cy={6 + i * 9.4} r="2.4" />}
        </g>
      ))}
      <rect x="9" y="9" width="62" height="78" fill="#d9e6d4" />
      <path d="M26 44 Q24 70 40 74 Q56 70 54 44 Z" fill="#7a5132" />
      <ellipse cx="40" cy="44" rx="14" ry="4" fill="#5b8f45" />
      <path d="M44 44 L52 18 L55 19 L47 45 Z" fill="#c9a24a" />
      <text x="40" y="84" textAnchor="middle" fontFamily="Georgia, serif" fontSize="9" fill="#3a2733" letterSpacing="1">
        BRASIL
      </text>
    </svg>
  );
}

/** The postmark, inked across the stamp's corner. */
function Postmark() {
  return (
    <svg className={styles.postcardPostmark} viewBox="0 0 100 100" aria-hidden="true">
      <defs>
        <path id="pm-arc" d="M50 50 m-34 0 a34 34 0 1 1 68 0 a34 34 0 1 1 -68 0" />
      </defs>
      <g fill="none" stroke="#3b4a7a" strokeWidth="2" opacity="0.7">
        <circle cx="50" cy="50" r="44" />
        <circle cx="50" cy="50" r="27" />
      </g>
      <text fontFamily="Georgia, serif" fontSize="10" fill="#3b4a7a" opacity="0.75" letterSpacing="1.5">
        <textPath href="#pm-arc">PORTO ALEGRE · RS · BRASIL ·</textPath>
      </text>
      <text x="50" y="55" textAnchor="middle" fontFamily="Georgia, serif" fontSize="13" fill="#3b4a7a" opacity="0.75">
        RS
      </text>
    </svg>
  );
}

/** From Rio Pardo to Porto Alegre along the Jacuí, as a little strip map. */
function Route() {
  return (
    <svg className={styles.postcardRoute} viewBox="0 0 300 70" aria-label="Map: Rio Pardo in the west, Porto Alegre in the east, joined by the Jacuí river">
      <path d="M24 30 C70 10 92 52 140 34 S216 18 276 36" fill="none" stroke="#7fa6c9" strokeWidth="5" strokeLinecap="round" />
      <path d="M24 30 C70 10 92 52 140 34 S216 18 276 36" fill="none" stroke="#3a2733" strokeWidth="1.2" strokeDasharray="2 5" opacity="0.6" />
      <circle cx="24" cy="30" r="6" fill="#d62300" stroke="#fbf6ea" strokeWidth="2" />
      <circle cx="276" cy="36" r="6" fill="#d62300" stroke="#fbf6ea" strokeWidth="2" />
      <text x="24" y="58" textAnchor="middle" fontFamily="Georgia, serif" fontSize="12" fill="#3a2733">
        Rio Pardo
      </text>
      <text x="276" y="62" textAnchor="middle" fontFamily="Georgia, serif" fontSize="12" fill="#3a2733">
        Porto Alegre
      </text>
      <text x="150" y="22" textAnchor="middle" fontFamily="Karla, 'Helvetica Neue', Arial, sans-serif" fontSize="10.5" fill="#4d6f91">
        the Jacuí river
      </text>
    </svg>
  );
}

/**
 * The postcard on the wall, close up: the front is the illustration (sunset over the Guaíba); clicking it, or Turn
 * over, flips it to the back — a short handwritten note (the content file's lines), stamp, postmark, and a little map
 * of the way from where the owner was born to where they live now.
 */
export function PostcardSkin({ item }: { item: ReaderItem }) {
  const [back, setBack] = useState(false);
  const front = useMemo(() => postcardFrontSvg(), []);
  const lines = item.pages[0]?.lines ?? [];
  return (
    <div className={styles.postcardWrap}>
      <span className={styles.chessKicker}>{item.kind}</span>
      <h2 className={styles.chessHeading}>{item.title}</h2>
      <button type="button" className={styles.postcard} data-back={back || undefined} onClick={() => setBack((b) => !b)} aria-label={back ? "Postcard, back (turn over)" : "Postcard, front (turn over)"}>
        <span className={styles.postcardInner}>
          <span className={styles.postcardFront} dangerouslySetInnerHTML={{ __html: front }} aria-hidden={back} />
          <span className={styles.postcardBack} aria-hidden={!back}>
            <span className={styles.postcardMessage}>
              {lines.map((l, i) => (
                <span key={i} className={styles.postcardLine}>
                  {l}
                </span>
              ))}
            </span>
            <span className={styles.postcardSide}>
              <span className={styles.postcardStamps}>
                <Stamp />
                <Postmark />
              </span>
              <span className={styles.postcardAddress}>
                <span>To: you,</span>
                <span>reading this</span>
              </span>
            </span>
            <span className={styles.postcardMap}>
              <Route />
            </span>
          </span>
        </span>
      </button>
      <button type="button" className={styles.chessLink} onClick={() => setBack((b) => !b)}>
        {back ? "See the front" : "Turn over"}
      </button>
    </div>
  );
}
