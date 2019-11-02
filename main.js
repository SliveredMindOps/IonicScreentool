const puppeteer = require('puppeteer');
const ioHook = require('iohook');
const config = require('./config.json');

(async () => {
	var browser = await puppeteer.launch({headless: false, args: ['--hide-scrollbars']});
	var pages = [];
	for(let ident of Object.keys(config.pages)) {
		pages[ident] = [];
		for (var i = config.pages[ident].length - 1; i >= 0; i--) {
			let page = await browser.newPage();
			let session = await page.target().createCDPSession();
			await session.send('Emulation.setScrollbarsHidden', {
				hidden: true
			});
			page.goto(config.pages[ident][i]);
			pages[ident].push(page);
		}
	}

	var main = new Main(browser, pages, config);
})();

class Main {
	constructor(browser, pages, config) {
		this.browser = browser;
		this.pages = pages;
		this.config = config;

		process.on('exit', () => {
			console.log("bye");
			this.browser.close();
		});

		ioHook.on("keypress", event => {
			if(!event.ctrlKey) {
				return;
			}

			for (var i = config.hotkeys.length - 1; i >= 0; i--) {
				if(event.rawcode == config.hotkeys[i].rawcode) {
					this.takeScreenshots(config.hotkeys[i].identifier);
					return;
				}
			}
		});
		ioHook.start();
		console.log("#### Screentool initialized ####");
	}

	async takeScreenshots(identifier) {
		console.log("Start taking screenshots for " + identifier);
		for (var i = this.pages[identifier].length - 1; i >= 0; i--) {
			var currentPage = this.pages[identifier][i];
			for (var m = this.config.resolutions[identifier].length - 1; m >= 0; m--) {
				var screenConfig = this.config.resolutions[identifier][m];
				console.log("Creating " + screenConfig.name + " @" + screenConfig.width + "*" + screenConfig.height + " dpi:" + screenConfig.dpi);
				await currentPage.setViewport({
					width: screenConfig.width,
					height: screenConfig.height,
					deviceScaleFactor: screenConfig.dpi,
				});
				await currentPage.screenshot({path: 'output/' + screenConfig.name + ' ' + Date.now() + '.png'});
			}
		}
		console.log("Done taking screenshots for " + identifier);
	}
}