/** Static RTL/bidi contract. No WordPress, npm install or browser required. */
const fs = require( 'fs' );
const path = require( 'path' );

const root = path.resolve( __dirname, '..' );
const template = fs.readFileSync( path.join( root, 'includes/template.php' ), 'utf8' );
const css = fs.readFileSync( path.join( root, 'assets/css/app.css' ), 'utf8' );
const js = fs.readFileSync( path.join( root, 'assets/js/app.js' ), 'utf8' );
const database = fs.readFileSync( path.join( root, 'includes/class-minn-admin-db.php' ), 'utf8' );
const checks = [];

function check( label, ok ) {
	checks.push( ok );
	console.log( `${ ok ? 'PASS' : 'FAIL' }  ${ label }` );
}

check( 'shell emits an escaped effective WordPress language', /lang="<\?php echo esc_attr\( get_bloginfo\( 'language' \) \); \?>"/.test( template ) );
check( 'shell derives an explicit direction from WordPress RTL detection', /dir="<\?php echo is_rtl\(\) \? 'rtl' : 'ltr'; \?>"/.test( template ) );
check( 'sidebar boundary follows the inline writing direction', /\.minn-sidebar[\s\S]*?border-inline-end:/.test( css ) );
check( 'settings navigation labels follow the inline writing direction', /\.minn-settings-nav-item\s*\{[^}]*text-align:\s*start;/.test( css ) );
check( 'New menu anchors from the RTL trigger edge and clamps inside the viewport', /document\.documentElement\.dir === 'rtl'[\s\S]*?\? r\.left[\s\S]*?window\.innerWidth - menu\.offsetWidth - 8/.test( js ) );
check( 'Persian plugin installer forces all result copy to the right edge', /\[dir="rtl"\] \.minn-modal-pi,[\s\S]*?\.minn-pi-info > \*[\s\S]*?text-align:\s*right;/.test( css ) );
check( 'notification panel follows the inline writing direction', /\.minn-notif-panel[\s\S]*?inset-inline-end:/.test( css ) );
check( 'RTL notification animation enters from the inline end', /@keyframes minnSlideInRtl[\s\S]*?translateX\(-100%\)/.test( css ) && /\[dir="rtl"\] \.minn-notif-panel/.test( css ) );
check( 'technical tokens are isolated LTR', /\.mono, \.minn-kbd[\s\S]*?direction: ltr;[\s\S]*?unicode-bidi: isolate;/.test( css ) );
check( 'user-authored labels establish independent bidi paragraphs', /\.minn-row-title[\s\S]*?unicode-bidi: plaintext;/.test( css ) );
check( 'semantic chevron SVGs are marked as directional', /class="minn-directional-icon"/.test( js ) );
check( 'crop geometry remains physical', /\[data-h="nw"\][^{]*\{[^}]*left: -6px/.test( css ) );
check( 'modal arrow placement remains physical', /\.minn-modal-nav\.prev \{ left:/.test( css ) && /\.minn-modal-nav\.next \{ right:/.test( css ) );
check( 'keyboard previous/next convention remains physical', /e\.key === 'ArrowLeft' \? -1 : 1/.test( js ) );
check( 'database metadata tolerates uppercase engine properties', /isset\( \$t->engine \)[\s\S]*?isset\( \$t->ENGINE \)/.test( database ) );

const failed = checks.filter( ( value ) => ! value ).length;
console.log( `\nrtl-foundation: ${ checks.length - failed }/${ checks.length } passed` );
process.exit( failed ? 1 : 0 );
