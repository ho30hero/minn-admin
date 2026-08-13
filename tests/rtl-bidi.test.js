/** Runtime RTL/bidi regression. Caller supplies a disposable fa_IR user. */
const { BASE, launch, login, reporter } = require( './helpers' );

( async () => {
	const { browser, page, errors } = await launch();
	const t = reporter( 'rtl-bidi' );
	try {
		await login( page );
		await page.goto( BASE + '/minn-admin/overview', { waitUntil: 'domcontentloaded' } );
		await page.waitForSelector( '.minn-nav-btn', { timeout: 15000 } );
		const state = await page.evaluate( () => {
			const root = document.documentElement;
			const sidebar = document.querySelector( '.minn-sidebar' );
			const search = document.querySelector( '#minn-open-palette' );
			const probe = document.createElement( 'div' );
			probe.innerHTML = '<span class="minn-row-title">عنوان sample-post</span><span class="minn-permalink">https://example.com/a?b=1</span><span class="minn-entry-email">user@example.com</span><span class="minn-kbd">Ctrl+K</span><code>npm run test:i18n</code>';
			document.body.appendChild( probe );
			const technical = [ ...probe.querySelectorAll( '.minn-permalink,.minn-entry-email,.minn-kbd,code' ) ].map( ( el ) => ( {
				text: el.textContent,
				direction: getComputedStyle( el ).direction,
				bidi: getComputedStyle( el ).unicodeBidi,
			} ) );
			const authored = getComputedStyle( probe.querySelector( '.minn-row-title' ) ).unicodeBidi;
			probe.remove();
			return {
				lang: root.lang,
				dir: root.dir,
				sidebarEndBorder: getComputedStyle( sidebar ).borderInlineEndWidth,
				searchOverflow: search.scrollWidth > search.clientWidth + 1,
				docOverflow: document.documentElement.scrollWidth > innerWidth + 1,
				technical,
				authored,
			};
		} );
		t.check( 'effective user locale reaches html lang', /^fa(?:-|$)/i.test( state.lang ), state.lang );
		t.check( 'WordPress marks the document RTL', state.dir === 'rtl', state.dir );
		t.check( 'sidebar uses its logical end border', state.sidebarEndBorder !== '0px', state.sidebarEndBorder );
		t.check( 'shell has no horizontal viewport overflow', ! state.docOverflow );
		t.check( 'command control is not clipped', ! state.searchOverflow );
		t.check( 'URL, email, shortcut and code stay isolated LTR', state.technical.length === 4 && state.technical.every( ( item ) => item.direction === 'ltr' && /isolate/.test( item.bidi ) ), JSON.stringify( state.technical ) );
		t.check( 'mixed user content gets plaintext bidi handling', state.authored === 'plaintext', state.authored );
	} finally {
		await t.done( browser, errors );
	}
} )().catch( ( error ) => { console.error( error ); process.exit( 1 ); } );
