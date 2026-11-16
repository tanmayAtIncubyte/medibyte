# MediByte logo concepts

> ## Decision (2026-09-14): **Concept 1 — sprout + cross — shipped.**
>
> This document recommends Concept 3 below; the team went with **Concept 1** instead.
> The deciding argument was recognisability over robustness: Concept 1 quotes
> Incubyte's two-leaf sprout almost verbatim, so the sibling link is instant, and the
> mark is used at header scale (a ~32 px wordmark accent) far more often than at 16 px
> — which is where Concept 1 is weakest. The Concept 3 recommendation below is left
> as written; read it as the case that was argued and not taken, not as stale advice.
>
> **Where it lives now** (branch `feat/ui-incubyte`, not yet on `dev`):
>
> | Artefact | File |
> |---|---|
> | Header wordmark + monogram components | `components/brand/logo.tsx` — `Logo` (home link) and `Wordmark({ tone })` |
> | App icon | `app/icon.svg` |
> | Favicon | `app/favicon.ico` |
> | Source SVGs | `concept-1-*.svg` in this folder |
>
> `Wordmark` inlines the outlined `medibyte` letterforms plus the sprout-on-plus
> accent as SVG paths, so there is no font dependency at runtime. `tone="light"` is
> ink letters + a forest mark (for light grounds); `tone="dark"` is white letters with
> a white/lime mark. The constants in the component (`FOREST #014D43`, `LIME #D3FE73`)
> are the ones specified under "Shared system" below — including the rule that lime is
> never placed directly on white.
>
> The follow-ups listed under the Concept 3 recommendation still apply to the shipped
> Concept 1 mark: a simplified **16 px favicon cut** (no midrib, fatter leaf, full-width
> plus arms) is still worth doing rather than scaling the large file down.

