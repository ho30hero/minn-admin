/** AST gate: direct user-facing JS literals must go through gettext. */
const fs = require( 'fs' );
const path = require( 'path' );
const acorn = require( 'acorn' );

const source = fs.readFileSync( path.resolve( __dirname, '../assets/js/app.js' ), 'utf8' );
const ast = acorn.parse( source, { ecmaVersion: 'latest', sourceType: 'script', locations: true } );
const findings = [];
const uiCalls = new Set( [ 'toast', 'confirm', 'prompt' ] );
const uiProperties = new Set( [ 'title', 'body', 'confirmLabel', 'cancelLabel', 'label', 'desc', 'description', 'placeholder', 'emptyText', 'message' ] );
const uiAssignments = new Set( [ 'textContent', 'innerText', 'title', 'placeholder' ] );

function nameOf( node ) {
	if ( ! node ) return '';
	if ( node.type === 'Identifier' ) return node.name;
	if ( node.type !== 'MemberExpression' ) return '';
	return node.computed && node.property.type === 'Literal' ? node.property.value : node.property.name;
}
function isHumanLiteral( node ) {
	return node && node.type === 'Literal' && typeof node.value === 'string' && node.value.length > 1 && /[A-Za-z]/.test( node.value ) &&
		! /^(?:https?:|mailto:|tel:|[A-Z\d_-]{2,12}$|[a-z][\w-]*\.(?:php|js|css|json|xml|csv|zip)|v\d)/.test( node.value );
}
function inspect( node, context ) {
	if ( isHumanLiteral( node ) ) findings.push( `${ node.loc.start.line }: ${ context }: ${ node.value }` );
}
function walk( node ) {
	if ( ! node || typeof node !== 'object' ) return;
	if ( node.type === 'CallExpression' ) {
		const name = nameOf( node.callee );
		if ( uiCalls.has( name ) ) inspect( node.arguments[ 0 ], name );
		if ( name === 'setAttribute' && node.arguments[ 0 ] && /^(?:aria-label|title|placeholder)$/.test( node.arguments[ 0 ].value ) ) inspect( node.arguments[ 1 ], 'setAttribute' );
	}
	if ( node.type === 'AssignmentExpression' && uiAssignments.has( nameOf( node.left ) ) ) inspect( node.right, nameOf( node.left ) );
	if ( node.type === 'Property' && uiProperties.has( nameOf( node.key ) ) ) inspect( node.value, nameOf( node.key ) );
	for ( const value of Object.values( node ) ) {
		if ( Array.isArray( value ) ) value.forEach( walk );
		else if ( value && typeof value === 'object' && value.type ) walk( value );
	}
}
walk( ast );
if ( findings.length ) {
	console.error( findings.join( '\n' ) );
	process.exit( 1 );
}
console.log( 'PASS i18n-ui-ast: no direct user-facing JS literals remain' );
