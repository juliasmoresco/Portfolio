/**
 * How much text fits on a Reader page on desktop. Pure and import-free, so both the site's content test and the
 * Notion sync (which runs under plain Node) share the same rules.
 */

/**
 * Text height in px at a 1000px-wide stage (everything scales with the stage). A text column fits about 42
 * characters per 16px line, with a 5px gap between paragraphs. Counting characters alone under-counts pages made
 * of many short list items, which waste part of their last line and add gaps.
 */
export function estimateTextHeight(lines: string[]): number {
  const CHARS_PER_LINE = 42;
  const LINE = 16;
  const GAP = 5;
  return lines.reduce((h, l) => h + Math.max(1, Math.ceil(visibleLength(l) / CHARS_PER_LINE)) * LINE, 0) + GAP * Math.max(0, lines.length - 1);
}

/**
 * A line may use **bold** and start a list item ("- " bullet, "1. " number). The markers aren't shown, but a list item
 * is set in from the margin, which costs about as much room as three characters.
 */
export function visibleLength(line: string): number {
  const item = /^(?:- |\d+\. )/.test(line);
  const text = line.replace(/\*\*/g, "").replace(/^- /, "");
  return item ? text.length + 3 : text.length;
}

/** Room for text under the kicker and heading. A heading longer than ~22 characters wraps to a second line. */
export function textCapacity(heading: string): number {
  return heading.length > 22 ? 220 : 245;
}
