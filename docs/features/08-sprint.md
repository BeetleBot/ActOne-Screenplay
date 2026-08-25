# Sprint Tracking

The sprint tracker is a **countdown writing timer** with history and leaderboard, styled as warm rounded cards (`12px`/`8px` radii, pill controls, ambient shadows).

## Starting a Sprint

1. Open the **Sprint** sidebar tab (Tab 7 — Tools group)
2. Choose a **preset duration** — pill buttons (`20px` radius) for **5, 15, 25, 45, 60 minutes** (active pill shows a soft primary tint), or enter **Custom Minutes** (1–999) in the `8px` text field
3. Click **Start Sprint** (full-width pill contained button with play icon; disabled until a duration is set)
4. A countdown begins; words typed during the sprint are counted in real-time

## During a Sprint

**Active sprint card** (rounded `12px` paper with ambient shadow) shows:
- Circular progress ring + remaining time (MM:SS)
- Two metric pills: words written (primary) and live WPM (success color)
- **Finish Sprint** (error pill, `20px`) — saves the session to history
- **Cancel** (outlined pill, `20px`) — discards the session

The **Status Bar** shows an amber countdown pill (`MM:SS · WPM`) while a sprint is active.

## History & Leaderboard

Tabs at the bottom of the panel (full-width, `20px` pill tab indicators):

- **History tab**: rounded list items (`8px`, subtle hover) with word count, date, duration, WPM, and file name. Delete individual entries; **Clear Global History** (pill button) removes all.
- **Leaderboard tab**: Top 10 sprints ranked by word count with Gold (#1, `#d4af37`), Silver (#2, `#c0c0c0`), Bronze (#3, `#cd7f32`) badges.
- **Stats banner**: pill container (`10px` radius, soft tint) showing **Personal Best WPM** and **Total Words Sprinted** above the lists.

## Persistence

Completed sprints are saved to `sprint_data.json` in the `.actone` bundle and `localStorage`:

- Date and time
- Duration and word count (words typed *during* the sprint, not the file total)
- WPM (derived: words / minutes)
- Source file name

## Use Cases

- NaNoWriMo-style writing challenges
- Daily word count targets with preset durations
- Focused writing sessions with time pressure and live WPM feedback
- Tracking writing productivity over time via history + leaderboard
