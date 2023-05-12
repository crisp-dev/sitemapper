"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _xml2js = require("xml2js");

var _got = _interopRequireDefault(require("got"));

var _zlib = _interopRequireDefault(require("zlib"));

var _pLimit = _interopRequireDefault(require("p-limit"));

var _isGzip = _interopRequireDefault(require("is-gzip"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

class Sitemapper {
  constructor(options) {
    var settings = options || {
      requestHeaders: {}
    };
    this.url = settings.url;
    this.timeout = settings.timeout || 15000;
    this.globalTimeout = settings.globalTimeout || 30000;
    this.maxSites = settings.maxSites || -1;
    this.timeoutTable = {};
    this.cancelTable = {};
    this.maxXMLSize = settings.maxXMLSize || 10000000;
    this.lastmod = settings.lastmod || 0;
    this.requestHeaders = settings.requestHeaders;
    this.debug = settings.debug;
    this.concurrency = settings.concurrency || 10;
    this.retries = settings.retries || 0;
    this.rejectUnauthorized = settings.rejectUnauthorized === false ? false : true;
    this.totalSites = 0;
  }

  fetch() {
    var _arguments = arguments,
        _this = this;

    return _asyncToGenerator(function* () {
      var url = _arguments.length > 0 && _arguments[0] !== undefined ? _arguments[0] : _this.url;
      var results = {
        url: "",
        sites: [],
        errors: []
      };

      if (_this.debug) {
        if (_this.lastmod) {
          console.debug("Using minimum lastmod value of ".concat(_this.lastmod));
        }
      }

      var globalExecutionTimeout = setTimeout(() => {
        _this.stopExecution();
      }, _this.globalTimeout);

      try {
        results = yield _this.crawl(url);
      } catch (e) {
        if (_this.debug) {
          console.error(e);
        }
      }

      clearTimeout(globalExecutionTimeout);
      return {
        url,
        sites: results.sites || [],
        errors: results.errors || []
      };
    })();
  }

  static get timeout() {
    return this.timeout;
  }

  static set timeout(duration) {
    this.timeout = duration;
  }

  static get globalTimeout() {
    return this.globalTimeout;
  }

  static set globalTimeout(duration) {
    this.globalTimeout = duration;
  }

  static get maxSites() {
    return this.maxSites;
  }

  static set maxSites(maxSites) {
    this.maxSites = maxSites;
  }

  static get lastmod() {
    return this.lastmod;
  }

  static set lastmod(timestamp) {
    this.lastmod = timestamp;
  }

  static set url(url) {
    this.url = url;
  }

  static get url() {
    return this.url;
  }

  static set debug(option) {
    this.debug = option;
  }

  static get debug() {
    return this.debug;
  }

  parse() {
    var _arguments2 = arguments,
        _this2 = this;

    return _asyncToGenerator(function* () {
      var url = _arguments2.length > 0 && _arguments2[0] !== undefined ? _arguments2[0] : _this2.url;
      var requestOptions = {
        method: "GET",
        resolveWithFullResponse: true,
        gzip: true,
        responseType: "buffer",
        headers: _this2.requestHeaders,
        https: {
          rejectUnauthorized: _this2.rejectUnauthorized
        }
      };

      try {
        var requester = _got.default.get(url, requestOptions);

        _this2.initializeTimeout(url, requester);

        var response = yield requester;

        if (!response || response.statusCode !== 200) {
          clearTimeout(_this2.timeoutTable[url]);
          delete _this2.timeoutTable[url];
          return {
            error: response.error,
            data: response
          };
        }

        var responseBody;

        if ((0, _isGzip.default)(response.rawBody)) {
          responseBody = yield _this2.decompressResponseBody(response.body);
        } else {
          responseBody = response.body;
        }

        if (responseBody.length > _this2.maxXMLSize && _this2.maxXMLSize != -1) {
          var error = "\n          Sitemap body exceeds ".concat(_this2.maxXMLSize / 1000 / 1000, "MB");
          return {
            error: error,
            data: new Error(error)
          };
        }

        var data = yield (0, _xml2js.parseStringPromise)(responseBody);
        return {
          error: null,
          data
        };
      } catch (error) {
        if (error.name === "CancelError") {
          return {
            error: "Request timed out after ".concat(_this2.timeout, " milliseconds for url: '").concat(url, "'"),
            data: error
          };
        }

        if (error.name === "HTTPError") {
          return {
            error: "HTTP Error occurred: ".concat(error.message),
            data: error
          };
        }

        return {
          error: "Error occurred: ".concat(error.name),
          data: error
        };
      }
    })();
  }

  initializeTimeout(url, requester) {
    this.cancelTable[url] = requester.cancel;
    this.timeoutTable[url] = setTimeout(() => this.cancelTable[url](), this.timeout);
  }

  stopExecution() {
    for (var _index in this.cancelTable) {
      this.cancelTable[_index]();

      delete this.cancelTable[_index];
    }

    for (var _index2 in this.timeoutTable) {
      clearTimeout(this.timeoutTable[_index2]);
      delete this.timeoutTable[_index2];
    }

    this.stopped = true;
  }

  crawl(url) {
    var _arguments3 = arguments,
        _this3 = this;

    return _asyncToGenerator(function* () {
      var retryIndex = _arguments3.length > 1 && _arguments3[1] !== undefined ? _arguments3[1] : 0;

      try {
        if (_this3.stopped === true) {
          return {
            sites: [],
            errors: [{
              type: "force_stopped",
              message: "Execution was stopped because global timeout was reached",
              url,
              retries: retryIndex
            }]
          };
        }

        if (_this3.maxSites !== -1 && _this3.totalSites > _this3.maxSites) {
          return {
            sites: [],
            errors: [{
              type: "force_stopped",
              message: "Execution was stopped because max sites was reached",
              url,
              retries: retryIndex
            }]
          };
        }

        var {
          error,
          data
        } = yield _this3.parse(url);
        clearTimeout(_this3.timeoutTable[url]);
        delete _this3.timeoutTable[url];

        if (error) {
          if (retryIndex < _this3.retries) {
            if (_this3.debug) {
              console.log("(Retry attempt: ".concat(retryIndex + 1, " / ").concat(_this3.retries, ") ").concat(url, " due to ").concat(data.name, " on previous request"));
            }

            return _this3.crawl(url, retryIndex + 1);
          }

          if (_this3.debug) {
            console.error("Error occurred during \"crawl('".concat(url, "')\":\n\r Error: ").concat(error));
          }

          return {
            sites: [],
            errors: [{
              type: data.name,
              message: error,
              url,
              retries: retryIndex
            }]
          };
        } else if (data && data.urlset && data.urlset.url) {
          if (_this3.debug) {
            console.debug("Urlset found during \"crawl('".concat(url, "')\""));
          }

          var sites = data.urlset.url.filter(site => {
            if (_this3.lastmod === 0) return true;
            if (site.lastmod === undefined) return false;
            var modified = new Date(site.lastmod[0]).getTime();
            return modified >= _this3.lastmod;
          }).map(site => site.loc && site.loc[0]);
          _this3.totalSites += sites.length;
          return {
            sites,
            errors: []
          };
        } else if (data && data.sitemapindex) {
          if (_this3.debug) {
            console.debug("Additional sitemap found during \"crawl('".concat(url, "')\""));
          }

          var sitemap = data.sitemapindex.sitemap.map(map => map.loc && map.loc[0]);
          var limit = (0, _pLimit.default)(_this3.concurrency);
          var promiseArray = sitemap.map(site => limit(() => _this3.crawl(site)));
          var results = yield Promise.all(promiseArray);

          var _sites = results.filter(result => result.errors.length === 0).reduce((prev, _ref) => {
            var {
              sites
            } = _ref;
            return [...prev, ...sites];
          }, []);

          var errors = results.filter(result => result.errors.length !== 0).reduce((prev, _ref2) => {
            var {
              errors
            } = _ref2;
            return [...prev, ...errors];
          }, []);
          return {
            sites: _sites,
            errors
          };
        }

        if (retryIndex < _this3.retries) {
          if (_this3.debug) {
            console.log("(Retry attempt: ".concat(retryIndex + 1, " / ").concat(_this3.retries, ") ").concat(url, " due to ").concat(data.name, " on previous request"));
          }

          return _this3.crawl(url, retryIndex + 1);
        }

        if (_this3.debug) {
          console.error("Unknown state during \"crawl('".concat(url, ")'\":"), error, data);
        }

        return {
          sites: [],
          errors: [{
            url,
            type: data.name || "UnknownStateError",
            message: "An unknown error occurred.",
            retries: retryIndex
          }]
        };
      } catch (e) {
        if (_this3.debug) {
          _this3.debug && console.error(e);
        }
      }
    })();
  }

  getSites() {
    var _arguments4 = arguments,
        _this4 = this;

    return _asyncToGenerator(function* () {
      var url = _arguments4.length > 0 && _arguments4[0] !== undefined ? _arguments4[0] : _this4.url;
      var callback = _arguments4.length > 1 ? _arguments4[1] : undefined;
      console.warn("\r\nWarning:", "function .getSites() is deprecated, please use the function .fetch()\r\n");
      var err = {};
      var sites = [];

      try {
        var response = yield _this4.fetch(url);
        sites = response.sites;
      } catch (error) {
        err = error;
      }

      return callback(err, sites);
    })();
  }

  decompressResponseBody(body) {
    return new Promise((resolve, reject) => {
      var buffer = Buffer.from(body);

      _zlib.default.gunzip(buffer, (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
    });
  }

}

exports.default = Sitemapper;
module.exports = exports.default;
module.exports.default = exports.default;
//# sourceMappingURL=sitemapper.js.map