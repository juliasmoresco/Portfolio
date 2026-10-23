# Office objects as they are in the room, desktop Hints, tablet reading column

## What changed

**Zuko, Moka and the Johnny Cash poster open as the objects they are**
- The frame skin gets a `look` option (`"photo"` | `"poster"`), checked in `validate.ts`.
- `photo` (Zuko, Moka): the framed photo from the shelf, with a dark moulding and cream mount in the scene's `frameMat` / `mountMat` colours, and the caption under it in the UI font.
- `poster` (Johnny Cash): the print as it hangs on the wall, slightly tilted and shadowed, masking tape over its top corners, caption under it.
- Both size down on short windows so the caption still fits.

**Desktop: Hints button**
- A Hints pill beside the Menu (as on mobile) keeps the glow on every object that opens; both step aside while a Reader is open.
- An automatic glow on arrival was tried and dropped (too much, even at 40%); it's in the history, reverted.

**Tablet held upright: a reading column**
- Full-page reading at 640px+ runs down a centred 640px column in 17px type, instead of lines across the whole width (~110 characters at 820px). Text and visuals share the column's edges; the opening picture stays full width; the résumé is centred too.
- Phones are unchanged; a tablet held sideways still opens the book.

**Close button**
- Moving Close under the object as "Close ×" was tried and reverted: the × above the sheet's corner stays.

## How it was checked
- `tsc --noEmit` and `vitest run` (35 tests) pass.
- Checked in the browser at 1440×900, 820×1180 and 375×812.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
