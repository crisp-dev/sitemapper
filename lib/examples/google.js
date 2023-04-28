"use strict";

var _sitemapper = _interopRequireDefault(require("../assets/sitemapper.js"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var Google = new _sitemapper.default({
  url: 'https://www.google.com/work/sitemap.xml',
  debug: false,
  timeout: 15000
});
Google.fetch().then(data => console.log(data.sites)).catch(error => console.log(error));
//# sourceMappingURL=google.js.map