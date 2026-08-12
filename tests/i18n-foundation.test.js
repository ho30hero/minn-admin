/**
 * Fast, site-independent checks for the i18n contract. The browser suite in
 * i18n.test.js covers the runtime payload and rendered translations.
 */
const fs = require( 'fs' );
const path = require( 'path' );

const root = path.resolve( __dirname, '..' );
const read = ( file ) => fs.readFileSync( path.join( root, file ), 'utf8' );
const plugin = read( 'minn-admin.php' );
const core = read( 'includes/class-minn-admin.php' );
const template = read( 'includes/template.php' );
const app = read( 'assets/js/app.js' );
const pot = read( 'languages/minn-admin.pot' );
const potIds = pot.split( /\r?\n/ )
	.filter( ( line ) => line.startsWith( 'msgid "' ) && line !== 'msgid ""' )
	.map( ( line ) => line.slice( 7, -1 ) );
const duplicatePotIds = potIds.filter( ( id, index ) => potIds.indexOf( id ) !== index );

const checks = [
	[ 'plugin declares the text domain', /Text Domain:\s+minn-admin/.test( plugin ) ],
	[ 'plugin declares the language directory', /Domain Path:\s+\/languages/.test( plugin ) ],
	[ 'PHP translations load on init', /add_action\( 'init', array\( __CLASS__, 'load_textdomain' \) \)/.test( core ) ],
	[ 'app depends on the WordPress i18n runtime', /array\( 'wp-i18n' \)/.test( core ) ],
	[ 'script translations use the plugin domain', /wp_set_script_translations\( 'minn-admin-app', 'minn-admin'/.test( core ) ],
	[ 'the registered app handle is printed', /wp_print_scripts\( 'minn-admin-app' \)/.test( template ) ],
	[ 'singular strings delegate to wp.i18n', /WP_I18N\.__\( text, 'minn-admin' \)/.test( app ) ],
	[ 'plural strings delegate to wp.i18n', /WP_I18N\._n\( single, plural, n, 'minn-admin' \)/.test( app ) ],
	[ 'interpolation delegates to wp.i18n', /WP_I18N\.sprintf\( fmt, \.\.\.args \)/.test( app ) ],
	[ 'POT version matches the plugin version', /Project-Id-Version: Minn Admin 0\.27\.0/.test( pot ) ],
	[ 'new PHP shell strings are in the POT', [ 'Invalid plugin or status.', 'English (United States)', 'Minn Admin — %s' ].every( ( id ) => potIds.includes( id ) ) ],
	[ 'POT contains no duplicate singular entries', duplicatePotIds.length === 0 ],
];

let failed = 0;
for ( const [ label, pass ] of checks ) {
	console.log( `${ pass ? 'PASS' : 'FAIL' } ${ label }` );
	if ( ! pass ) failed++;
}
if ( failed ) process.exit( 1 );
