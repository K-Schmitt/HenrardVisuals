# Self-hosted webfonts

Latin subset only (plus one Cyrillic file, see below), `woff2` only. Served
from the app's own origin so the critical path is `HTML -> CSS -> woff2`
instead of chaining through `fonts.googleapis.com` and `fonts.gstatic.com`.

| File | Family | Style | Weight | Subset |
| --- | --- | --- | --- | --- |
| `bodoni-400.woff2` | Bodoni Moda | normal | 400 | latin |
| `bodoni-400-italic.woff2` | Bodoni Moda | italic | 400 | latin |
| `archivo-var.woff2` | Archivo | normal | 100–900 | latin |
| `playfair-400-italic-cyrillic.woff2` | Playfair Display | italic | 400 | cyrillic |

Bodoni Moda sets the display type; Archivo carries everything else. Archivo is
a variable font, so one file covers the whole weight range — declaring 300,
400 and 500 separately would have fetched the same 34 kB three times.

Bodoni Moda ships **no Cyrillic subset**. The hero subtitle is editable from
the admin panel and currently reads `диво дьявола • Life is but a dream`, so
that range is handed to Playfair Display through a scoped `unicode-range`. The
scope is what keeps the file off the wire for latin-only pages.

All three families are licensed under the SIL Open Font License 1.1:

- Bodoni Moda — <https://github.com/indestructible-type/Bodoni>
- Archivo — <https://github.com/Omnibus-Type/Archivo>
- Playfair Display — <https://github.com/clauseggers/Playfair-Display>

The `@font-face` declarations live at the top of `src/index.css`, and
`index.html` preloads only the two faces that render above the fold
(`bodoni-400`, `archivo-var`). Adding a weight or style means adding both the
file and its declaration.
