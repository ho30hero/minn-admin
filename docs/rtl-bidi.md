# RTL and bidirectional content

Minn's standalone document follows the effective WordPress locale selected for
the signed-in user. The shell switches locale before rendering, emits the
locale-derived `lang`, and sets an explicit `dir` through WordPress' `is_rtl()`
detection. No locale allow-list is maintained by Minn.

Layout spacing and boundaries that represent writing-order start/end use CSS
logical properties. Screen geometry stays physical where mirroring would alter
meaning or behavior: chart coordinates, crop/resize handles, centered elements,
media badge corners, and ArrowLeft/ArrowRight keyboard conventions. Semantic
previous/next and inline-movement chevrons mirror in RTL.

Technical tokens are isolated LTR only on targeted surfaces: URL and email
inputs, slugs, permalinks, code, logs, database values, and keyboard shortcuts.
User-authored labels use `unicode-bidi: plaintext` so their first strong
character determines their local paragraph direction without forcing ordinary
application prose into one direction.

Run the static contracts with `npm run test:i18n` from `tests/`. The runtime
`rtl-bidi.test.js` and `rtl-visual-smoke.test.js` suites require the same
`MINN_TEST_*` variables as the other browser tests. Run the visual suite once
with an `en_US` test user and `MINN_TEST_DIR=ltr`, then with an RTL user such as
`fa_IR` and `MINN_TEST_DIR=rtl`. It covers Overview, Content, Media, Database,
Settings, Profile, an editor view, and the command palette at 1440x900 and
390x844.
