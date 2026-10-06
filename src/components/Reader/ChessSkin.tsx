import { useEffect, useState } from "react";
import type { ReaderItem } from "../../content";
import styles from "./Reader.module.css";
import { useUi, type ReaderUi } from "./ui";

/** The chess.com public API (no key, CORS open): https://www.chess.com/news/view/published-data-api */
const statsUrl = (user: string) => `https://api.chess.com/pub/player/${encodeURIComponent(user)}/stats`;

interface Rated {
  last?: { rating: number };
  best?: { rating: number };
}
interface Stats {
  chess_blitz?: Rated;
  chess_rapid?: Rated;
  chess_daily?: Rated;
  tactics?: { highest?: { rating: number } };
}

interface Tile {
  label: string;
  current?: number;
  best?: number;
}

/** One fetch per visit: reopening the board shouldn't ask chess.com again. */
const cache = new Map<string, Promise<Stats>>();
function loadStats(user: string): Promise<Stats> {
  if (!cache.has(user)) {
    const p = fetch(statsUrl(user)).then((r) => {
      if (!r.ok) throw new Error(`chess.com answered ${r.status}`);
      return r.json() as Promise<Stats>;
    });
    p.catch(() => cache.delete(user));
    cache.set(user, p);
  }
  return cache.get(user)!;
}

function tilesOf(s: Stats): Tile[] {
  return [
    { label: "Blitz", current: s.chess_blitz?.last?.rating, best: s.chess_blitz?.best?.rating },
    { label: "Rapid", current: s.chess_rapid?.last?.rating, best: s.chess_rapid?.best?.rating },
    { label: "Daily", current: s.chess_daily?.last?.rating, best: s.chess_daily?.best?.rating },
    { label: "Puzzles", best: s.tactics?.highest?.rating },
  ].filter((t) => t.current !== undefined || t.best !== undefined);
}

/** The punchline under the board: the widest gap between a best and a current rating, owned up to. */
function confession(tiles: Tile[], ui: ReaderUi): string | null {
  const worst = tiles
    .filter((t) => t.current !== undefined && t.best !== undefined && t.best - t.current >= 50)
    .sort((a, b) => b.best! - b.current! - (a.best! - a.current!))[0];
  return worst ? ui.chessJoke(ui.chessTiles[worst.label].toLowerCase(), worst.best!, worst.current!) : null;
}

/**
 * The chessboard on the shelf, opened: a line or two about playing, the owner's live chess.com ratings (current
 * and best), and a link to challenge her. The ratings are fetched when the board opens; if chess.com can't be
 * reached, the scoreboard simply isn't shown.
 */
export function ChessSkin({ item }: { item: ReaderItem }) {
  const ui = useUi();
  const user = item.chessUsername!;
  const [tiles, setTiles] = useState<Tile[] | "loading" | "failed">("loading");
  const page = item.pages[0];

  useEffect(() => {
    let live = true;
    loadStats(user).then(
      (s) => live && setTiles(tilesOf(s)),
      (e: unknown) => {
        console.warn("[ChessSkin] could not load chess.com ratings", e);
        if (live) setTiles("failed");
      },
    );
    return () => {
      live = false;
    };
  }, [user]);

  const line = Array.isArray(tiles) ? confession(tiles, ui) : null;

  return (
    <div className={styles.chess}>
      <div className={styles.chessBoard} aria-hidden="true" />
      <span className={styles.chessKicker}>{page?.kicker}</span>
      <h2 className={styles.chessHeading}>{item.title}</h2>
      {page?.lines.map((l, i) => (
        <p key={i} className={styles.chessLine}>
          {l}
        </p>
      ))}

      {tiles !== "failed" && (
        <div className={styles.chessScores} aria-busy={tiles === "loading"} aria-label={ui.chessRatings}>
          {tiles === "loading"
            ? ["Blitz", "Rapid", "Daily", "Puzzles"].map((l) => (
                <div key={l} className={styles.chessTile}>
                  <span className={styles.chessTileLabel}>{ui.chessTiles[l]}</span>
                  <span className={styles.chessTileValue}>…</span>
                </div>
              ))
            : tiles.map((t) => (
                <div key={t.label} className={styles.chessTile}>
                  <span className={styles.chessTileLabel}>{ui.chessTiles[t.label]}</span>
                  <span className={styles.chessTileValue}>{t.current ?? t.best}</span>
                  <span className={styles.chessTileBest}>{t.current !== undefined ? `${ui.best} ${t.best ?? "—"}` : ui.best}</span>
                </div>
              ))}
        </div>
      )}
      {line && <p className={styles.chessConfession}>{line}</p>}

      {item.links?.map((l) => (
        <a key={l.href} className={styles.chessLink} href={l.href} target="_blank" rel="noreferrer">
          {l.label}
        </a>
      ))}
    </div>
  );
}
