# Shelf colours, a working moon lamp, roomier Reader, and the Awwwards story in Case 4

## What changed

**Book colours on the shelf**
- The books that open nothing were dark jewel tones (burgundy, navy, near black) and stood out more than the cases, which only took half their colour. They are now warm neutrals (sand, kraft, cream, stone, taupe, olive, clay), the GLB's own decorative books included.
- Every shelf that opens something reads as one block of colour (mix 0.55 → 0.8), so colour now means "open me".
- Case 2 and Case 4 were yellow on the yellow lacquer: on the shelf they take a burnt orange and a deep teal (`SHELF_SPINES`); the Reader and the phone's cards keep their own colours. The Résumé gets a plum.

**Moon lamp**
- Hovering or clicking the lamp, or turning the hints off, set its emissive to black, so at night it lit the shelf while looking switched off. Letting go of a highlight now restores its glow.

**Reader**
- Books open about 12% larger on desktop (their own `--k`, 1.32). Checked at 1024×768, 1440×900 and 1920×1080: the pager still clears the bottom edge.
- The dark panels (trophy, llama, globe, chess) share one spacing rhythm: more room under the title, between paragraphs and before the button. The llama's and trophy's text is larger (0.8 → 0.9 on desktop, 12 → 14px on phones).

**Case 4: "Welcome to My Office"** (EN + PT)
- A page for the Awwwards Honorable Mention ("Menção Honrosa" in Portuguese), with the trophy in 3D. `model3d` can now show the trophy, which is built in code. A Recognition line in the overview too.
- A page on the phone layout: the wall shelf moves above the bookcase and Zuko to the front. Three real phone screenshots: the desktop layout on a phone, rearranged, and hints on.
- The quiz and "Open the office" now count 18 objects. The showcase intro is one line, so the list no longer reaches the page's edge.
- The showcase screenshots are retaken at 1600×960 with today's office.

## How it was checked
- `tsc --noEmit` and `vitest run` (35 tests) pass.
- In the browser at 1440×900 and 375×812, in English and Portuguese: the shelf in all four lights, the moon lamp after a click, each dark panel, the larger book, and the new Case 4 pages.

## Note
- Case 4's English pages are synced from Notion: `npm run sync` for case4 would overwrite these additions unless they are added in Notion too. The Portuguese file is not synced.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
