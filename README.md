# The Eights

A small tracker for eight habits, each of them a form of the number eight.
Built for a household: everyone has their own account and sees only their own
numbers.

| | Target | Judged over |
| --- | --- | --- |
| Time in bed | 8 hours | the day |
| Steps | 8,000 | the day |
| Fruit & veg | 800g | the day |
| Protein | 0.8g per pound you weigh | the day |
| Mobility | 8 minutes | the day |
| Training | 8 sessions | a rolling fortnight |
| Outdoor play | two 80-minute blocks | the week |
| Time with your people | 180 minutes | the week |

## The shapes behind the numbers

The targets are not all the same kind of thing, and the differences are the
point:

- **Most are a total to build up to.** 800g of vegetables arrives a handful at
  a time, so every addition is its own entry and the day adds them together.
  Tap `+150g` after lunch and again after dinner.
- **Training is a rolling fortnight, not a calendar one.** With a fixed
  fortnight a missed week is forgiven the moment the page turns. Rolling means
  it has to be made up.
- **Outdoor play is two blocks of eighty, not 160 minutes.** A dozen
  ten-minute walks is a different thing, so entries shorter than eighty minutes
  are recorded but count towards nothing — and the card says so rather than
  letting them look like progress.
- **Protein is the only target that differs per person**, because it follows
  body weight. Set yours in Settings; until you do, protein is tracked but has
  no target to be measured against.

Weeks run Monday to Sunday, so a weekend is not split in half.

## Requirements

Node.js 22 or newer. Storage is the built-in `node:sqlite`, so there is no
database server to run and nothing to compile.

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000. The first visit sets up your own account; add the
rest of the household from **Settings** afterwards.

For production:

```bash
npm run build
npm start
```

Add it to a phone's home screen and it opens full-screen, which is how it is
meant to be used — a few taps, several times a day.

## On a phone

This is built to be used one-handed, several times a day, so the mobile side is
part of the design rather than a resize:

- Every control is at least 44px tall, including the quick-add buttons.
- Inputs are 16px, which is what stops iOS zooming the page in when one takes
  focus, and each one asks for the right keyboard.
- Controls carry an `:active` state, not only `:hover`. Tailwind gates hover
  behind a device that can hover and the base stylesheet clears the tap
  highlight, so without it a tap would show nothing at all until the server
  answered.
- Added to a home screen it runs standalone, so the header and the page respect
  the safe area rather than sliding under the status bar and home indicator.

## Accounts

Everyone signs in, and nobody sees anyone else's numbers. The first account
created is the household owner, who can add people from Settings and hand over
a password directly.

An account holding a password somebody else chose is held at a change-password
screen until it picks its own.

**Somebody forgot their password.** The owner resets it from Settings: a
temporary password is generated, shown once, and that account is signed out
everywhere.

**The owner forgot theirs.** Recover from the machine it runs on:

```bash
npm run set-password -- you@example.com
```

There is deliberately no emailed reset link — it would mean SMTP credentials
and a mail provider for a household where everyone is in the same building.

## Your data

Everything lives in one SQLite file:

```
data/eights.db
```

Back that up and you have backed up the household's tracking. Set `DATA_DIR` to
put it elsewhere. `data/` is gitignored; never commit it.

## Development

```bash
npm run dev            # dev server
npm test               # vitest
npm run typecheck      # tsc --noEmit
npm run lint           # eslint
npm run build          # production build
npm run set-password   # reset an account's password
```

Layout:

```
src/
  lib/
    metrics.ts    the eight: targets, cadences, and how each reads
    progress.ts   entries -> where you stand, per cadence
    amounts.ts    reading "7h 45m", "8,000", "150g"
    dates.ts      ISO dates, week bounds, rolling windows
    db/           SQLite store, migrations, path resolution
    auth/         scrypt hashing, session cookies, the requireUser gate
  components/     the metric card, progress ring, nav
  app/
    (auth)/       sign in, first-run setup, forced password change
    (app)/        today, log, settings
  proxy.ts        redirects signed-out visitors (convenience only)
```

Two distinctions the code keeps deliberately separate, because collapsing
either one produces wrong output:

- **What an entry measures** (`amountUnit`) versus **what the target counts**
  (`measure`). An outdoor block is recorded as the minutes it lasted; the
  target counts blocks. Conflating them made an 80-minute walk report itself as
  "80 sessions".
- **What a bare number means.** Typing `8` against sleep is eight hours;
  against mobility it is eight minutes. Each metric declares which it expects
  rather than the parser guessing.

Access is enforced server-side by `requireUser()` in every page and action.
`proxy.ts` only saves a render and cannot be trusted on its own, because it
sees whether a cookie exists, not whether it is valid.

## License

MIT — see [LICENSE](LICENSE).
