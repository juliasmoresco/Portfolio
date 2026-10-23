# Case visuals: readable compare screens, text before visuals, phone fixes

## What changed

**Compare pages with desktop screens**
- A version's two browser windows no longer overlap small (the one behind mostly hidden). One window shows at a time, filling the space, and a "Screen 1 · Screen 2" switch under it picks which; enlarging shows both. Same on desktop, tablet and phone (on a phone the window is full width at its screenshot's own height, up to 460px).

**Text before visuals**
- The compare pages that put the visual first (case 2 "Where a portability starts", case 3 "Three pillars", case 4 "Sketch, prototype, site") now set the text on the left and the visual on the right (`artRight`, EN + PT), so the section is read before its evidence.

**Quieter visual titles**
- A visual's title is a step under the section heading everywhere: desktop 1.55 vs 2.4; phone 19px (was 26px, above the heading's 22px); tablet 22px under 28px.

**Phone fixes (case 2)**
- Funnel ("Who took part"): each step's label shared a rule with the note under the funnel and took its top margin and padding, so the bars floated far above their numbers. Fixed.
- Final-result showcase: the screen names were boxes stretched across the row, text stuck at the top; they're now pills as wide as their label, text centred.

## How it was checked
- `tsc --noEmit` and `vitest run` (35 tests) pass.
- Checked in the browser at 1440×900 and 375×812, switching versions and screens.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
