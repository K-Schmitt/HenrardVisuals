# Self-hosted webfonts

Latin subset only, `woff2` only. Served from the app's own origin so the
critical path is `HTML -> CSS -> woff2` instead of chaining through
`fonts.googleapis.com` and `fonts.gstatic.com`.

| File | Family | Weight |
| --- | --- | --- |
| `inter-400.woff2` | Inter | 400 |
| `inter-500.woff2` | Inter | 500 |
| `inter-600.woff2` | Inter | 600 |
| `playfair-400.woff2` | Playfair Display | 400 |
| `playfair-600.woff2` | Playfair Display | 600 |

Both families are licensed under the SIL Open Font License 1.1:

- Inter — <https://github.com/rsms/inter>
- Playfair Display — <https://github.com/clauseggers/Playfair-Display>

The `@font-face` declarations live at the top of `src/index.css`. Only the
weights `tailwind.config.js` actually maps are present; adding a weight means
adding both the file and its declaration.
