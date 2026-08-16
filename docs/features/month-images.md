# Month images

Classic wall calendars pair every month with a picture. The app reserves that
seam in `src/app/monthImage.ts`:

- The **month grid** hangs a **large** image above the calendar (the page
  scrolls: artwork first, then a calendar that fills the screen).
- The **day list** heads its scroll with a **small**, slimmer band.
- The week planner shows no artwork — it's a working surface.

## Status

No image packs ship yet — `monthImageUrl()` returns `null` and the views
render their plain serif title band. The layout, sizing, and loading behavior
are already in place, so shipping artwork is purely additive.

## Shipping a pack (planned shape)

A pack is a year of artwork: 12 large images + 12 small ones, registered in
`IMAGE_PACKS` keyed by year:

```ts
const IMAGE_PACKS = {
  2026: {
    large: [jan, feb, ...],   // 12 URLs (bundled assets or remote)
    small: [janS, febS, ...],
  },
};
```

Releases like "2026", "2027" then just add entries — the views need no
changes. Keep images `object-cover`-friendly (wide crops for `small`,
portrait-tolerant for `large`).
