# Queen's Chronicle

A static companion site for a campaign of the board game *The Queen's Dilemma*, hosted on GitHub Pages. See `docs/implementation-plan.md` for the full design (schemas, project structure, rationale).

## Building this project

- Build according to the increments listed in `docs/implementation-plan.md`.
- Commit after each increment is built and its verification step passes.
- Only stop working through increments if you have additional questions or hit an issue you can't resolve — otherwise keep going increment by increment.
- Card photos (`games/**/*.jpg`) are gitignored and never shipped to the site. Only the JSON they produce (`src/data/**`) is tracked.

## Managing new chronicle entries

This is the procedure for turning a new game session's card photos into chronicle data. Run it whenever `games/0N/{dilemmas,resolutions,plotlines}/` contains new, unprocessed photos.

1. **Locate inputs.** Check `games/0N/dilemmas/*.jpg`, `games/0N/resolutions/*.jpg`, `games/0N/plotlines/*.jpg`. Confirm dilemma and resolution counts roughly match — a mismatch is a red flag to surface to the human, not silently resolve. Don't assume a `games/0N` folder is ready just because it exists; some are created ahead of time and sit empty until that session is played.

2. **Pair dilemma ↔ resolution by card ID.** Every dilemma and resolution card has a printed ID near an edge, format `PREFIX.NN.F` (dilemma front) or `PREFIX.NN.B` (resolution back) — e.g. `DAOD.03.F` / `DAOD.03.B`. Strip the `.F`/`.B` suffix; matching `PREFIX.NN` is the join key. Flag any dilemma with no matching resolution, or vice versa, instead of guessing.

3. **Determine the winning resolution.** Each resolution photo shows two text blocks printed 180° apart on the same physical card. The block that is **upright in the photo** is the outcome that actually happened — the chronicler always photographs the card so the winning text reads normally. Ignore the upside-down block entirely; never transcribe it. Cross-check `outcome` (`"aye"` or `"nay"`) against the colour of the small ribbon under the upright block — blue ribbon = aye, red ribbon = nay (same convention as the dilemma card's AYE/NAY ribbons).

4. **Transcribe each dilemma per the schema** in `docs/implementation-plan.md` (`src/data/games/0N.json`):
   - `id` / `threadCode` / `sequence` parsed from the card ID.
   - `prompt`: the dilemma's narrative/question text.
   - `aye.icons` / `nay.icons`: the small icons shown in each ribbon, using the icon vocabulary below.
   - `resolution.outcome`, `resolution.narrative`, `resolution.leader` (verbatim string — don't over-normalize, the box format varies card to card), `resolution.resourceChanges` (array of `{icon, amount}`; amounts can be negative).
   - If a dilemma's prompt visually bolds a word in a different (gothic/blackletter-ish) font versus the body serif, preserve that as `**bold**` in the JSON string rather than dropping the styling — this marks a keyword relevant to a player's holdings.

5. **Icon vocabulary.** Use only names from this list. If a glyph doesn't match anything here, stop and ask the human to name it rather than inventing one — then add it to this list.
   - `feather`, `scroll`, `wheel`, `axe`, `compass`, `plus`, `question-mark`, `key`, `sword-circle` (plotline thread icon)
   - *(This list was seeded from game 1's photos. Expect to extend it — re-check this section after each ingestion run.)*

6. **Plotlines — front/back handling.** Each plotline card's back face (`.B`) is normally self-contained: icon + title + sequence number + full narrative together. The front face (`.F`) is just cover art + title + number, no narrative. Prefer the back face. Only merge front+back data if the back photo is missing (front gives title/number/icon, narrative stays `null` and gets flagged).

7. **Merge into `plotlines.json`, don't overwrite.** New plotline cards are appended into their thread's `cards` array (creating a new thread entry if the prefix code is new) and the array is re-sorted by `sequence`. This file accumulates across all games — unlike the per-game chronicle file, it is never replaced wholesale.

8. **Write `src/data/games/0N.json` fresh** — chronicle files are per-game, not accumulated.

9. **Never auto-edit `src/data/players.json`.** Player state is hand-curated by the chronicler from the physical booklets. Don't touch it during ingestion unless the human explicitly asks you to.

10. **Self-check before finishing.** Report back: how many dilemmas processed, how many paired with a resolution, how many plotline cards merged into which threads. List any unresolved flags from steps 2/3/6 rather than silently guessing through them.
