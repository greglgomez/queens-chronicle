# Queen's Chronicle — Implementation Plan

## Context

This is a fan-built companion website for an ongoing campaign of the board game **The Queen's Dilemma**. After each game session, the group's "chronicler" photographs the physical dilemma/resolution/plotline cards that were played and updates each player's booklet state by hand. The goal is a small static site (hosted on GitHub Pages) that turns those raw inputs into a browsable chronicle of the campaign — past dilemmas and how they resolved, the plotlines unlocked so far, and each player's current holdings (keywords, agendas, skills).

The project started as an empty folder containing only source material: `player-game-state.md` (current player state, hand-written), `game-resources/*.pdf` (rules/lore, reference only), and `games/01/{dilemmas,resolutions,plotlines}/*.jpg` (20 iPhone photos from the first game session, with `games/02/` created but empty — the next session hasn't been played yet).

Two things came out of the planning phase: the site itself (built incrementally per this document) and a single `CLAUDE.md` with two instruction sets — one for *building* the site, one for *ingesting a new game's photos* into chronicle data going forward.

## Decisions already made

- **Stack**: Astro, static output (`output: 'static'`), deployed to GitHub Pages via GitHub Actions.
- **Display**: text only. No card photos ship to the live site or get committed to git — `games/**/*.jpg` is gitignored; only the JSON the photos produce is tracked.
- **Ingestion model**: no OCR/vision code gets built. A Claude Code session reads card photos directly (vision) following `CLAUDE.md`'s ingestion section and writes the JSON by hand. This repeats for every future game session.
- **Repo**: `queens-chronicle`, public, created via `gh repo create`.
- **Style**: ye-olde medieval theme — parchment/yellowing background, serif body + blackletter/gothic display font, mobile-first.
- **Git workflow**: commit after each increment below; only pause to ask if blocked or a design question comes up mid-increment.

## Card structure (verified directly from sample images — drives the schema below)

- **Dilemma card** (front): art + narrative/question text panel. Top-right blue ribbon = "AYE" + 2-3 small resource icons. Bottom-left red ribbon = "NAY" + icons. Printed ID bottom-right, e.g. `DAOD.03.F` (thread-code `DAOD`, sequence `03`, `.F`=front).
- **Resolution card** (the physical flipside of the same card): TWO text blocks printed 180° apart on one card — the block that is **upright in the photo** is the outcome that actually happened (the chronicler always photographs it that way); the upside-down block is the non-winning outcome and is discarded entirely, never transcribed. Each block has a `Leader: ⬛Cnnn`-style box and a row of small numbered resource icons (can be negative, e.g. `-1`). Same ID scheme, `.B` suffix, e.g. `DAOD.03.B` — pairs with its dilemma by matching the `PREFIX.NN` portion. AYE block's icon ribbon is blue, NAY's is red — same colour convention as the dilemma card, used to determine `outcome`.
- **Plotline card**: small thread icon (e.g. sword-in-circle for thread `W`), title, and a thread-relative sequence number. The **back** face (`.B`) is self-contained — it shows icon + title + number + the full narrative paragraph together. The front (`.F`) is just cover art + title + number, no narrative. So the back face alone is normally sufficient; only fall back to merging front+back if a back photo is missing.
- **Bolded keywords**: dilemma prompts occasionally bold a word in a different (gothic-ish) font when it's relevant to a region/keyword a player owns. None appeared in the sample cards checked, but ingestion must preserve this as `**bold**` in the JSON text rather than flattening it, if/when it appears.

## Data schemas

### `src/data/players.json` — converted once from `player-game-state.md`

```json
{
  "lastUpdatedAfterGame": 1,
  "players": [
    {
      "id": "aesyas",
      "name": "Aesyas",
      "title": "The Silver Quill",
      "keywords": [
        { "name": "Solad", "description": "You rule over the Duchy of Solad." }
      ],
      "agendas": [
        { "title": "Family Matters", "number": 1, "narrative": "...", "relatedSkill": null },
        { "title": "Alchemic Preservation", "number": null, "narrative": "...", "relatedSkill": "Alchemic Preservation" }
      ],
      "skills": [
        { "title": "Alchemic Preservation", "narrative": "...", "ability": "During Dilemma Resolution, you may spend 2 (coin) to prevent the Slider from moving toward Tradition." }
      ]
    }
  ]
}
```

- `id`: slug from name (`aesyas`, `syd`, `elinor`, `jilian`, `lyre`, `xanthe`) — used for `/players/[player]` routing.
- `agendas`/`skills` arrays are always present, even if empty (Jilian and Lyre currently have neither) — simplifies templates.
- `agendas[].number` is nullable; don't invent numbering where the source has none.
- `relatedSkill` is nullable and, when set, should match a `skills[].title` for the same player so the UI can cross-link agenda → skill.
- Fix obvious source typos during conversion ("Duch"→"Duchy", "yout"→"your", "toekns"→"tokens", "minotiry"→"minority", "undermin"→"undermine", "answer"/"asnwer", "effors"→"efforts") — do not preserve them.
- Strip stray markdown asterisks around keyword names (`*Blodyn*` → `Blodyn`).

### `src/data/games/01.json` — one file per game session

```json
{
  "gameNumber": 1,
  "dilemmas": [
    {
      "id": "DAOD.03",
      "threadCode": "DAOD",
      "sequence": 3,
      "plotlineThreadCode": null,
      "title": "An Anthem Too Refined for the Tavern",
      "prompt": "The Tribune has uncovered a shocking oversight...",
      "aye": { "icons": ["axe", "wheel", "plus"] },
      "nay": { "icons": ["scroll", "key", "plus"] },
      "resolution": {
        "outcome": "nay",
        "narrative": "Markiavel's anthem is unveiled before the court...",
        "leader": "Leader: ⬛C178",
        "resourceChanges": [{ "icon": "feather", "amount": 1 }, { "icon": "scroll", "amount": 1 }]
      }
    }
  ]
}
```

- `id` is the card's `PREFIX.NN` with no `.F`/`.B` suffix — the join key between a dilemma photo and its resolution photo.
- `threadCode` is purely a parse of the ID prefix — kept for data fidelity, but **not** used to decide which plotline thread to display or link to (the ID prefix has already been observed to disagree with the dilemma's actual narrative content, e.g. a `W`-prefixed dilemma whose resolution unlocked an `M`-thread plotline).
- `plotlineThreadCode` (nullable string) is the editorial, content-based judgment of which `plotlines.json` thread `code` this dilemma actually belongs to — set only when the narrative content explicitly matches that thread's story, never inferred from `threadCode`. `null`/absent when uncertain. Always unset for `threadCode: "DAOD"` dilemmas (Age of Disorder expansion filler — confirmed to never get a plotline). The Chronicle page uses this to decide what to show next to each dilemma: the matching thread's name (hyperlinked to `/plot/#thread-{code}`) when set, `"Age of Disorder Thread"` (no link) when `threadCode` is `DAOD`, or `"??? thread"` (no link) otherwise.
- `title` is an evocative title the chronicler writes for the dilemma, reflecting both the prompt and how it actually resolved (e.g. "An Anthem Too Refined for the Tavern", not "DAOD.03") — this is what's shown as the heading on the Chronicle page, never the card ID.
- `outcome` is `"aye" | "nay"`, decided by which block was upright in the resolution photo (cross-checked against ribbon colour).
- Only the winning side's resolution detail is recorded — no losing-side sub-object.
- `leader` stays a free-form transcribed string (the box format varies card to card); don't force structure onto it.
- `resourceChanges[].amount` can be negative — don't assume positive-only.
- Icon names come from a small fixed vocabulary (locked in increment 9, see `CLAUDE.md`) — if ingestion meets a glyph not in the vocabulary, it should stop and ask rather than invent a name.
- `resolution.envelope` (optional, string, e.g. `"02"`): some resolutions show a small numbered envelope-shaped icon next to the winning side's ribbon, indicating a physical envelope the chronicler should open. Omit the field entirely when no envelope is shown — most dilemmas don't reference one.
- `resolution.unlocksPlotline` (optional, string, e.g. `"M.02"`): a different icon — a concentric-circle/target glyph next to a thread-qualified code — pointing to the specific plotline card that gets revealed by this outcome. Visually distinct from the envelope icon; don't conflate the two even though both are "a number next to a small badge."
- `aye.icons`/`nay.icons`/`resolution.leader`/`resolution.resourceChanges`/`resolution.envelope`/`resolution.unlocksPlotline` are kept as a structured mechanical record, but the Chronicle page deliberately doesn't render them — it's a narrative chronicle, not a rules tracker. Only `title`, `prompt`, `resolution.outcome`, and `resolution.narrative` are displayed.

### `src/data/plotlines.json` — single global file, accumulates across all games

```json
{
  "threads": [
    {
      "code": "W",
      "name": "War",
      "icon": "sword-circle",
      "cards": [
        { "id": "W.00", "sequence": 0, "title": "Scorching Sands", "narrative": "Year 440...", "unlockedInGame": 1 }
      ]
    }
  ]
}
```

- Grouped by thread so "The Plot" page can render one section per thread, cards ordered by `sequence`.
- This file is **merged into**, not overwritten, on every new game's ingestion — new cards get appended to their thread's `cards` array (or a new thread added if a new prefix shows up) and re-sorted by `sequence`.
- `unlockedInGame` is display metadata only (e.g. a "new" badge), not a partition key.

## Astro project structure

```
queens-chronicle/
├── astro.config.mjs        # output: 'static', site + base set for GH Pages project page
├── CLAUDE.md                # single file, two sections: build workflow + ingestion workflow
├── games/
│   └── 01/, 02/...          # gitignored photo folders
├── docs/
│   └── implementation-plan.md   # this plan
├── src/
│   ├── data/
│   │   ├── players.json
│   │   ├── plotlines.json
│   │   └── games/01.json, 02.json...
│   ├── layouts/BaseLayout.astro
│   ├── components/ (Nav, DilemmaCard, PlotlineThread, PlotlineCard, PlayerCard, KeywordList, AgendaList, SkillList, IconBadge)
│   ├── pages/
│   │   ├── index.astro
│   │   ├── chronicle/index.astro, chronicle/[game].astro
│   │   ├── plot/index.astro
│   │   └── players/index.astro, players/[player].astro
│   └── styles/global.css
└── .github/workflows/deploy.yml
```

JSON files are imported directly as ESM in Astro (`import players from '../data/players.json'`) — no custom data-loading layer needed for this scope.

## `.gitignore`

```
node_modules/
dist/
.astro/

# Raw card photographs: ephemeral ingestion source, never committed/shipped.
# Ingestion output (JSON) lives under src/data/, which is unaffected by this rule.
games/**/*.jpg
games/**/*.jpeg
games/**/*.png
games/**/*.heic
```

## Increments

Each one is committed once its verification step passes. Stop and ask if blocked.

1. **Write planning docs** — `docs/implementation-plan.md` and root `CLAUDE.md`. *Verify*: both files exist and read coherently.
2. **Repo scaffolding** — `git init`, write `.gitignore` above. *Verify*: `git check-ignore games/01/dilemmas/IMG_8441.jpg` matches.
3. **Astro init** — `npm create astro@latest .` (minimal/TS template). *Verify*: `npm run dev` and `npm run build` both work.
4. **GitHub Pages config** — set `site`/`base` in `astro.config.mjs`, add `.github/workflows/deploy.yml` (official `withastro/action`). *Verify*: `npm run build` succeeds with `base` set.
5. **Create repo + push** — `gh repo create queens-chronicle --public --source=. --push`. *Verify*: Actions tab shows a green deploy, placeholder page loads at the Pages URL.
6. **Convert `player-game-state.json`** — hand-convert from the `.md` per schema above, fixing typos. *Verify*: valid JSON, manual diff against the `.md` confirms all 6 players and every keyword/agenda/skill is present.
7. **Visual theme** — `global.css`, `BaseLayout.astro`, fonts (self-hosted or Google Fonts), `Nav.astro`. *Verify*: `/` shows parchment background + blackletter headings + serif body + working nav at mobile width (375px).
8. **Players page** — `players/index.astro`, `players/[player].astro`, `PlayerCard`/`KeywordList`/`AgendaList`/`SkillList`. *Verify*: `/players/` lists all 6; a player with agendas+skills renders correctly; Jilian/Lyre (no agendas/skills) render without errors.
9. **Icon vocabulary + finalize ingestion instructions** — lock a fixed icon-name list from everything visible across `games/01` (feather, scroll, wheel, axe, compass, plus, question-mark, key, sword-circle thread icon, etc — spot-check a few more images beyond the ones already reviewed before locking it), and fold it into `CLAUDE.md`'s ingestion section. *Verify*: every icon glyph seen across the 20 game-1 photos has a name in the vocabulary.
10. **Run ingestion for game 1** — following `CLAUDE.md`'s ingestion section, process all 20 photos into `src/data/games/01.json` and `src/data/plotlines.json`. *Verify*: 7 dilemmas each with a paired resolution; plotlines grouped under correct thread codes; spot-check a couple of entries against the source photos for accuracy.
11. **Chronicle page** — `chronicle/index.astro`, `chronicle/[game].astro`, `DilemmaCard`, `IconBadge`. *Verify*: `/chronicle/1/` renders all 7 dilemmas in order with prompt, AYE/NAY icons, and the resolved outcome.
12. **Plot page** — `plot/index.astro`, `PlotlineThread`, `PlotlineCard`. *Verify*: threads render as sections, cards ordered by sequence within each.
13. **Home page + cross-linking** — `index.astro` ties the three sections together; wire up agenda→skill and dilemma-thread→plot-thread links. *Verify*: manual click-through, no dead links.
14. **Final deploy verification** — visit the live Pages URL, click through all three sections, check mobile rendering, confirm no photos leaked into `dist/` or git history (`git log --all --full-history -- 'games/**/*.jpg'` is empty).

## Verification approach

Primarily manual: `npm run build`/`npm run dev` after each structural increment, browser checks (including a mobile viewport) for each new page, and JSON validity + spot-checks against the source `.md`/photos for the two data-conversion increments (6 and 10). Final increment confirms the actual deployed GitHub Pages site end-to-end.
