# Translation catalogs

Minn Admin uses `minn-admin` as its text domain. PHP strings use WordPress gettext
functions and the standalone JavaScript app is registered with `wp-i18n` plus
`wp_set_script_translations()`.

Regenerate the source catalog from the repository root with WP-CLI:

```sh
wp i18n make-pot . languages/minn-admin.pot --ignore-domain --exclude=tests,docs,.wp-playground,.github
```

`--ignore-domain` is required because `assets/js/app.js` uses module-local `__()` and
`_n()` wrappers that supply `minn-admin` when delegating to `wp.i18n`. PHP calls must
still pass `minn-admin` explicitly.

Compile a translated PO file and its JavaScript catalog with:

```sh
wp i18n make-mo languages
wp i18n make-json languages --no-purge
```

Run the site-independent contract check after regenerating:

```sh
cd tests
npm run test:i18n
```

The browser-backed `tests/i18n.test.js` verifies the complete runtime path on a
configured development site.
