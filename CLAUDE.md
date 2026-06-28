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

2. **Pair dilemma ↔ resolution by card ID.** Every dilemma and resolution card has a printed ID near an edge, format `PREFIX.NN.F` (dilemma front) or `PREFIX.NN.B` (resolution back) — e.g. `DAOD.03.F` / `DAOD.03.B`. Some threads use a 3-segment form instead, e.g. `W.00.1.F` (thread `W`, chapter `00`, card `1` within that chapter) — treat everything before the final `.F`/`.B` as the join key (`DAOD.03`, `W.00.1`) regardless of segment count; don't assume every thread uses the same ID shape. Flag any dilemma with no matching resolution, or vice versa, instead of guessing.

3. **Determine the winning resolution.** Each resolution photo shows two text blocks printed 180° apart on the same physical card. The block that is **upright in the photo** is the outcome that actually happened — the chronicler always photographs the card so the winning text reads normally. Ignore the upside-down block entirely; never transcribe it. Cross-check `outcome` (`"aye"` or `"nay"`) against the colour of the small ribbon under the upright block — blue ribbon = aye, red ribbon = nay (same convention as the dilemma card's AYE/NAY ribbons).

4. **Transcribe each dilemma per the schema** in `docs/implementation-plan.md` (`src/data/games/0N.json`):
   - `id` / `threadCode` / `sequence` parsed from the card ID.
   - `plotlineThreadCode`: **don't assume the ID prefix tells you the plotline thread.** It has already been proven wrong twice — `W.03.3` ("Aontas Gets Its Due", purely about capital investment) explicitly unlocked plotline `M.01`, and `M.01.1` / `W.00.2` turned out to be about the Sweet Beyond and Scourge-of-Coden storylines respectively, not whatever their prefix suggests. Instead, read the dilemma's actual narrative content and only set this field to a `plotlines.json` thread `code` when the content explicitly and unambiguously matches that thread's ongoing story (shared proper nouns, named events, the same villain/substance/place central to that thread's cards) — a same-letter prefix alone is not evidence. Special case: dilemmas with `threadCode` `"DAOD"` ("Age of Disorder" expansion content) are filler with no plotline ever and should be left with `plotlineThreadCode` unset — the Chronicle page renders these as "Plotline: Age of Disorder" with no link, unconditionally. For everything else, if you're not confident, leave `plotlineThreadCode` unset — the Chronicle page falls back to an unlinked "Plotline: ???" rather than guess.
   - `title`: write a short, evocative title for the dilemma that reflects both the prompt and how it actually resolved (e.g. "An Anthem Too Refined for the Tavern", not "DAOD.03" and not a flat restatement of the question). This is the heading shown on the Chronicle page — never use the card ID as the title.
   - `prompt`: the dilemma's narrative/question text.
   - `aye.icons` / `nay.icons`: the small icons shown in each ribbon, using the icon vocabulary below.
   - `resolution.outcome`, `resolution.narrative`, `resolution.leader` (verbatim string — don't over-normalize; the box isn't always labelled "Leader", sometimes it names a region/keyword instead, e.g. `Wylio: -1🪶`, or a generic group like `Winners: -1⛑` — transcribe whatever it says, describing any embedded icon in plain words rather than forcing it into the controlled vocabulary below; tiny reference glyphs before card codes like `C178`/`A037`/`K14` are just card-type markers, safe to drop, keep the code itself), `resolution.resourceChanges` (array of `{icon, amount}`; amounts can be negative).
   - `resolution.envelope` (optional string, e.g. `"15"`) — only present when the winning side's ribbon shows a literal envelope/mail-shaped icon next to a number, meaning a physical envelope to open. Don't confuse this with the next field below; the two icons look different and can both appear on the same card for different (winning vs losing) sides.
   - `resolution.unlocksPlotline` (optional string, e.g. `"M.02"`) — present when the winning side's ribbon shows a small **concentric-circle/target** icon next to a thread-qualified code. This points to the specific plotline card (thread + number) that gets revealed by this outcome — it is not a literal envelope. If the code has no thread prefix (just a bare number), assume it refers to the same thread as the dilemma itself.
   - If a dilemma's prompt visually bolds a word in a different (gothic/blackletter-ish) font versus the body serif, preserve that as `**bold**` in the JSON string rather than dropping the styling — this marks a keyword relevant to a player's holdings.
   - Keep transcribing the mechanical fields (`aye`/`nay` icons, `leader`, `resourceChanges`, `envelope`) even though the Chronicle page doesn't display them — it's a narrative chronicle, not a rules tracker, but the structured data is still worth keeping for the record.

