/** Visual smoke matrix for RTL/LTR at desktop and phone viewports. */
const fs = require( 'fs' );
const path = require( 'path' );
const { BASE, launch, login, createPost, deletePost, reporter } = require( './helpers' );

( async () => {
	const { browser, page, errors } = await launch();
	const t = reporter( 'rtl-visual-smoke' );
	const expectedDir = process.env.MINN_TEST_DIR || 'rtl';
	const output = process.env.MINN_TEST_SCREENSHOTS || path.join( __dirname, '.rtl-smoke' );
	const routes = [ 'overview', 'content', 'media', 'database', 'settings', 'profile' ];
	const viewports = [ { name: 'desktop', width: 1440, height: 900 }, { name: 'mobile', width: 390, height: 844 } ];
	let postId = 0;
	fs.mkdirSync( output, { recursive: true } );

	try {
		await login( page );
		postId = await createPost( page, { title: 'عنوان فارسی sample-post', content: '<p>متن فارسی with user@example.com and https://example.com/docs</p><pre><code>npm run test:i18n</code></pre>' } );
		for ( const viewport of viewports ) {
			await page.setViewportSize( viewport );
			for ( const route of routes.concat( `editor/posts/${ postId }` ) ) {
				await page.goto( `${ BASE }/minn-admin/${ route }`, { waitUntil: 'domcontentloaded' } );
				await page.waitForSelector( '.minn-shell', { timeout: 20000 } );
				await page.waitForTimeout( 700 );
				const layout = await page.evaluate( () => {
					const visible = ( el ) => !! el && el.getClientRects().length > 0;
					const clipped = [ ...document.querySelectorAll( '.minn-sidebar,.minn-topbar,.minn-toolbar,.minn-table,.minn-settings,.minn-editor,.minn-modal' ) ]
						.filter( visible ).some( ( el ) => el.scrollWidth > el.clientWidth + 2 && getComputedStyle( el ).overflowX === 'hidden' );
					return { dir: document.documentElement.dir, overflow: document.documentElement.scrollWidth > innerWidth + 2, clipped };
				} );
				t.check( `${ expectedDir } ${ viewport.name } ${ route } direction`, layout.dir === expectedDir, layout.dir );
				t.check( `${ expectedDir } ${ viewport.name } ${ route } fits viewport`, ! layout.overflow && ! layout.clipped, JSON.stringify( layout ) );
				await page.screenshot( { path: path.join( output, `${ expectedDir }-${ viewport.name}-${ route.replace( /\//g, '-' )}.png` ), fullPage: true } );
			}
			await page.goto( `${ BASE }/minn-admin/overview`, { waitUntil: 'domcontentloaded' } );
			await page.waitForSelector( '#minn-open-palette' );
			await page.click( '#minn-open-palette' );
			await page.waitForSelector( '.minn-palette' );
			const paletteFits = await page.$eval( '.minn-palette', ( el ) => {
				const rect = el.getBoundingClientRect();
				return rect.left >= 0 && rect.right <= innerWidth && el.scrollWidth <= el.clientWidth + 2;
			} );
			t.check( `${ expectedDir } ${ viewport.name } command palette fits`, paletteFits );
			await page.screenshot( { path: path.join( output, `${ expectedDir }-${ viewport.name}-palette.png` ), fullPage: true } );
		}
	} finally {
		await deletePost( page, postId );
		await t.done( browser, errors );
	}
} )().catch( ( error ) => { console.error( error ); process.exit( 1 ); } );
