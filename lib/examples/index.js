"use strict";

var _sitemapper = _interopRequireDefault(require("../assets/sitemapper"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

var exampleURL = 'https://www.walmart.com/sitemap_topic.xml';
var sitemapper = new _sitemapper.default({
  url: exampleURL,
  debug: false,
  timeout: 10000,
  concurrency: 10,
  retries: 0
});

_asyncToGenerator(function* () {
  try {
    var data = yield sitemapper.fetch();
    console.log(data);
  } catch (error) {
    console.error(error);
  }
})();
//# sourceMappingURL=index.js.map