5. **Icon vocabulary.** Use only names from this list (locked from a full pass over game 1's 20 photos). If a glyph doesn't match anything here, stop and ask the human to name it rather than inventing one — then add it to this list.
   - `feather` — single quill/feather blade in a diamond
   - `wheel` — circular gear/cog
   - `axe` — angled blade/sickle shape
   - `column` — T-shaped pillar
   - `compass` — two-legged drafting compass/dividers
   - `ribbon` — circular rosette/medal with banner tails
   - `key` — key shape
   - `paw` — clawed paw/footprint
   - `letter-a` — stylized "A" glyph
   - `plus` — simple cross
   - `minus` — simple horizontal dash (seen on `nay.icons` only so far)
   - `question-mark` — "?"
   - `sword-circle` — plotline thread icon (the `W`/War thread)
   - `venus` — circle-with-cross (♀) plotline thread icon (the `D` thread)
   - `figure` — stylized person with raised arms, plotline thread icon (the `R` thread)
   - *(Seeded from games 1–2's photos — re-check this section after each ingestion run and extend it for any new thread's icon set. Note: a literal mail/envelope-shaped icon and a separate concentric-circle/target icon both appear on resolution cards but are tracked via the dedicated `envelope`/`unlocksPlotline` fields below, not this list — don't conflate them.)*

6. **Plotlines — front/back handling, and sequence numbers.** Each plotline card's back face (`.B`) is normally self-contained: icon + title + sequence number + full narrative together. The front face (`.F`) is just cover art + title + number, no narrative. Prefer the back face. Only merge front+back data if the back photo is missing (front gives title/number/icon, narrative stays `null` and gets flagged). Use the **number printed on the card's ribbon** (e.g. the bold "1", "2", "3") as `sequence` — don't derive it by parsing the chapter digits out of the card ID (e.g. `W.03`'s printed number was `3`, but the chapter digits don't reliably equal `sequence - 1`; the printed number is the publisher's actual reading order and is the only reliable source).

7. **Merge into `plotlines.json`, don't overwrite.** New plotline cards are appended into their thread's `cards` array (creating a new thread entry if the prefix code is new) and the array is re-sorted by `sequence`. This file accumulates across all games — unlike the per-game chronicle file, it is never replaced wholesale.

8. **Write `src/data/games/0N.json` fresh** — chronicle files are per-game, not accumulated.

9. **Write the game-level `summary`**, once all of that game's dilemmas are transcribed: a short newspaper-style lead paragraph (3-5 sentences) synthesizing the game as a whole — the decisions made and how they resolved, and any plotlines that emerged as a result. Write it in past-tense reporting voice, not a bullet recap; weave the dilemmas together narratively rather than listing them one by one. (The Chronicle index card's "headlines" are derived automatically from every dilemma's own `title` — no separate curation step needed.)

10. **Never auto-edit `src/data/players.json`.** Player state is hand-curated by the chronicler from the physical booklets. Don't touch it during ingestion unless the human explicitly asks you to.

11. **Self-check before finishing.** Report back: how many dilemmas processed, how many paired with a resolution, how many plotline cards merged into which threads. List any unresolved flags from steps 2/3/6 rather than silently guessing through them.
