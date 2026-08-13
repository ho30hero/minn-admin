/**
 * Fast, site-independent checks for the i18n contract. The browser suite in
 * i18n.test.js covers the runtime payload and rendered translations.
 */
const fs = require( 'fs' );
const path = require( 'path' );
const crypto = require( 'crypto' );
const gettext = require( 'gettext-parser' );

const root = path.resolve( __dirname, '..' );
const read = ( file ) => fs.readFileSync( path.join( root, file ), 'utf8' );
const plugin = read( 'minn-admin.php' );
const core = read( 'includes/class-minn-admin.php' );
const pageBuilders = read( 'includes/adapters/page-builders.php' );
const template = read( 'includes/template.php' );
const app = read( 'assets/js/app.js' );
const pot = read( 'languages/minn-admin.pot' );
const po = read( 'languages/minn-admin-fa_IR.po' );
const moPath = path.join( root, 'languages/minn-admin-fa_IR.mo' );
const scriptPath = 'assets/js/app.js';
const scriptHash = crypto.createHash( 'md5' ).update( scriptPath ).digest( 'hex' );
const jsonPath = `languages/minn-admin-fa_IR-${ scriptHash }.json`;
const scriptCatalog = JSON.parse( read( jsonPath ) );
const parseCatalog = ( source ) => {
	const catalog = gettext.po.parse( Buffer.from( source ) );
	const messages = [];
	for ( const context of Object.values( catalog.translations ) ) {
		for ( const message of Object.values( context ) ) {
			if ( message.msgid ) messages.push( message );
		}
	}
	return { catalog, messages };
};
const parsedPot = parseCatalog( pot );
const parsedPo = parseCatalog( po );
const potIds = parsedPot.messages.map( ( message ) => message.msgid );
const duplicatePotIds = potIds.filter( ( id, index ) => potIds.indexOf( id ) !== index );
const poIds = parsedPo.messages.map( ( message ) => message.msgid );
const duplicatePoIds = poIds.filter( ( id, index ) => poIds.indexOf( id ) !== index );
const untranslatedPoEntries = parsedPo.messages.filter( ( message ) => ! message.msgstr || message.msgstr.some( ( value ) => ! value ) );
const placeholderPattern = /%(?:\d+\$)?[bcdeEfFgGosuxX]/g;
const placeholders = ( value ) => ( value.match( placeholderPattern ) || [] ).sort().join( ',' );
const placeholderErrors = parsedPo.messages.filter( ( message ) => {
	return message.msgstr.some( ( target, index ) => placeholders( target ) !== placeholders( index && message.msgid_plural ? message.msgid_plural : message.msgid ) );
} );
const localeData = scriptCatalog.locale_data.messages;

const checks = [
	[ 'plugin declares the text domain', /Text Domain:\s+minn-admin/.test( plugin ) ],
	[ 'plugin declares the language directory', /Domain Path:\s+\/languages/.test( plugin ) ],
	[ 'PHP translations load on init', /add_action\( 'init', array\( __CLASS__, 'load_textdomain' \) \)/.test( core ) ],
	[ 'the standalone shell switches to the user locale', /switch_to_user_locale\( \$user->ID \)/.test( core ) ],
	[ 'the user-locale switch retains WordPress 6.0 compatibility', /function_exists\( 'switch_to_user_locale' \)/.test( core ) && /switch_to_locale\( get_user_locale\( \$user \) \)/.test( core ) ],
	[ 'app depends on the WordPress i18n runtime', /array\( 'wp-i18n' \)/.test( core ) ],
	[ 'script translations use the plugin domain', /wp_set_script_translations\( 'minn-admin-app', 'minn-admin'/.test( core ) ],
	[ 'the registered app handle is printed', /wp_print_scripts\( 'minn-admin-app' \)/.test( template ) ],
	[ 'singular strings delegate to wp.i18n', /WP_I18N\.__\( text, 'minn-admin' \)/.test( app ) ],
	[ 'plural strings delegate to wp.i18n', /WP_I18N\._n\( single, plural, n, 'minn-admin' \)/.test( app ) ],
	[ 'interpolation delegates to wp.i18n', /WP_I18N\.sprintf\( fmt, \.\.\.args \)/.test( app ) ],
	[ 'PHP fallback titles use the plugin domain', /__\( 'Untitled', 'minn-admin' \)/.test( pageBuilders ) ],
	[ 'translated pattern errors use a placeholder', /__\( 'Pattern insert failed: %s' \), e\.message/.test( app ) && ! /__\( 'Pattern insert failed: ' \) \+/.test( app ) ],
	[ 'language-pack notices are complete sentences', ! /__\( 'User updated' \) \+/.test( app ) && ! /'Profile updated' \+/.test( app ) ],
	[ 'POT version matches the plugin version', /Project-Id-Version: Minn Admin 0\.27\.0/.test( pot ) ],
	[ 'new PHP shell strings are in the POT', [ 'Invalid plugin or status.', 'English (United States)', 'Minn Admin — %s' ].every( ( id ) => potIds.includes( id ) ) ],
	[ 'POT contains no duplicate singular entries', duplicatePotIds.length === 0 ],
	[ 'Persian PO declares the WordPress/JED plural rule', /Language: fa_IR/.test( po ) && /Plural-Forms: nplurals=2; plural=\(n > 1\);/.test( po ) ],
	[ 'Persian PO covers every POT entry', poIds.length === potIds.length && potIds.every( ( id ) => poIds.includes( id ) ) ],
	[ 'Persian PO contains no duplicate entries', duplicatePoIds.length === 0 ],
	[ 'Persian PO contains no fuzzy or obsolete entries', ! /^#,.*\bfuzzy\b/m.test( po ) && ! /^#~/m.test( po ) ],
	[ 'Persian PO contains no untranslated entries', untranslatedPoEntries.length === 0 ],
	[ 'Persian PO preserves every printf placeholder', placeholderErrors.length === 0 ],
	[ 'Persian MO catalog is compiled', fs.existsSync( moPath ) && fs.statSync( moPath ).size > 0 ],
	[ 'Persian JSON filename matches the app path hash', fs.existsSync( path.join( root, jsonPath ) ) ],
	[ 'Persian JSON targets the registered app source', scriptCatalog.source === scriptPath ],
	[ 'Persian JSON contains singular and plural translations', localeData.Overview[ 0 ] === 'نمای کلی' && localeData[ '%d type' ].length === 2 ],
];

let failed = 0;
for ( const [ label, pass ] of checks ) {
	console.log( `${ pass ? 'PASS' : 'FAIL' } ${ label }` );
	if ( ! pass ) failed++;
}
if ( failed ) process.exit( 1 );
