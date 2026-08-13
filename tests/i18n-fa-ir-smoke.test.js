/**
 * Release smoke test for the generated fa_IR PHP and JavaScript catalogs.
 * The caller provides a disposable user whose WordPress profile locale is fa_IR.
 */
const { BASE, launch, login, reporter } = require( './helpers' );

( async () => {
	const { browser, page, errors } = await launch();
	const t = reporter( 'i18n-fa-ir-smoke' );

	try {
		await login( page );
		await page.goto( BASE + '/minn-admin/overview', { waitUntil: 'domcontentloaded' } );
		await page.waitForSelector( '.minn-nav-btn', { timeout: 15000 } );

		const state = await page.evaluate( () => ( {
			htmlLang: document.documentElement.lang,
			htmlDir: document.documentElement.dir,
			overview: ( document.querySelector( '.minn-nav-btn[data-nav="overview"]' ) || {} ).textContent || '',
			content: ( document.querySelector( '.minn-nav-btn[data-nav="content"]' ) || {} ).textContent || '',
			group: ( document.querySelector( '[data-navgroup="workspace"]' ) || {} ).textContent || '',
			search: ( document.querySelector( '#minn-open-palette' ) || {} ).textContent || '',
			phpLabel: ( ( window.MINN.appearanceSlots || [] ).find( ( slot ) => slot.key === 'bg' ) || {} ).label || '',
			wpI18n: !! ( window.wp && window.wp.i18n ),
			singular: window.wp.i18n.__( 'Overview', 'minn-admin' ),
			plural0: window.wp.i18n._n( '%d type', '%d types', 0, 'minn-admin' ),
			plural1: window.wp.i18n._n( '%d type', '%d types', 1, 'minn-admin' ),
			plural2: window.wp.i18n._n( '%d type', '%d types', 2, 'minn-admin' ),
			positional: window.wp.i18n.sprintf(
				window.wp.i18n.__( '%1$s tables · %2$s', 'minn-admin' ),
				'۲',
				'۱ مگابایت'
			),
			fallback: window.wp.i18n.__( 'Deliberately absent release-smoke string', 'minn-admin' ),
			otherDomain: window.wp.i18n.__( 'Overview', 'minn-admin-smoke-other' ),
			scriptOrder: ( () => {
				const scripts = [ ...document.scripts ];
				const dependency = scripts.findIndex( ( script ) => script.id === 'wp-i18n-js' );
				const translation = scripts.findIndex( ( script ) => script.id === 'minn-admin-app-js-translations' && /setLocaleData/.test( script.textContent ) );
				const app = scripts.findIndex( ( script ) => script.id === 'minn-admin-app-js' && /assets\/js\/app\.js/.test( script.src ) );
				return { dependency, translation, app };
			} )(),
		} ) );

		t.check( 'user locale reaches the document', /^fa(?:-|$)/i.test( state.htmlLang ) );
		t.check( 'user locale makes the document RTL', state.htmlDir === 'rtl' );
		t.check( 'PHP catalog translates boot-payload strings', state.phpLabel === 'پس‌زمینه' );
		t.check( 'generated JSON translates direct wp.i18n calls', state.wpI18n && state.singular === 'نمای کلی' );
		t.check( 'generated JSON translates rendered navigation', /نمای کلی/.test( state.overview ) && /محتوا/.test( state.content ) );
		t.check( 'generated JSON translates group and search labels', /فضای کاری/.test( state.group ) && /جست‌وجو/.test( state.search ) );
		t.check( 'Persian plural rule handles zero, one and many', state.plural0 === '%d نوع' && state.plural1 === '%d نوع' && state.plural2 === '%d نوع' );
		t.check( 'positional placeholders retain their order', state.positional === '۲ جدول · ۱ مگابایت' );
		t.check( 'missing entries retain the English source', state.fallback === 'Deliberately absent release-smoke string' );
		t.check( 'other domains retain the English source', state.otherDomain === 'Overview' );
		t.check( 'dependency and translation data precede the app', state.scriptOrder.dependency >= 0 && state.scriptOrder.translation > state.scriptOrder.dependency && state.scriptOrder.app > state.scriptOrder.translation );
	} finally {
		await t.done( browser, errors );
	}
} )().catch( ( error ) => {
	console.error( error );
	process.exit( 1 );
} );
