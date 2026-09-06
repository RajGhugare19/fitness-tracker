# Cut Tracker

Food, weight and training log. Runs as an installable app on your phone.

## Get it on your phone

You need Node.js installed on your computer, and free accounts on GitHub and Vercel.

```bash
npm install
npm run dev      # check it works at http://localhost:5173
```

Then push to GitHub and connect the repo at vercel.com. Vercel detects Vite
automatically — no configuration needed. You get a URL like
`cut-tracker.vercel.app`.

Open that URL in Chrome on your phone, tap ⋮ → **Add to Home Screen**.

## Where your data lives

In your phone's browser storage. It is not synced anywhere, and it stays put
across app updates. Two things will wipe it: clearing Chrome's site data, or
uninstalling the app from your home screen.

`exportAll()` and `importAll()` are exported from `src/App.jsx` if you want to
wire up a backup button later.

## Editing your numbers

Everything is in the first 80 lines of `src/App.jsx`:

- `SEED_FOODS` — macros per 100 g raw, or per piece
- `SEED_MEALS` — the four meal defaults
- `SEED_PLANS` — push / pull / legs exercise lists
- `SEED_TARGETS` — daily calories, macros, start and goal weight

These are only the starting values. Once the app has run, your edits from the
Setup tab and your "save as default" changes take over, so changing seeds later
will not affect an install that already has data.
