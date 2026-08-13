/** Static completeness gate for Minn-owned user-facing strings in app.js. */
const fs = require( 'fs' );
const path = require( 'path' );

const app = fs.readFileSync( path.resolve( __dirname, '../assets/js/app.js' ), 'utf8' );
const lines = app.split( /\r?\n/ );
const findings = [];
const technicalAttribute = /^(?:https?:|#[0-9a-f]{3,8}$|[A-Z]{2,5}$|[\[<{/*]|(?:Ctrl|Cmd|Esc|Enter|Arrow|UTC)\b)/i;

function translatedNearby( line, value ) {
	const quoted = value.replace( /[.*+?^${}()|[\]\\]/g, '\\$&' );
	return new RegExp( `(?:__|_x)\\(\\s*['\"]${ quoted }['\"]` ).test( line );
}

lines.forEach( ( line, index ) => {
	if ( /^\s*(?:\/\/|\/\*|\*)/.test( line ) ) return;
	for ( const match of line.matchAll( /\b(title|placeholder|aria-label)="([A-Za-z][^"$]*)"/g ) ) {
		const value = match[ 2 ].trim();
		if ( technicalAttribute.test( value ) || translatedNearby( line, value ) ) continue;
		findings.push( `${ index + 1 }: untranslated ${ match[ 1 ] }: ${ value }` );
	}
	for ( const match of line.matchAll( />([A-Za-z][^<>$]{1,100})</g ) ) {
		const value = match[ 1 ].trim();
		if ( ! value || technicalAttribute.test( value ) || translatedNearby( line, value ) ) continue;
		findings.push( `${ index + 1 }: untranslated text: ${ value }` );
	}
} );

if ( findings.length ) {
	console.error( findings.join( '\n' ) );
	console.error( `\ni18n-completeness: ${ findings.length } candidate(s) remain` );
	process.exit( 1 );
}
console.log( 'PASS i18n-completeness: no known static UI literals remain' );
