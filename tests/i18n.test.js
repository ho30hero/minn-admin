/**
 * i18n plumbing — WordPress' wp-i18n runtime backs the SPA's __()/_n()/sprintf
 * helpers. The suite installs a standard JED catalog in the page, exercises a
 * locale-specific plural rule through both the core API and rendered Minn DOM,
 * then restores the page's original locale data.
 *
 * English is the source vocabulary: the baseline pass also proves that an
 * empty catalog falls through to the literals.
 */
const { BASE, launch, login, reporter } = require( './helpers' );

( async () => {
	const { browser, page, errors } = await launch();
	const t = reporter( 'i18n' );
	let catalogInstalled = false;

	const shellState = () => page.evaluate( () => ( {
		overview: ( document.querySelector( '.minn-nav-btn[data-nav="overview"]' ) || {} ).textContent || '',
		content: ( document.querySelector( '.minn-nav-btn[data-nav="content"]' ) || {} ).textContent || '',
		group: ( document.querySelector( '[data-navgroup="workspace"]' ) || {} ).textContent || '',
		search: ( document.querySelector( '#minn-open-palette' ) || {} ).textContent || '',
		i18nKeys: Object.keys( window.MINN.i18n || {} ).length,
		wpI18n: !! ( window.wp && window.wp.i18n && window.wp.i18n.__ && window.wp.i18n._n ),
	} ) );

	try {
		await login( page );
		await page.goto( BASE + '/minn-admin/overview', { waitUntil: 'domcontentloaded' } );
		await page.waitForSelector( '.minn-nav-btn', { timeout: 15000 } );

		// Baseline: English source strings and no boot-payload overrides.
		const s = await shellState();
		t.check( 'WordPress i18n runtime is loaded', s.wpI18n );
		t.check( 'Empty override catalog serves as {}', s.i18nKeys === 0 );
		t.check( 'Baseline nav is English', /Overview/.test( s.overview ) && /Content/.test( s.content ) );
		t.check( 'Baseline group + search are English', /Workspace/.test( s.group ) && /Search…/.test( s.search ) );

		// Exercise the same standard JED shape wp_set_script_translations loads.
		// Persian deliberately differs from the English n !== 1 rule: 0 and 1
		// use the singular form, while values greater than 1 use the plural.
		const jed = await page.evaluate( () => {
			const domain = 'minn-admin';
			window.__minnPreviousLocaleData = window.wp.i18n.getLocaleData( domain );
			window.wp.i18n.setLocaleData( {
				'': { domain, lang: 'fa', 'plural-forms': 'nplurals=2; plural=n > 1;' },
				'Overview': [ 'نمای کلی' ],
				'Select all items': [ 'انتخاب همه موارد' ],
				'%d type': [ '%d نوع', '%d نوع‌ها' ],
			}, domain );
			return {
				singular: window.wp.i18n.__( 'Overview', domain ) === 'نمای کلی',
				plural0: window.wp.i18n._n( '%d type', '%d types', 0, domain ) === '%d نوع',
				plural1: window.wp.i18n._n( '%d type', '%d types', 1, domain ) === '%d نوع',
				plural2: window.wp.i18n._n( '%d type', '%d types', 2, domain ) === '%d نوع‌ها',
				fallback: window.wp.i18n.__( 'Settings', domain ) === 'Settings',
				positional: window.wp.i18n.sprintf( '%1$s / %2$d', 'ok', 2 ) === 'ok / 2',
			};
		} );
		catalogInstalled = true;
		t.check( 'Standard JED singular translation works', jed.singular );
		t.check( 'Standard JED locale plural rule works', jed.plural0 && jed.plural1 && jed.plural2 );
		t.check( 'Standard JED preserves English fallback', jed.fallback );
		t.check( 'WordPress sprintf supports positional placeholders', jed.positional );

		// Navigate after installing the catalog so Minn's module-local helpers
		// consume wp.i18n during a real render, not only through direct API calls.
		await page.click( '.minn-nav-btn[data-nav="content"]' );
		await page.waitForSelector( '#minn-sel-all', { timeout: 20000 } );
		t.check( 'Singular JED entry reaches rendered Minn DOM', await page.evaluate(
			() => document.querySelector( '#minn-sel-all' ).getAttribute( 'aria-label' ) === 'انتخاب همه موارد'
		) );
	} finally {
		if ( catalogInstalled ) {
			await page.evaluate( () => {
				window.wp.i18n.setLocaleData( window.__minnPreviousLocaleData, 'minn-admin' );
				delete window.__minnPreviousLocaleData;
			} ).catch( () => {} );
		}
	}

	await t.done( browser, errors );
} )().catch( ( e ) => {
	console.error( e );
	process.exit( 1 );
} );
