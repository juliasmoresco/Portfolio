# Updating the site from Notion

Notion is where the words and pictures live. `npm run sync` copies them into the site's content files.
It only changes files on your computer. **It never commits, pushes or publishes**: you look at what changed, and you decide.

## One-time setup (about 5 minutes)

1. **Create the key.** Go to <https://www.notion.so/profile/integrations> → *New integration* → name it "Portfolio sync",
   type *Internal*, pick your workspace. Under *Capabilities* leave only **Read content** on. Save, then copy the
   *Internal Integration Secret*.
2. **Let it see your portfolio.** Open the **Júlia Moresco Portfolio** page in Notion → `•••` (top right) →
   *Connections* → add "Portfolio sync". The Projects rows and case pages inside it are included automatically.
3. **Save the key on your computer.** In the project folder, copy `.env.example` to a new file named `.env` and paste the key
   after `NOTION_TOKEN=`. The `.env` file is git-ignored, so the key never leaves this computer.
   Don't paste the key into chats, commits or screenshots. If you ever do, revoke it on the integrations page and make a new one.

## Every time you update Notion

```bash
npm run sync:check     # see what would change; writes nothing
npm run sync           # do it
git diff --stat        # what changed, file by file
npm run dev            # look at it in the browser
```

Happy? Commit (and later push). Not happy? `git restore src/content` puts the text back, and `git clean -fd src/assets/cases`
removes newly downloaded pictures. That only works if what you had before the sync was committed, so **commit before you sync**.
Add `-- --only case1,about` to sync just some entries, for example `npm run sync -- --only case3`.

The sync prints a **"Worth a look"** list after each run: things in Notion it could not show (videos, embeds, tables), a case
without a cover, or a heading it expected and did not find. Nothing is dropped silently.

## Where each Notion piece goes

| In Notion | On the site |
| --- | --- |
| The five case pages | The five case books (title, industry, expertise and year come from the Projects row) |
| Case page **cover** | The picture on the book's first page |
| Bio at the top of the home page + **Testimonials** | The About book |
| **Education** | Studies folder |
| **Skills** and **Language** | Résumé folder |
| **Contact** (email only) and **Mentorship** | The phone (with the LinkedIn, Email and ADPList links) |

Not synced, on purpose: your **phone number** and **city** (they are never read into the site), your **photo** (until you say so;
switch `about.photo` in `notion.config.json`), and anything on the site that has no Notion page yet (chess, travels, llama, illustrations).

## Writing in Notion so it reads well in the book

- **A heading starts a new page group.** Use Heading 1–3 for sections; the text under each is split into pages automatically.
- **A short bold line on its own** ("Interview Insights") also starts a new page group. Bold text inside a sentence, or a bold label ending in a colon, stays as ordinary text.
- **An image closes its page.** Put a picture right after the paragraph it belongs to. Two pictures in a row share a page, side by side.
  The image's Notion caption becomes its caption. No image = a text-only page, with no empty picture area.
- **Case parts (Overview / Process / Outcome)** are decided by two headings per case, set in `notion.config.json`
  (`processStartsAt`, `outcomeStartsAt`). If you rename one of those headings in Notion, update it there too; the sync tells you when a heading is missing.
- **Numbered lists** keep their numbers; nested text under a list item stays with it.
- Text is published **exactly as written**, including typos, so proofread in Notion first.
- Pictures are resized to 1024px wide and stored as `.webp`. A replaced picture gets a new file name; pictures no longer in Notion are deleted from the site.

## If something goes wrong

| Message | Fix |
| --- | --- |
| "No NOTION_TOKEN found" | Step 3 above. |
| "Notion rejected the key (401)" | The key was copied wrong or revoked; make a new one. |
| "… was not found (404)" | Step 2 above: that page is not shared with the integration. |
| "no heading starting … " | You renamed a heading in Notion; update `notion.config.json`. |
| "content/reader/….json: …" | Notion produced something the site can't load (for example a case with no title). Fix it in Notion and run again; nothing was written. |

## Adding a new case or book later

Add its page id (the 32 characters at the end of the page's link) to `notion.config.json`, and give it a book in the scene first
(`src/scene/hotspots.ts` and a content file). Ask Claude to wire it up.