**MediByte = medical + Incubyte.** Three directions that read as a sibling of the
[incubyte.co](https://incubyte.co/) wordmark, medicalised. Open `preview.html` (or `preview.png`)
to see all twelve artefacts side by side with 16/32/64/256 px legibility checks and a monochrome test.

## What Incubyte's logo actually is (measured, not assumed)

Pulled from the live site header (served as a 644×178 PNG inside an SVG) and the 192 px favicon:

- Wordmark `incubyte`, all lowercase, pure black, a very heavy geometric sans (Gotham/Montserrat-class,
  ~800–900 weight): round single-storey bowls, straight-tailed `y`, horizontal-bar `e`. Tracking is tight.
- The i-dot is replaced by a **two-leaf sprout** leaning up-left: a larger teal leaf (~#5BC2D1) in front,
  a smaller lime-yellow leaf (~#C9DA7A) behind, both with a thin black outline and a black midrib.
  The sprout is roughly 80% of x-height tall and rises to the ascender line.
- The favicon is the **sprout alone** — no letter. So "symbol standing in for the dot, and standing alone as the icon"
  is the DNA to inherit.

## Shared system across all three concepts

- **Face:** Plus Jakarta Sans ExtraBold (800), lowercase, tracking −12/1000 em, kerned. It was the closest
  free sibling to Incubyte's face out of Manrope 800 / Montserrat 900 / Plus Jakarta 800 (straight-tailed `y`,
  same bowl construction, same heft). Letterforms are **outlined to paths** in every SVG, so nothing needs a font installed.
- **Colour:** letters ink `#0A0A0D` on white (like Incubyte's black) and white on forest `#014D43`.
  The accent carries the brand colours: forest + lime `#D3FE73`. Lime never sits directly on white — it is always
  inset inside a forest shape (a midrib or a half-capsule rim), which is also what keeps contrast honest.
- **The accent is the i-dot** (dotless `ı` + custom symbol), sized like Incubyte's sprout: it sits ~4.6 units above the
  stem (the original dot gap is ~5.5) and rises past the ascender line the way the sprout does.
- **Monogram:** the accent alone on a rounded square (radius 22.5%), filling ~62–68% of the tile, lifted ~2.5% for
  optical centre because leaf tips carry little visual mass. Light tile = white with forest mark; dark tile = forest
  with white + lime mark.
- **Colour is never the only carrier of meaning:** midribs and the capsule seam are drawn as negative space in the
  monochrome versions, so each mark reads in one colour (see the "monochrome test" cell per concept).

## Concept 1 — Sprout + cross

Incubyte's two-leaf sprout, on a short stem, growing out of a medical plus. It is the most literal translation of the
brief: the parent's symbol is quoted almost verbatim (big leaf left, small leaf right, leaning up-left, midribs) and
"planted" on the universal pharmacy sign — care that grows. It reads as Incubyte because the sprout is unmistakably theirs;
it reads as medical because the plus is unmistakably a pharmacy. The stem is not decoration: without it the two leaves sit
directly on the plus and the silhouette reads as a rabbit (ears on a head) — the first pass proved that in mono. Cost: it is
the busiest of the three (three elements), and the sprout becomes a two-lobed blob below ~24 px.

## Concept 2 — Capsule i-dot

The dot becomes a two-tone capsule (forest + lime), rotated −35° so it leans up-left exactly as Incubyte's sprout does — the
same gesture, a different object. It reads as Incubyte through the wordmark and that lean; it reads as pharmacy instantly
(a capsule is the single most legible medicine glyph there is). It is the most robust at small sizes: two rounded halves
survive 16 px cleanly, and the seam is negative space so the mono version is still a two-piece pill. Cost: it drops the
"grow" metaphor entirely — a capsule says *medicine*, not *incubate*, so the sibling link rests on typography and posture
rather than on shared iconography. Its lime half also reads as "prescription" more than "wellness".

## Concept 3 — Grown cross

One hybrid glyph: a plus whose top arm has grown into a leaf. Rather than adding a sprout *to* a cross, the cross
*becomes* the plant — medical form and Incubyte's growth metaphor fused into a single shape with one silhouette.
It reads as Incubyte because the leaf is their leaf (almond form, lean, midrib); it reads as medical because three arms of a
plus are enough to read as a plus. Two elements instead of three means it holds better than Concept 1 at 32 px, and the
lime leaf on white plus on the dark tile gives a genuine two-colour icon. Cost: the missing top arm makes the plus slightly
less instant than a full cross at 16 px, where it reads as "plus with something on top".

## Recommendation: ship Concept 3 (Grown cross)

It is the only one that is both a *sibling* and a *medical* mark in a single form — the growth idea is structural, not
appended. Concept 1 says the same thing but needs three parts to say it and loses the sprout first when scaled; Concept 2
is the most legible object but says nothing about Incubyte beyond the typeface. Concept 3 also gives the strongest app
icon: the lime leaf against the white plus is a clean two-colour read on the forest tile, and the mono version is a
recognisable silhouette. If the team wants maximum small-size safety over concept, Concept 2 is the fallback.

If Concept 3 is adopted, the follow-ups are: (1) a dedicated 16 px favicon cut with the midrib removed and the leaf
widened ~10%, (2) a horizontal lock-up of monogram + wordmark for the header, and (3) replacing
`components/brand/logo.tsx` and `app/icon.svg` (deliberately not touched here).

> **Outcome:** Concept 1 was adopted instead (see the decision box at the top), and
> follow-up (3) has been done — `components/brand/logo.tsx`, `app/icon.svg` and
> `app/favicon.ico` all carry the Concept 1 sprout + cross. Follow-up (1), the
> dedicated 16 px cut, is still outstanding.

## Legibility notes at 16–32 px

- **32 px**: all three monograms identify correctly (see the size bars). Concept 2 is the crispest. Midribs are ~1 px and
  effectively disappear — fine, the silhouette carries the shape.
- **16 px (favicon)**: Concept 2 still reads as a capsule. Concepts 1 and 3 read as "plus with a leaf-shaped blob";
  the two leaves of Concept 1 merge. For production, cut a simplified 16 px variant (no midrib, slightly fatter leaf,
  full-width plus arms) rather than scaling the 512 px file.
- **Wordmark at header size (~24 px x-height)**: all three accents remain legible; the lime detail inside the accent
  is at the limit and may be dropped for a single-colour header wordmark.
- **Light monogram** (white tile) needs a hairline border or drop shadow when placed on a white page, as in the preview.

## Files

| File | What |
|---|---|
| `concept-N-wordmark-light.svg` | `medibyte` in ink on transparent, accent in forest + lime |
| `concept-N-wordmark-dark.svg` | white letters on forest, accent in white + lime |
| `concept-N-monogram-light.svg` | 512 px rounded-square app icon, white tile |
| `concept-N-monogram-dark.svg` | 512 px rounded-square app icon, forest tile |
| `preview.html` / `preview.png` | contact sheet with size and monochrome tests |

## Caveats

- **Font licensing / embedding:** the wordmark uses Plus Jakarta Sans ExtraBold (SIL Open Font License). Because the
  letters are outlined paths there is nothing to embed; if the wordmark is ever re-set as live text, the font must be
  self-hosted. `preview.html` uses system fonts for its own labels only.
- **Incubyte reference imagery** in `preview.html` is embedded for side-by-side review only and is Incubyte's trademark.
- The SVGs were generated by a build script (font outlining via fontTools); the geometry constants live in that script,
  not in the SVGs. Ask for the script if further iteration is needed.
- Colours are the six brand tokens only; the teal of Incubyte's sprout was intentionally not borrowed, so the mark stays
  MediByte's own.
