# Translation catalogs

Minn Admin uses `minn-admin` as its text domain. PHP strings use WordPress gettext
functions and the standalone JavaScript app is registered with `wp-i18n` plus
`wp_set_script_translations()`.

## Runtime design

Minn renders outside wp-admin and deliberately does not call `wp_head()` or
`wp_footer()`. The shell therefore registers `assets/js/app.js` itself, declares
`wp-i18n` as a dependency, and prints that registered handle. This lets WordPress
emit the i18n runtime and load script catalogs from either this directory or
`WP_LANG_DIR/plugins`.

Front-end requests normally use the site locale. Before the shell and its boot
payload are built, Minn switches to the signed-in user's locale so PHP strings and
JavaScript catalogs follow the Language choice on that user's profile.

The module-local `__()`, `_n()` and `sprintf()` helpers delegate to `wp.i18n`. They
retain an English fallback so a missing catalog never prevents the app from loading.
The `minn_admin_js_translations` filter and `B.i18n` map are override seams for sites
and test fixtures; production catalogs should use the standard WordPress files.

## Source-string rules

- Wrap every Minn-owned user-facing PHP string with the WordPress gettext function
  appropriate to its context and pass `minn-admin` explicitly.
- Wrap JavaScript strings with the module-local `__()` or `_n()` helper.
- Use `sprintf()` for placeholders and `_n()` for counts. Do not build translatable
  sentences through concatenation.
- Put a short English `translators:` comment immediately before every extraction call
  containing placeholders.
- Escape translated output for its destination: HTML text, attributes or URLs.
- Do not wrap labels supplied by WordPress or third-party plugins in Minn's domain.

## Catalog workflow

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

The generated JSON filename contains either the registered script handle or the MD5
of the script path. Do not rename it manually; WordPress resolves that name when
`wp_set_script_translations()` runs.

## Validation

Run the site-independent contract check after regenerating:

```sh
cd tests
npm run test:i18n
```

The browser-backed `tests/i18n.test.js` verifies the WordPress i18n runtime, a standard
in-memory JED catalog with a non-English plural rule, translated Minn DOM, English
fallback and console errors. For a release check, also load a real generated JSON file
under a non-English user locale. That final smoke test covers the filename and filesystem
lookup performed by `wp_set_script_translations()`; verify that navigation and a plural
entry come from the generated file.

PHP syntax validation should cover `minn-admin.php` and every PHP file under
`includes/`. The project has no production build step.
