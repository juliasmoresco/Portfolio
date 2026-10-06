import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { ReaderItem, ReaderPage } from "../../content";
import { Line } from "./parts";
import styles from "./Reader.module.css";

const DATES = /\d{2}\/\d{4}|\b(19|20)\d{2}\b.*[–-]/;

interface Job {
  company: string;
  roles: { title: string; detail?: string; dates?: string; text: string }[];
}

/** The content file's résumé pages, read back into résumé sections (the Notion sync writes them as book pages). */
function readResume(pages: ReaderPage[]) {
  const of = (kicker: string) => pages.filter((p) => p.kicker === kicker);
  const profile = of("Profile").flatMap((p) => p.lines);

  const jobs: Job[] = [];
  for (const p of of("Experience")) {
    const [title, ...rest] = p.lines;
    const dates = rest.find((l) => DATES.test(l) && l.length < 30);
    const text = rest[rest.length - 1];
    const detail = rest.filter((l) => l !== dates && l !== text).join(" · ") || undefined;
    const company = p.heading ?? "";
    const role = { title, detail, dates, text };
    const last = jobs[jobs.length - 1];
    if (last && last.company === company) last.roles.push(role);
    else jobs.push({ company, roles: [role] });
  }

  const education = of("Education")
    .flatMap((p) => p.lines)
    .map((l) => {
      const [what, where] = l.split(" — ");
      return { what, where };
    });
  const skillPages = of("Skills");
  const skills = skillPages
    .filter((p) => p.heading !== "Languages")
    .flatMap((p) => p.lines)
    .map((l) => {
      const at = l.indexOf(":");
      return at > 0 ? { label: l.slice(0, at), items: l.slice(at + 1).trim() } : { label: "", items: l };
    });
  const languages = skillPages.filter((p) => p.heading === "Languages").flatMap((p) => p.lines);

  // Testimonials run over several pages with the same heading (the person); the last line is who they are.
  const quotes: { name: string; role: string; text: string[] }[] = [];
  for (const p of of("Testimonials")) {
    const last = quotes[quotes.length - 1];
    if (last && last.name === p.heading) last.text.push(...p.lines);
    else quotes.push({ name: p.heading ?? "", role: "", text: [...p.lines] });
  }
  for (const q of quotes) {
    const tail = q.text[q.text.length - 1];
    if (tail && !/[”"]$/.test(tail.trim()) && tail.length < 90) q.role = q.text.pop()!;
  }
  return { profile, jobs, education, skills, languages, quotes };
}

interface Block {
  key: string;
  /** The section heading it sits under ("Experience"); shown again, "continued", when the section runs onto a new page. */
  section: string;
  node: ReactNode;
  /** Runs straight on into the next block, with no gap: a testimonial split into paragraphs so it can turn the page. */
  joined?: boolean;
}

interface Sheet {
  main: Block[];
  side: Block[];
}

/**
 * Packs blocks into pages of `cap(page)` px, counting a section heading wherever a page or a new section starts.
 * `height(page, key)` can differ by page: a block is shorter on a sheet where it has the full width.
 */
function pack(blocks: Block[], height: (page: number, key: string) => number, headH: number, cap: (page: number) => number): Block[][] {
  const pages: Block[][] = [[]];
  let used = 0;
  let prev = "";
  for (const b of blocks) {
    let page = pages.length - 1;
    let cost = height(page, b.key) + (b.section !== prev ? headH : 0);
    if (used > 0 && used + cost > cap(page)) {
      pages.push([]);
      page += 1;
      used = 0;
      cost = height(page, b.key) + headH;
    }
    pages[pages.length - 1].push(b);
    used += cost;
    prev = b.section;
  }
  return pages;
}

/**
 * The résumé as a résumé: sheets of paper, never scrolled. The name and contacts head the first sheet; profile and
 * work history run down the main column and education, skills and languages down the side, testimonials last. How
 * much goes on each sheet is measured from the sheet itself, so it fits whatever the screen; ‹ › (or the arrow keys)
 * turn the sheets. On a phone it is one column.
 */
export function ResumeSkin({ item, compact = false }: { item: ReaderItem; compact?: boolean }) {
  const r = useMemo(() => readResume(item.pages), [item.pages]);
  const [at, setAt] = useState(0);
  const [sheets, setSheets] = useState<Sheet[] | null>(null);
  const sheetRef = useRef<HTMLElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLElement>(null);
  const headerH = useRef(0);

  const { main, side } = useMemo(() => {
    const main: Block[] = [];
    const side: Block[] = [];
    if (r.profile.length) {
      main.push({
        key: "profile",
        section: "Profile",
        node: r.profile.map((l, i) => <Line key={i} text={l} />),
      });
    }
    // One block per role, the company named over the first, so a company with several roles (Ambush's clients,
    // say) can carry on over the page.
    r.jobs.forEach((job, i) =>
      job.roles.forEach((role, j) =>
        main.push({
          key: `job${i}-${j}`,
          section: "Experience",
          joined: j < job.roles.length - 1,
          node: (
            <div className={styles.resumeJob}>
              {j === 0 && <h4 className={styles.resumeCompany}>{job.company}</h4>}
              <div className={`${styles.resumeRoleBlock} ${j > 0 ? styles.resumeRoleNext : ""}`}>
                <div className={styles.resumeRoleLine}>
                  <span className={styles.resumeRoleTitle}>{role.title}</span>
                  {role.dates && <span className={styles.resumeDates}>{role.dates}</span>}
                </div>
                {role.detail && <p className={styles.resumeDetail}>{role.detail}</p>}
                <p className={styles.resumeText}>{role.text}</p>
              </div>
            </div>
          ),
        }),
      ),
    );
    const list = (key: string, section: string, rows: { a: string; b?: string }[]) => ({
      key,
      section,
      node: (
        <ul className={styles.resumeList}>
          {rows.map((x) => (
            <li key={x.a + x.b}>
              {x.a && <strong>{x.a}</strong>}
              {x.b && <span>{x.b}</span>}
            </li>
          ))}
        </ul>
      ),
    });
    if (r.education.length) side.push(list("education", "Education", r.education.map((e) => ({ a: e.what, b: e.where }))));
    if (r.skills.length) side.push(list("skills", "Skills", r.skills.map((x) => ({ a: x.label, b: x.items }))));
    if (r.languages.length) {
      side.push(
        list(
          "languages",
          "Languages",
          r.languages.map((l) => {
            const [a, b] = l.split(/\s+[–-]\s+/);
            return { a, b };
          }),
        ),
      );
    }
    // One block per paragraph, so a long testimonial carries on over the page instead of running off the sheet.
    r.quotes.forEach((q, i) =>
      q.text.forEach((t, j) => {
        const last = j === q.text.length - 1;
        main.push({
          key: `quote${i}-${j}`,
          section: "What people say",
          joined: !last,
          node: (
            <figure className={styles.resumeQuote}>
              <blockquote>
                <p>{t}</p>
              </blockquote>
              {last && (
                <figcaption>
                  <strong>{q.name}</strong>
                  {q.role && <span> · {q.role}</span>}
                </figcaption>
              )}
            </figure>
          ),
        });
      }),
    );
    // On a phone it is all one column: work history, then the side column, then testimonials.
    if (compact) {
      const quotes = main.filter((b) => b.key.startsWith("quote"));
      return { main: [...main.filter((b) => !b.key.startsWith("quote")), ...side, ...quotes], side: [] };
    }
    return { main, side };
  }, [r, compact]);

  // Measure every block at the columns' real widths, then deal them onto sheets.
  const paginate = useCallback(() => {
    const sheet = sheetRef.current;
    const m = measureRef.current;
    const head = headRef.current;
    if (!sheet || !m || !head) return;
    // Each block measured twice: in the main column beside the side column, and across the full width.
    const narrow = new Map<string, number>();
    const wide = new Map<string, number>();
    m.querySelectorAll<HTMLElement>("[data-block]").forEach((el) => narrow.set(el.dataset.block!, el.offsetHeight));
    sheet.querySelectorAll<HTMLElement>("[data-wide]").forEach((el) => wide.set(el.dataset.wide!, el.offsetHeight));
    const headH = (m.querySelector<HTMLElement>("[data-heading]")?.offsetHeight ?? 0);
    const cs = getComputedStyle(sheet);
    const body = sheet.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - (sheet.querySelector<HTMLElement>("[data-pager]")?.offsetHeight ?? 0);
    // The header is only shown on the first sheet; keep its last measured height for when another sheet is up.
    if (head.offsetHeight > 0) headerH.current = head.offsetHeight + parseFloat(getComputedStyle(head).marginBottom || "0");
    const first = body - headerH.current;
    const cap = (page: number) => (page === 0 ? first : body);
    const sidePages = side.length ? pack(side, (_, k) => narrow.get(k) ?? 0, headH, cap) : [];
    // Once the side column has run out, the main column takes the whole width of the sheet.
    const mainPages = pack(main, (page, k) => (page < sidePages.length ? narrow.get(k) : wide.get(k)) ?? 0, headH, cap);
    const n = Math.max(mainPages.length, sidePages.length);
    setSheets(Array.from({ length: n }, (_, i) => ({ main: mainPages[i] ?? [], side: sidePages[i] ?? [] })));
  }, [main, side]);

  useLayoutEffect(() => {
    paginate();
    const sheet = sheetRef.current;
    if (!sheet) return;
    const ro = new ResizeObserver(() => paginate());
    ro.observe(sheet);
    void document.fonts?.ready.then(() => paginate());
    return () => ro.disconnect();
  }, [paginate]);

  const count = sheets?.length ?? 1;
  const page = Math.min(at, count - 1);
  const go = useCallback((d: 1 | -1) => setAt((a) => Math.min(Math.max(a + d, 0), count - 1)), [count]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  // A column's blocks, with a section heading wherever a section starts on this sheet.
  const column = (blocks: Block[], all: Block[]) =>
    blocks.map((b, i) => {
      const fresh = i === 0 || blocks[i - 1].section !== b.section;
      const continued = all.findIndex((x) => x.section === b.section) !== all.indexOf(b);
      return (
        <div key={b.key} className={`${styles.resumeBlock} ${b.joined ? styles.resumeJoined : ""}`}>
          {fresh && (
            <h3 className={styles.resumeH}>
              {b.section}
              {continued && <span className={styles.resumeCont}> · continued</span>}
            </h3>
          )}
          {b.node}
        </div>
      );
    });

  const shown = sheets?.[page];
  return (
    <div className={styles.resume}>
      <article ref={sheetRef} className={styles.resumeSheet}>
        <header ref={headRef} className={styles.resumeHead} hidden={page !== 0}>
          <div>
            <h2 className={styles.resumeName}>{item.person ?? item.title}</h2>
            {item.role && <p className={styles.resumeRole}>{item.role}</p>}
          </div>
          <ul className={styles.resumeContact}>
            {item.location && <li>{item.location}</li>}
            {item.links?.map((l) => (
              <li key={l.href}>
                <a href={l.href} {...(/^https?:/.test(l.href) ? { target: "_blank", rel: "noreferrer" } : {})}>
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </header>

        {shown && (
          <div key={page} className={`${styles.resumeBody} ${shown.side.length ? "" : styles.resumeBodySingle}`}>
            <div className={styles.resumeMain}>{column(shown.main, main)}</div>
            {shown.side.length > 0 && <aside className={styles.resumeSide}>{column(shown.side, side)}</aside>}
          </div>
        )}

        <footer className={styles.resumePager} data-pager>
          {count > 1 && (
            <>
              <button type="button" className={styles.resumeTurn} aria-label="Previous page of the résumé" disabled={page === 0} onClick={() => go(-1)}>
                ‹
              </button>
              <span>
                {page + 1} / {count}
              </span>
              <button type="button" className={styles.resumeTurn} aria-label="Next page of the résumé" disabled={page === count - 1} onClick={() => go(1)}>
                ›
              </button>
            </>
          )}
        </footer>

        {/* Off-screen copies at the same widths, for measuring how tall each block is. */}
        <div ref={measureRef} className={`${styles.resumeBody} ${side.length ? "" : styles.resumeBodySingle} ${styles.resumeMeasure}`} aria-hidden="true">
          <div className={styles.resumeMain}>
            <div data-heading className={styles.resumeHeadingProbe}>
              <h3 className={styles.resumeH}>Heading</h3>
            </div>
            {main.map((b) => (
              <div key={b.key} data-block={b.key} className={`${styles.resumeBlock} ${b.joined ? styles.resumeJoined : ""}`}>
                {b.node}
              </div>
            ))}
          </div>
          {side.length > 0 && (
            <aside className={styles.resumeSide}>
              {side.map((b) => (
                <div key={b.key} data-block={b.key} className={`${styles.resumeBlock} ${b.joined ? styles.resumeJoined : ""}`}>
                  {b.node}
                </div>
              ))}
            </aside>
          )}
        </div>
        <div className={`${styles.resumeBody} ${styles.resumeBodySingle} ${styles.resumeMeasure}`} aria-hidden="true">
          <div className={styles.resumeMain}>
            {main.map((b) => (
              <div key={b.key} data-wide={b.key} className={`${styles.resumeBlock} ${b.joined ? styles.resumeJoined : ""}`}>
                {b.node}
              </div>
            ))}
          </div>
        </div>
      </article>
    </div>
  );
}
