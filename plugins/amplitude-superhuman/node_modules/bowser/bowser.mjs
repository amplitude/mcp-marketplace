/*!
 * Bowser - a browser detector
 * https://github.com/lancedikson/bowser
 * MIT License | (c) Dustin Diaz 2012-2015
 * MIT License | (c) Denis Demchenko 2015-2026
 */
//#region src/constants.js
var BROWSER_ALIASES_MAP = {
  AmazonBot: "amazonbot",
  "Amazon Silk": "amazon_silk",
  "Android Browser": "android",
  BaiduSpider: "baiduspider",
  Bada: "bada",
  BingCrawler: "bingcrawler",
  Brave: "brave",
  BlackBerry: "blackberry",
  "ChatGPT-User": "chatgpt_user",
  Chrome: "chrome",
  ClaudeBot: "claudebot",
  Chromium: "chromium",
  Diffbot: "diffbot",
  DuckDuckBot: "duckduckbot",
  DuckDuckGo: "duckduckgo",
  Electron: "electron",
  Epiphany: "epiphany",
  FacebookExternalHit: "facebookexternalhit",
  Firefox: "firefox",
  Focus: "focus",
  Generic: "generic",
  "Google Search": "google_search",
  Googlebot: "googlebot",
  GPTBot: "gptbot",
  "HeyTap Browser": "heytap",
  "Internet Explorer": "ie",
  InternetArchiveCrawler: "internetarchivecrawler",
  "K-Meleon": "k_meleon",
  Ladybird: "ladybird",
  LibreWolf: "librewolf",
  Linespider: "linespider",
  Maxthon: "maxthon",
  "Meta-ExternalAds": "meta_externalads",
  "Meta-ExternalAgent": "meta_externalagent",
  "Meta-ExternalFetcher": "meta_externalfetcher",
  "Meta-WebIndexer": "meta_webindexer",
  "Microsoft Edge": "edge",
  "MZ Browser": "mz",
  "NAVER Whale Browser": "naver",
  "OAI-SearchBot": "oai_searchbot",
  Omgilibot: "omgilibot",
  Opera: "opera",
  "Opera Coast": "opera_coast",
  "Pale Moon": "pale_moon",
  PerplexityBot: "perplexitybot",
  "Perplexity-User": "perplexity_user",
  PhantomJS: "phantomjs",
  PingdomBot: "pingdombot",
  Puffin: "puffin",
  QQ: "qq",
  QQLite: "qqlite",
  QupZilla: "qupzilla",
  Roku: "roku",
  Safari: "safari",
  Sailfish: "sailfish",
  "Samsung Internet for Android": "samsung_internet",
  SlackBot: "slackbot",
  SeaMonkey: "seamonkey",
  Sleipnir: "sleipnir",
  "Sogou Browser": "sogou",
  Swing: "swing",
  Tizen: "tizen",
  "UC Browser": "uc",
  "Vivo Browser": "vivo",
  Vivaldi: "vivaldi",
  "WebOS Browser": "webos",
  WeChat: "wechat",
  YahooSlurp: "yahooslurp",
  "Yandex Browser": "yandex",
  YandexBot: "yandexbot",
  YouBot: "youbot"
};
var BROWSER_MAP = {
  amazonbot: "AmazonBot",
  amazon_silk: "Amazon Silk",
  android: "Android Browser",
  baiduspider: "BaiduSpider",
  bada: "Bada",
  bingcrawler: "BingCrawler",
  blackberry: "BlackBerry",
  brave: "Brave",
  chatgpt_user: "ChatGPT-User",
  chrome: "Chrome",
  claudebot: "ClaudeBot",
  chromium: "Chromium",
  diffbot: "Diffbot",
  duckduckbot: "DuckDuckBot",
  duckduckgo: "DuckDuckGo",
  edge: "Microsoft Edge",
  electron: "Electron",
  epiphany: "Epiphany",
  facebookexternalhit: "FacebookExternalHit",
  firefox: "Firefox",
  focus: "Focus",
  generic: "Generic",
  google_search: "Google Search",
  googlebot: "Googlebot",
  gptbot: "GPTBot",
  heytap: "HeyTap Browser",
  ie: "Internet Explorer",
  internetarchivecrawler: "InternetArchiveCrawler",
  k_meleon: "K-Meleon",
  ladybird: "Ladybird",
  librewolf: "LibreWolf",
  linespider: "Linespider",
  maxthon: "Maxthon",
  meta_externalads: "Meta-ExternalAds",
  meta_externalagent: "Meta-ExternalAgent",
  meta_externalfetcher: "Meta-ExternalFetcher",
  meta_webindexer: "Meta-WebIndexer",
  mz: "MZ Browser",
  naver: "NAVER Whale Browser",
  oai_searchbot: "OAI-SearchBot",
  omgilibot: "Omgilibot",
  opera: "Opera",
  opera_coast: "Opera Coast",
  pale_moon: "Pale Moon",
  perplexitybot: "PerplexityBot",
  perplexity_user: "Perplexity-User",
  phantomjs: "PhantomJS",
  pingdombot: "PingdomBot",
  puffin: "Puffin",
  qq: "QQ Browser",
  qqlite: "QQ Browser Lite",
  qupzilla: "QupZilla",
  roku: "Roku",
  safari: "Safari",
  sailfish: "Sailfish",
  samsung_internet: "Samsung Internet for Android",
  seamonkey: "SeaMonkey",
  slackbot: "SlackBot",
  sleipnir: "Sleipnir",
  sogou: "Sogou Browser",
  swing: "Swing",
  tizen: "Tizen",
  uc: "UC Browser",
  vivo: "Vivo Browser",
  vivaldi: "Vivaldi",
  webos: "WebOS Browser",
  wechat: "WeChat",
  yahooslurp: "YahooSlurp",
  yandex: "Yandex Browser",
  yandexbot: "YandexBot",
  youbot: "YouBot"
};
var PLATFORMS_MAP = {
  bot: "bot",
  desktop: "desktop",
  mobile: "mobile",
  tablet: "tablet",
  tv: "tv"
};
var OS_MAP = {
  Android: "Android",
  Bada: "Bada",
  BlackBerry: "BlackBerry",
  ChromeOS: "Chrome OS",
  HarmonyOS: "HarmonyOS",
  iOS: "iOS",
  Linux: "Linux",
  MacOS: "macOS",
  PlayStation4: "PlayStation 4",
  Roku: "Roku",
  Tizen: "Tizen",
  WebOS: "WebOS",
  Windows: "Windows",
  WindowsPhone: "Windows Phone"
};
var ENGINE_MAP = {
  Blink: "Blink",
  EdgeHTML: "EdgeHTML",
  Gecko: "Gecko",
  LibWeb: "LibWeb",
  Presto: "Presto",
  Trident: "Trident",
  WebKit: "WebKit"
};

//#endregion
//#region src/utils.js
var Utils = /*#__PURE__*/function () {
  function Utils() {}
  /**
  * Get first matched item for a string
  * @param {RegExp} regexp
  * @param {String} ua
  * @return {Array|{index: number, input: string}|*|boolean|string}
  */
  Utils.getFirstMatch = function getFirstMatch(regexp, ua) {
    var match = ua.match(regexp);
    return match && match.length > 0 && match[1] || "";
  };
  Utils.getSecondMatch = function getSecondMatch(regexp, ua) {
    var match = ua.match(regexp);
    return match && match.length > 1 && match[2] || "";
  };
  Utils.matchAndReturnConst = function matchAndReturnConst(regexp, ua, _const) {
    if (regexp.test(ua)) return _const;
  };
  Utils.isFirefoxOnIpad = function isFirefoxOnIpad(ua) {
    var macIndex = ua.indexOf("Macintosh");
    if (macIndex === -1) return false;
    var fxiosIndex = ua.indexOf(" FxiOS", macIndex + 9);
    return fxiosIndex !== -1 && ua.indexOf("/", fxiosIndex + 6) !== -1;
  };
  Utils.getWindowsVersionName = function getWindowsVersionName(version) {
    switch (version) {
      case "NT":
        return "NT";
      case "XP":
        return "XP";
      case "NT 5.0":
        return "2000";
      case "NT 5.1":
        return "XP";
      case "NT 5.2":
        return "2003";
      case "NT 6.0":
        return "Vista";
      case "NT 6.1":
        return "7";
      case "NT 6.2":
        return "8";
      case "NT 6.3":
        return "8.1";
      case "NT 10.0":
        return "10";
      default:
        return;
    }
  };
  Utils.getMacOSVersionName = function getMacOSVersionName(version) {
    var v = version.split(".").splice(0, 2).map(function (s) {
      return parseInt(s, 10) || 0;
    });
    v.push(0);
    var major = v[0];
    var minor = v[1];
    if (major === 10) switch (minor) {
      case 5:
        return "Leopard";
      case 6:
        return "Snow Leopard";
      case 7:
        return "Lion";
      case 8:
        return "Mountain Lion";
      case 9:
        return "Mavericks";
      case 10:
        return "Yosemite";
      case 11:
        return "El Capitan";
      case 12:
        return "Sierra";
      case 13:
        return "High Sierra";
      case 14:
        return "Mojave";
      case 15:
        return "Catalina";
      default:
        return;
    }
    switch (major) {
      case 11:
        return "Big Sur";
      case 12:
        return "Monterey";
      case 13:
        return "Ventura";
      case 14:
        return "Sonoma";
      case 15:
        return "Sequoia";
      default:
        return;
    }
  };
  Utils.getAndroidVersionName = function getAndroidVersionName(version) {
    var v = version.split(".").splice(0, 2).map(function (s) {
      return parseInt(s, 10) || 0;
    });
    v.push(0);
    if (v[0] === 1 && v[1] < 5) return void 0;
    if (v[0] === 1 && v[1] < 6) return "Cupcake";
    if (v[0] === 1 && v[1] >= 6) return "Donut";
    if (v[0] === 2 && v[1] < 2) return "Eclair";
    if (v[0] === 2 && v[1] === 2) return "Froyo";
    if (v[0] === 2 && v[1] > 2) return "Gingerbread";
    if (v[0] === 3) return "Honeycomb";
    if (v[0] === 4 && v[1] < 1) return "Ice Cream Sandwich";
    if (v[0] === 4 && v[1] < 4) return "Jelly Bean";
    if (v[0] === 4 && v[1] >= 4) return "KitKat";
    if (v[0] === 5) return "Lollipop";
    if (v[0] === 6) return "Marshmallow";
    if (v[0] === 7) return "Nougat";
    if (v[0] === 8) return "Oreo";
    if (v[0] === 9) return "Pie";
  };
  Utils.getVersionPrecision = function getVersionPrecision(version) {
    return version.split(".").length;
  };
  Utils.compareVersions = function compareVersions(versionA, versionB, isLoose) {
    if (isLoose === void 0) isLoose = false;
    var versionAPrecision = Utils.getVersionPrecision(versionA);
    var versionBPrecision = Utils.getVersionPrecision(versionB);
    var precision = Math.max(versionAPrecision, versionBPrecision);
    var lastPrecision = 0;
    var chunks = Utils.map([versionA, versionB], function (version) {
      var delta = precision - Utils.getVersionPrecision(version);
      var _version = version + new Array(delta + 1).join(".0");
      return Utils.map(_version.split("."), function (chunk) {
        return new Array(20 - chunk.length).join("0") + chunk;
      }).reverse();
    });
    if (isLoose) lastPrecision = precision - Math.min(versionAPrecision, versionBPrecision);
    precision -= 1;
    while (precision >= lastPrecision) {
      if (chunks[0][precision] > chunks[1][precision]) return 1;
      if (chunks[0][precision] === chunks[1][precision]) {
        if (precision === lastPrecision) return 0;
        precision -= 1;
      } else if (chunks[0][precision] < chunks[1][precision]) return -1;
    }
  };
  Utils.map = function map(arr, iterator) {
    var result = [];
    var i;
    if (Array.prototype.map) return Array.prototype.map.call(arr, iterator);
    for (i = 0; i < arr.length; i += 1) result.push(iterator(arr[i]));
    return result;
  };
  Utils.find = function find(arr, predicate) {
    var i;
    var l;
    if (Array.prototype.find) return Array.prototype.find.call(arr, predicate);
    for (i = 0, l = arr.length; i < l; i += 1) {
      var value = arr[i];
      if (predicate(value, i)) return value;
    }
  };
  Utils.assign = function assign(obj) {
    var result = obj;
    var i;
    var l;
    for (var _len = arguments.length, assigners = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) assigners[_key - 1] = arguments[_key];
    if (Object.assign) return Object.assign.apply(Object, [obj].concat(assigners));
    var _loop = function _loop() {
      var assigner = assigners[i];
      if (typeof assigner === "object" && assigner !== null) Object.keys(assigner).forEach(function (key) {
        result[key] = assigner[key];
      });
    };
    for (i = 0, l = assigners.length; i < l; i += 1) _loop();
    return obj;
  };
  Utils.getBrowserAlias = function getBrowserAlias(browserName) {
    return BROWSER_ALIASES_MAP[browserName];
  };
  Utils.getBrowserTypeByAlias = function getBrowserTypeByAlias(browserAlias) {
    return BROWSER_MAP[browserAlias] || "";
  };
  return Utils;
}();

//#endregion
//#region src/parser-browsers.js
/**
* Browsers' descriptors
*
* The idea of descriptors is simple. You should know about them two simple things:
* 1. Every descriptor has a method or property called `test` and a `describe` method.
* 2. Order of descriptors is important.
*
* More details:
* 1. Method or property `test` serves as a way to detect whether the UA string
* matches some certain browser or not. The `describe` method helps to make a result
* object with params that show some browser-specific things: name, version, etc.
* 2. Order of descriptors is important because a Parser goes through them one by one
* in course. For example, if you insert Chrome's descriptor as the first one,
* more then a half of browsers will be described as Chrome, because they will pass
* the Chrome descriptor's test.
*
* Descriptor's `test` could be a property with an array of RegExps, where every RegExp
* will be applied to a UA string to test it whether it matches or not.
* If a descriptor has two or more regexps in the `test` array it tests them one by one
* with a logical sum operation. Parser stops if it has found any RegExp that matches the UA.
*
* Or `test` could be a method. In that case it gets a Parser instance and should
* return true/false to get the Parser know if this browser descriptor matches the UA or not.
*/
var commonVersionIdentifier = /version\/(\d+(\.?_?\d+)+)/i;
var browsersList = [{
  test: [/gptbot/i],
  describe: function describe(ua) {
    var browser = {
      name: "GPTBot"
    };
    var version = Utils.getFirstMatch(/gptbot\/(\d+(\.\d+)+)/i, ua) || Utils.getFirstMatch(commonVersionIdentifier, ua);
    if (version) browser.version = version;
    return browser;
  }
}, {
  test: [/chatgpt-user/i],
  describe: function describe(ua) {
    var browser = {
      name: "ChatGPT-User"
    };
    var version = Utils.getFirstMatch(/chatgpt-user\/(\d+(\.\d+)+)/i, ua) || Utils.getFirstMatch(commonVersionIdentifier, ua);
    if (version) browser.version = version;
    return browser;
  }
}, {
  test: [/oai-searchbot/i],
  describe: function describe(ua) {
    var browser = {
      name: "OAI-SearchBot"
    };
    var version = Utils.getFirstMatch(/oai-searchbot\/(\d+(\.\d+)+)/i, ua) || Utils.getFirstMatch(commonVersionIdentifier, ua);
    if (version) browser.version = version;
    return browser;
  }
}, {
  test: [/claudebot/i, /claude-web/i, /claude-user/i, /claude-searchbot/i],
  describe: function describe(ua) {
    var browser = {
      name: "ClaudeBot"
    };
    var version = Utils.getFirstMatch(/(?:claudebot|claude-web|claude-user|claude-searchbot)\/(\d+(\.\d+)+)/i, ua) || Utils.getFirstMatch(commonVersionIdentifier, ua);
    if (version) browser.version = version;
    return browser;
  }
}, {
  test: [/omgilibot/i, /webzio-extended/i],
  describe: function describe(ua) {
    var browser = {
      name: "Omgilibot"
    };
    var version = Utils.getFirstMatch(/(?:omgilibot|webzio-extended)\/(\d+(\.\d+)+)/i, ua) || Utils.getFirstMatch(commonVersionIdentifier, ua);
    if (version) browser.version = version;
    return browser;
  }
}, {
  test: [/diffbot/i],
  describe: function describe(ua) {
    var browser = {
      name: "Diffbot"
    };
    var version = Utils.getFirstMatch(/diffbot\/(\d+(\.\d+)+)/i, ua) || Utils.getFirstMatch(commonVersionIdentifier, ua);
    if (version) browser.version = version;
    return browser;
  }
}, {
  test: [/perplexitybot/i],
  describe: function describe(ua) {
    var browser = {
      name: "PerplexityBot"
    };
    var version = Utils.getFirstMatch(/perplexitybot\/(\d+(\.\d+)+)/i, ua) || Utils.getFirstMatch(commonVersionIdentifier, ua);
    if (version) browser.version = version;
    return browser;
  }
}, {
  test: [/perplexity-user/i],
  describe: function describe(ua) {
    var browser = {
      name: "Perplexity-User"
    };
    var version = Utils.getFirstMatch(/perplexity-user\/(\d+(\.\d+)+)/i, ua) || Utils.getFirstMatch(commonVersionIdentifier, ua);
    if (version) browser.version = version;
    return browser;
  }
}, {
  test: [/youbot/i],
  describe: function describe(ua) {
    var browser = {
      name: "YouBot"
    };
    var version = Utils.getFirstMatch(/youbot\/(\d+(\.\d+)+)/i, ua) || Utils.getFirstMatch(commonVersionIdentifier, ua);
    if (version) browser.version = version;
    return browser;
  }
}, {
  test: [/meta-webindexer/i],
  describe: function describe(ua) {
    var browser = {
      name: "Meta-WebIndexer"
    };
    var version = Utils.getFirstMatch(/meta-webindexer\/(\d+(\.\d+)+)/i, ua) || Utils.getFirstMatch(commonVersionIdentifier, ua);
    if (version) browser.version = version;
    return browser;
  }
}, {
  test: [/meta-externalads/i],
  describe: function describe(ua) {
    var browser = {
      name: "Meta-ExternalAds"
    };
    var version = Utils.getFirstMatch(/meta-externalads\/(\d+(\.\d+)+)/i, ua) || Utils.getFirstMatch(commonVersionIdentifier, ua);
    if (version) browser.version = version;
    return browser;
  }
}, {
  test: [/meta-externalagent/i],
  describe: function describe(ua) {
    var browser = {
      name: "Meta-ExternalAgent"
    };
    var version = Utils.getFirstMatch(/meta-externalagent\/(\d+(\.\d+)+)/i, ua) || Utils.getFirstMatch(commonVersionIdentifier, ua);
    if (version) browser.version = version;
    return browser;
  }
}, {
  test: [/meta-externalfetcher/i],
  describe: function describe(ua) {
    var browser = {
      name: "Meta-ExternalFetcher"
    };
    var version = Utils.getFirstMatch(/meta-externalfetcher\/(\d+(\.\d+)+)/i, ua) || Utils.getFirstMatch(commonVersionIdentifier, ua);
    if (version) browser.version = version;
    return browser;
  }
}, {
  test: [/googlebot/i],
  describe: function describe(ua) {
    var browser = {
      name: "Googlebot"
    };
    var version = Utils.getFirstMatch(/googlebot\/(\d+(\.\d+))/i, ua) || Utils.getFirstMatch(commonVersionIdentifier, ua);
    if (version) browser.version = version;
    return browser;
  }
}, {
  test: [/linespider/i],
  describe: function describe(ua) {
    var browser = {
      name: "Linespider"
    };
    var version = Utils.getFirstMatch(/(?:linespider)(?:-[-\w]{1,64})?[\s/](\d+(\.\d+)+)/i, ua) || Utils.getFirstMatch(commonVersionIdentifier, ua);
    if (version) browser.version = version;
    return browser;
  }
}, {
  test: [/amazonbot/i],
  describe: function describe(ua) {
    var browser = {
      name: "AmazonBot"
    };
    var version = Utils.getFirstMatch(/amazonbot\/(\d+(\.\d+)+)/i, ua) || Utils.getFirstMatch(commonVersionIdentifier, ua);
    if (version) browser.version = version;
    return browser;
  }
}, {
  test: [/bingbot/i],
  describe: function describe(ua) {
    var browser = {
      name: "BingCrawler"
    };
    var version = Utils.getFirstMatch(/bingbot\/(\d+(\.\d+)+)/i, ua) || Utils.getFirstMatch(commonVersionIdentifier, ua);
    if (version) browser.version = version;
    return browser;
  }
}, {
  test: [/baiduspider/i],
  describe: function describe(ua) {
    var browser = {
      name: "BaiduSpider"
    };
    var version = Utils.getFirstMatch(/baiduspider\/(\d+(\.\d+)+)/i, ua) || Utils.getFirstMatch(commonVersionIdentifier, ua);
    if (version) browser.version = version;
    return browser;
  }
}, {
  test: [/duckduckbot/i],
  describe: function describe(ua) {
    var browser = {
      name: "DuckDuckBot"
    };
    var version = Utils.getFirstMatch(/duckduckbot\/(\d+(\.\d+)+)/i, ua) || Utils.getFirstMatch(commonVersionIdentifier, ua);
    if (version) browser.version = version;
    return browser;
  }
}, {
  test: [/ia_archiver/i],
  describe: function describe(ua) {
    var browser = {
      name: "InternetArchiveCrawler"
    };
    var version = Utils.getFirstMatch(/ia_archiver\/(\d+(\.\d+)+)/i, ua) || Utils.getFirstMatch(commonVersionIdentifier, ua);
    if (version) browser.version = version;
    return browser;
  }
}, {
  test: [/facebookexternalhit/i, /facebookcatalog/i],
  describe: function describe() {
    return {
      name: "FacebookExternalHit"
    };
  }
}, {
  test: [/slackbot/i, /slack-imgProxy/i],
  describe: function describe(ua) {
    var browser = {
      name: "SlackBot"
    };
    var version = Utils.getFirstMatch(/(?:slackbot|slack-imgproxy)(?:-[-\w]{1,64})?[\s/](\d+(\.\d+)+)/i, ua) || Utils.getFirstMatch(commonVersionIdentifier, ua);
    if (version) browser.version = version;
    return browser;
  }
}, {
  test: [/yahoo!?[\s/]*slurp/i],
  describe: function describe() {
    return {
      name: "YahooSlurp"
    };
  }
}, {
  test: [/yandexbot/i, /yandexmobilebot/i],
  describe: function describe() {
    return {
      name: "YandexBot"
    };
  }
}, {
  test: [/pingdom/i],
  describe: function describe() {
    return {
      name: "PingdomBot"
    };
  }
}, {
  test: [/opera/i],
  describe: function describe(ua) {
    var browser = {
      name: "Opera"
    };
    var version = Utils.getFirstMatch(commonVersionIdentifier, ua) || Utils.getFirstMatch(/(?:opera)[\s/](\d+(\.?_?\d+)+)/i, ua);
    if (version) browser.version = version;
    return browser;
  }
}, {
  test: [/opr\/|opios/i],
  describe: function describe(ua) {
    var browser = {
      name: "Opera"
    };
    var version = Utils.getFirstMatch(/(?:opr|opios)[\s/](\S+)/i, ua) || Utils.getFirstMatch(commonVersionIdentifier, ua);
    if (version) browser.version = version;
    return browser;
  }
}, {
  test: [/SamsungBrowser/i],
  describe: function describe(ua) {
    var browser = {
      name: "Samsung Internet for Android"
    };
    var version = Utils.getFirstMatch(commonVersionIdentifier, ua) || Utils.getFirstMatch(/(?:SamsungBrowser)[\s/](\d+(\.?_?\d+)+)/i, ua);
    if (version) browser.version = version;
    return browser;
  }
}, {
  test: [/Whale/i],
  describe: function describe(ua) {
    var browser = {
      name: "NAVER Whale Browser"
    };
    var version = Utils.getFirstMatch(commonVersionIdentifier, ua) || Utils.getFirstMatch(/(?:whale)[\s/](\d+(?:\.\d+)+)/i, ua);
    if (version) browser.version = version;
    return browser;
  }
}, {
  test: [/PaleMoon/i],
  describe: function describe(ua) {
    var browser = {
      name: "Pale Moon"
    };
    var version = Utils.getFirstMatch(commonVersionIdentifier, ua) || Utils.getFirstMatch(/(?:PaleMoon)[\s/](\d+(?:\.\d+)+)/i, ua);
    if (version) browser.version = version;
    return browser;
  }
}, {
  test: [/HeyTapBrowser/i],
  describe: function describe(ua) {
    var browser = {
      name: "HeyTap Browser"
    };
    var version = Utils.getFirstMatch(/(?:HeyTapBrowser)[\s/](\d+(?:\.\d+)*)/i, ua) || Utils.getFirstMatch(commonVersionIdentifier, ua);
    if (version) browser.version = version;
    return browser;
  }
}, {
  test: [/VivoBrowser/i],
  describe: function describe(ua) {
    var browser = {
      name: "Vivo Browser"
    };
    var version = Utils.getFirstMatch(/(?:VivoBrowser)[\s/](\d+(?:\.\d+)*)/i, ua) || Utils.getFirstMatch(commonVersionIdentifier, ua);
    if (version) browser.version = version;
    return browser;
  }
}, {
  test: [/MZBrowser/i],
  describe: function describe(ua) {
    var browser = {
      name: "MZ Browser"
    };
    var version = Utils.getFirstMatch(/(?:MZBrowser)[\s/](\d+(?:\.\d+)+)/i, ua) || Utils.getFirstMatch(commonVersionIdentifier, ua);
    if (version) browser.version = version;
    return browser;
  }
}, {
  test: [/focus/i],
  describe: function describe(ua) {
    var browser = {
      name: "Focus"
    };
    var version = Utils.getFirstMatch(/(?:focus)[\s/](\d+(?:\.\d+)+)/i, ua) || Utils.getFirstMatch(commonVersionIdentifier, ua);
    if (version) browser.version = version;
    return browser;
  }
}, {
  test: [/swing/i],
  describe: function describe(ua) {
    var browser = {
      name: "Swing"
    };
    var version = Utils.getFirstMatch(/(?:swing)[\s/](\d+(?:\.\d+)+)/i, ua) || Utils.getFirstMatch(commonVersionIdentifier, ua);
    if (version) browser.version = version;
    return browser;
  }
}, {
  test: [/coast/i],
  describe: function describe(ua) {
    var browser = {
      name: "Opera Coast"
    };
    var version = Utils.getFirstMatch(commonVersionIdentifier, ua) || Utils.getFirstMatch(/(?:coast)[\s/](\d+(\.?_?\d+)+)/i, ua);
    if (version) browser.version = version;
    return browser;
  }
}, {
  test: [/opt\/\d+(?:.?_?\d+)+/i],
  describe: function describe(ua) {
    var browser = {
      name: "Opera Touch"
    };
    var version = Utils.getFirstMatch(/(?:opt)[\s/](\d+(\.?_?\d+)+)/i, ua) || Utils.getFirstMatch(commonVersionIdentifier, ua);
    if (version) browser.version = version;
    return browser;
  }
}, {
  test: [/yabrowser/i],
  describe: function describe(ua) {
    var browser = {
      name: "Yandex Browser"
    };
    var version = Utils.getFirstMatch(/(?:yabrowser)[\s/](\d+(\.?_?\d+)+)/i, ua) || Utils.getFirstMatch(commonVersionIdentifier, ua);
    if (version) browser.version = version;
    return browser;
  }
}, {
  test: [/ucbrowser/i],
  describe: function describe(ua) {
    var browser = {
      name: "UC Browser"
    };
    var version = Utils.getFirstMatch(commonVersionIdentifier, ua) || Utils.getFirstMatch(/(?:ucbrowser)[\s/](\d+(\.?_?\d+)+)/i, ua);
    if (version) browser.version = version;
    return browser;
  }
}, {
  test: [/Maxthon|mxios/i],
  describe: function describe(ua) {
    var browser = {
      name: "Maxthon"
    };
    var version = Utils.getFirstMatch(commonVersionIdentifier, ua) || Utils.getFirstMatch(/(?:Maxthon|mxios)[\s/](\d+(\.?_?\d+)+)/i, ua);
    if (version) browser.version = version;
    return browser;
  }
}, {
  test: [/epiphany/i],
  describe: function describe(ua) {
    var browser = {
      name: "Epiphany"
    };
    var version = Utils.getFirstMatch(commonVersionIdentifier, ua) || Utils.getFirstMatch(/(?:epiphany)[\s/](\d+(\.?_?\d+)+)/i, ua);
    if (version) browser.version = version;
    return browser;
  }
}, {
  test: [/puffin/i],
  describe: function describe(ua) {
    var browser = {
      name: "Puffin"
    };
    var version = Utils.getFirstMatch(commonVersionIdentifier, ua) || Utils.getFirstMatch(/(?:puffin)[\s/](\d+(\.?_?\d+)+)/i, ua);
    if (version) browser.version = version;
    return browser;
  }
}, {
  test: [/sleipnir/i],
  describe: function describe(ua) {
    var browser = {
      name: "Sleipnir"
    };
    var version = Utils.getFirstMatch(commonVersionIdentifier, ua) || Utils.getFirstMatch(/(?:sleipnir)[\s/](\d+(\.?_?\d+)+)/i, ua);
    if (version) browser.version = version;
    return browser;
  }
}, {
  test: [/k-meleon/i],
  describe: function describe(ua) {
    var browser = {
      name: "K-Meleon"
    };
    var version = Utils.getFirstMatch(commonVersionIdentifier, ua) || Utils.getFirstMatch(/(?:k-meleon)[\s/](\d+(\.?_?\d+)+)/i, ua);
    if (version) browser.version = version;
    return browser;
  }
}, {
  test: [/micromessenger/i],
  describe: function describe(ua) {
    var browser = {
      name: "WeChat"
    };
    var version = Utils.getFirstMatch(/(?:micromessenger)[\s/](\d+(\.?_?\d+)+)/i, ua) || Utils.getFirstMatch(commonVersionIdentifier, ua);
    if (version) browser.version = version;
    return browser;
  }
}, {
  test: [/qqbrowser/i],
  describe: function describe(ua) {
    var browser = {
      name: /qqbrowserlite/i.test(ua) ? "QQ Browser Lite" : "QQ Browser"
    };
    var version = Utils.getFirstMatch(/(?:qqbrowserlite|qqbrowser)[/](\d+(\.?_?\d+)+)/i, ua) || Utils.getFirstMatch(commonVersionIdentifier, ua);
    if (version) browser.version = version;
    return browser;
  }
}, {
  test: [/msie|trident/i],
  describe: function describe(ua) {
    var browser = {
      name: "Internet Explorer"
    };
    var version = Utils.getFirstMatch(/(?:msie |rv:)(\d+(\.?_?\d+)+)/i, ua);
    if (version) browser.version = version;
    return browser;
  }
}, {
  test: [/\sedg\//i],
  describe: function describe(ua) {
    var browser = {
      name: "Microsoft Edge"
    };
    var version = Utils.getFirstMatch(/\sedg\/(\d+(\.?_?\d+)+)/i, ua);
    if (version) browser.version = version;
    return browser;
  }
}, {
  test: [/edg([ea]|ios)\//i],
  describe: function describe(ua) {
    var browser = {
      name: "Microsoft Edge"
    };
    var version = Utils.getSecondMatch(/edg([ea]|ios)\/(\d+(\.?_?\d+)+)/i, ua);
    if (version) browser.version = version;
    return browser;
  }
}, {
  test: function test(parser) {
    if (parser.hasBrand("Vivaldi")) return true;
    return parser.test(/vivaldi/i);
  },
  describe: function describe(ua, parser) {
    var browser = {
      name: "Vivaldi"
    };
    if (parser) {
      var hintsVersion = parser.getBrandVersion("Vivaldi");
      if (hintsVersion) {
        browser.version = hintsVersion;
        return browser;
      }
    }
    var version = Utils.getFirstMatch(/vivaldi\/(\d+(\.?_?\d+)+)/i, ua);
    if (version) browser.version = version;
    return browser;
  }
}, {
  test: [/seamonkey/i],
  describe: function describe(ua) {
    var browser = {
      name: "SeaMonkey"
    };
    var version = Utils.getFirstMatch(/seamonkey\/(\d+(\.?_?\d+)+)/i, ua);
    if (version) browser.version = version;
    return browser;
  }
}, {
  test: [/sailfish/i],
  describe: function describe(ua) {
    var browser = {
      name: "Sailfish"
    };
    var version = Utils.getFirstMatch(/sailfish\s?browser\/(\d+(\.\d+)?)/i, ua);
    if (version) browser.version = version;
    return browser;
  }
}, {
  test: [/silk/i],
  describe: function describe(ua) {
    var browser = {
      name: "Amazon Silk"
    };
    var version = Utils.getFirstMatch(/silk\/(\d+(\.?_?\d+)+)/i, ua);
    if (version) browser.version = version;
    return browser;
  }
}, {
  test: [/phantom/i],
  describe: function describe(ua) {
    var browser = {
      name: "PhantomJS"
    };
    var version = Utils.getFirstMatch(/phantomjs\/(\d+(\.?_?\d+)+)/i, ua);
    if (version) browser.version = version;
    return browser;
  }
}, {
  test: [/slimerjs/i],
  describe: function describe(ua) {
    var browser = {
      name: "SlimerJS"
    };
    var version = Utils.getFirstMatch(/slimerjs\/(\d+(\.?_?\d+)+)/i, ua);
    if (version) browser.version = version;
    return browser;
  }
}, {
  test: [/blackberry|\bbb\d+/i, /rim\stablet/i],
  describe: function describe(ua) {
    var browser = {
      name: "BlackBerry"
    };
    var version = Utils.getFirstMatch(commonVersionIdentifier, ua) || Utils.getFirstMatch(/blackberry[\d]+\/(\d+(\.?_?\d+)+)/i, ua);
    if (version) browser.version = version;
    return browser;
  }
}, {
  test: [/(web|hpw)[o0]s/i],
  describe: function describe(ua) {
    var browser = {
      name: "WebOS Browser"
    };
    var version = Utils.getFirstMatch(commonVersionIdentifier, ua) || Utils.getFirstMatch(/w(?:eb)?[o0]sbrowser\/(\d+(\.?_?\d+)+)/i, ua);
    if (version) browser.version = version;
    return browser;
  }
}, {
  test: [/bada/i],
  describe: function describe(ua) {
    var browser = {
      name: "Bada"
    };
    var version = Utils.getFirstMatch(/dolfin\/(\d+(\.?_?\d+)+)/i, ua);
    if (version) browser.version = version;
    return browser;
  }
}, {
  test: [/tizen/i],
  describe: function describe(ua) {
    var browser = {
      name: "Tizen"
    };
    var version = Utils.getFirstMatch(/(?:tizen\s?)?browser\/(\d+(\.?_?\d+)+)/i, ua) || Utils.getFirstMatch(commonVersionIdentifier, ua);
    if (version) browser.version = version;
    return browser;
  }
}, {
  test: [/qupzilla/i],
  describe: function describe(ua) {
    var browser = {
      name: "QupZilla"
    };
    var version = Utils.getFirstMatch(/(?:qupzilla)[\s/](\d+(\.?_?\d+)+)/i, ua) || Utils.getFirstMatch(commonVersionIdentifier, ua);
    if (version) browser.version = version;
    return browser;
  }
}, {
  test: [/librewolf/i],
  describe: function describe(ua) {
    var browser = {
      name: "LibreWolf"
    };
    var version = Utils.getFirstMatch(/(?:librewolf)[\s/](\d+(\.?_?\d+)+)/i, ua);
    if (version) browser.version = version;
    return browser;
  }
}, {
  test: [/firefox|iceweasel|fxios/i],
  describe: function describe(ua) {
    var browser = {
      name: "Firefox"
    };
    var version = Utils.getFirstMatch(/(?:firefox|iceweasel|fxios)[\s/](\d+(\.?_?\d+)+)/i, ua);
    if (version) browser.version = version;
    return browser;
  }
}, {
  test: [/electron/i],
  describe: function describe(ua) {
    var browser = {
      name: "Electron"
    };
    var version = Utils.getFirstMatch(/(?:electron)\/(\d+(\.?_?\d+)+)/i, ua);
    if (version) browser.version = version;
    return browser;
  }
}, {
  test: [/sogoumobilebrowser/i, /metasr/i, /se 2\.[x]/i],
  describe: function describe(ua) {
    var browser = {
      name: "Sogou Browser"
    };
    var sogouMobileVersion = Utils.getFirstMatch(/(?:sogoumobilebrowser)[\s/](\d+(\.?_?\d+)+)/i, ua);
    var chromiumVersion = Utils.getFirstMatch(/(?:chrome|crios|crmo)\/(\d+(\.?_?\d+)+)/i, ua);
    var seVersion = Utils.getFirstMatch(/se ([\d.]+)x/i, ua);
    var version = sogouMobileVersion || chromiumVersion || seVersion;
    if (version) browser.version = version;
    return browser;
  }
}, {
  test: [/MiuiBrowser/i],
  describe: function describe(ua) {
    var browser = {
      name: "Miui"
    };
    var version = Utils.getFirstMatch(/(?:MiuiBrowser)[\s/](\d+(\.?_?\d+)+)/i, ua);
    if (version) browser.version = version;
    return browser;
  }
}, {
  test: function test(parser) {
    if (parser.hasBrand("DuckDuckGo")) return true;
    return parser.test(/\sDdg\/[\d.]+$/i);
  },
  describe: function describe(ua, parser) {
    var browser = {
      name: "DuckDuckGo"
    };
    if (parser) {
      var hintsVersion = parser.getBrandVersion("DuckDuckGo");
      if (hintsVersion) {
        browser.version = hintsVersion;
        return browser;
      }
    }
    var uaVersion = Utils.getFirstMatch(/\sDdg\/([\d.]+)$/i, ua);
    if (uaVersion) browser.version = uaVersion;
    return browser;
  }
}, {
  test: function test(parser) {
    return parser.hasBrand("Brave");
  },
  describe: function describe(ua, parser) {
    var browser = {
      name: "Brave"
    };
    if (parser) {
      var hintsVersion = parser.getBrandVersion("Brave");
      if (hintsVersion) {
        browser.version = hintsVersion;
        return browser;
      }
    }
    return browser;
  }
}, {
  test: [/chromium/i],
  describe: function describe(ua) {
    var browser = {
      name: "Chromium"
    };
    var version = Utils.getFirstMatch(/(?:chromium)[\s/](\d+(\.?_?\d+)+)/i, ua) || Utils.getFirstMatch(commonVersionIdentifier, ua);
    if (version) browser.version = version;
    return browser;
  }
}, {
  test: [/ladybird/i],
  describe: function describe(ua) {
    var browser = {
      name: "Ladybird"
    };
    var version = Utils.getFirstMatch(/ladybird\/(\d+(\.?_?\d+)+)/i, ua);
    if (version) browser.version = version;
    return browser;
  }
}, {
  test: [/chrome|crios|crmo/i],
  describe: function describe(ua) {
    var browser = {
      name: "Chrome"
    };
    var version = Utils.getFirstMatch(/(?:chrome|crios|crmo)\/(\d+(\.?_?\d+)+)/i, ua);
    if (version) browser.version = version;
    return browser;
  }
}, {
  test: [/GSA/i],
  describe: function describe(ua) {
    var browser = {
      name: "Google Search"
    };
    var version = Utils.getFirstMatch(/(?:GSA)\/(\d+(\.?_?\d+)+)/i, ua);
    if (version) browser.version = version;
    return browser;
  }
}, {
  test: function test(parser) {
    var notLikeAndroid = !parser.test(/like android/i);
    var butAndroid = parser.test(/android/i);
    return notLikeAndroid && butAndroid;
  },
  describe: function describe(ua) {
    var browser = {
      name: "Android Browser"
    };
    var version = Utils.getFirstMatch(commonVersionIdentifier, ua);
    if (version) browser.version = version;
    return browser;
  }
}, {
  test: [/playstation 4/i],
  describe: function describe(ua) {
    var browser = {
      name: "PlayStation 4"
    };
    var version = Utils.getFirstMatch(commonVersionIdentifier, ua);
    if (version) browser.version = version;
    return browser;
  }
}, {
  test: [/safari|applewebkit/i],
  describe: function describe(ua) {
    var browser = {
      name: "Safari"
    };
    var version = Utils.getFirstMatch(commonVersionIdentifier, ua);
    if (version) browser.version = version;
    return browser;
  }
}, {
  test: [/.*/i],
  describe: function describe(ua) {
    var regexp = ua.search("\\(") !== -1 ? /^(.*)\/([^/]*)[ \t]\((.*)/ : /^(.*)\/([^/]*) /;
    return {
      name: Utils.getFirstMatch(regexp, ua),
      version: Utils.getSecondMatch(regexp, ua)
    };
  }
}];

//#endregion
//#region src/parser-os.js
var parser_os_default = [{
  test: [/Roku\/DVP/],
  describe: function describe(ua) {
    var version = Utils.getFirstMatch(/Roku\/DVP-(\d+\.\d+)/i, ua);
    return {
      name: OS_MAP.Roku,
      version: version
    };
  }
}, {
  test: [/windows phone/i],
  describe: function describe(ua) {
    var version = Utils.getFirstMatch(/windows phone (?:os)?\s?(\d+(\.\d+)*)/i, ua);
    return {
      name: OS_MAP.WindowsPhone,
      version: version
    };
  }
}, {
  test: [/windows /i],
  describe: function describe(ua) {
    var version = Utils.getFirstMatch(/Windows ((NT|XP)( \d\d?.\d)?)/i, ua);
    var versionName = Utils.getWindowsVersionName(version);
    return {
      name: OS_MAP.Windows,
      version: version,
      versionName: versionName
    };
  }
}, {
  test: function test(parser) {
    return Utils.isFirefoxOnIpad(parser.getUA());
  },
  describe: function describe(ua) {
    var result = {
      name: OS_MAP.iOS
    };
    var version = Utils.getSecondMatch(/(Version\/)(\d[\d.]+)/, ua);
    if (version) result.version = version;
    return result;
  }
}, {
  test: [/macintosh/i],
  describe: function describe(ua) {
    var version = Utils.getFirstMatch(/mac os x (\d+(\.?_?\d+)+)/i, ua).replace(/[_\s]/g, ".");
    var versionName = Utils.getMacOSVersionName(version);
    var os = {
      name: OS_MAP.MacOS,
      version: version
    };
    if (versionName) os.versionName = versionName;
    return os;
  }
}, {
  test: [/(ipod|iphone|ipad)/i],
  describe: function describe(ua) {
    var version = Utils.getFirstMatch(/os (\d+([_\s]\d+)*) like mac os x/i, ua).replace(/[_\s]/g, ".");
    return {
      name: OS_MAP.iOS,
      version: version
    };
  }
}, {
  test: [/OpenHarmony/i],
  describe: function describe(ua) {
    var version = Utils.getFirstMatch(/OpenHarmony\s+(\d+(\.\d+)*)/i, ua);
    return {
      name: OS_MAP.HarmonyOS,
      version: version
    };
  }
}, {
  test: function test(parser) {
    var notLikeAndroid = !parser.test(/like android/i);
    var butAndroid = parser.test(/android/i);
    return notLikeAndroid && butAndroid;
  },
  describe: function describe(ua) {
    var version = Utils.getFirstMatch(/android[\s/-](\d+(\.\d+)*)/i, ua);
    var versionName = Utils.getAndroidVersionName(version);
    var os = {
      name: OS_MAP.Android,
      version: version
    };
    if (versionName) os.versionName = versionName;
    return os;
  }
}, {
  test: [/(web|hpw)[o0]s/i],
  describe: function describe(ua) {
    var version = Utils.getFirstMatch(/(?:web|hpw)[o0]s\/(\d+(\.\d+)*)/i, ua);
    var os = {
      name: OS_MAP.WebOS
    };
    if (version && version.length) os.version = version;
    return os;
  }
}, {
  test: [/blackberry|\bbb\d+/i, /rim\stablet/i],
  describe: function describe(ua) {
    var version = Utils.getFirstMatch(/rim\stablet\sos\s(\d+(\.\d+)*)/i, ua) || Utils.getFirstMatch(/blackberry\d+\/(\d+([_\s]\d+)*)/i, ua) || Utils.getFirstMatch(/\bbb(\d+)/i, ua);
    return {
      name: OS_MAP.BlackBerry,
      version: version
    };
  }
}, {
  test: [/bada/i],
  describe: function describe(ua) {
    var version = Utils.getFirstMatch(/bada\/(\d+(\.\d+)*)/i, ua);
    return {
      name: OS_MAP.Bada,
      version: version
    };
  }
}, {
  test: [/tizen/i],
  describe: function describe(ua) {
    var version = Utils.getFirstMatch(/tizen[/\s](\d+(\.\d+)*)/i, ua);
    return {
      name: OS_MAP.Tizen,
      version: version
    };
  }
}, {
  test: [/linux/i],
  describe: function describe() {
    return {
      name: OS_MAP.Linux
    };
  }
}, {
  test: [/CrOS/],
  describe: function describe() {
    return {
      name: OS_MAP.ChromeOS
    };
  }
}, {
  test: [/PlayStation 4/],
  describe: function describe(ua) {
    var version = Utils.getFirstMatch(/PlayStation 4[/\s](\d+(\.\d+)*)/i, ua);
    return {
      name: OS_MAP.PlayStation4,
      version: version
    };
  }
}];

//#endregion
//#region src/parser-platforms.js
var parser_platforms_default = [{
  test: [/googlebot/i],
  describe: function describe() {
    return {
      type: PLATFORMS_MAP.bot,
      vendor: "Google"
    };
  }
}, {
  test: [/linespider/i],
  describe: function describe() {
    return {
      type: PLATFORMS_MAP.bot,
      vendor: "Line"
    };
  }
}, {
  test: [/amazonbot/i],
  describe: function describe() {
    return {
      type: PLATFORMS_MAP.bot,
      vendor: "Amazon"
    };
  }
}, {
  test: [/gptbot/i],
  describe: function describe() {
    return {
      type: PLATFORMS_MAP.bot,
      vendor: "OpenAI"
    };
  }
}, {
  test: [/chatgpt-user/i],
  describe: function describe() {
    return {
      type: PLATFORMS_MAP.bot,
      vendor: "OpenAI"
    };
  }
}, {
  test: [/oai-searchbot/i],
  describe: function describe() {
    return {
      type: PLATFORMS_MAP.bot,
      vendor: "OpenAI"
    };
  }
}, {
  test: [/baiduspider/i],
  describe: function describe() {
    return {
      type: PLATFORMS_MAP.bot,
      vendor: "Baidu"
    };
  }
}, {
  test: [/bingbot/i],
  describe: function describe() {
    return {
      type: PLATFORMS_MAP.bot,
      vendor: "Bing"
    };
  }
}, {
  test: [/duckduckbot/i],
  describe: function describe() {
    return {
      type: PLATFORMS_MAP.bot,
      vendor: "DuckDuckGo"
    };
  }
}, {
  test: [/claudebot/i, /claude-web/i, /claude-user/i, /claude-searchbot/i],
  describe: function describe() {
    return {
      type: PLATFORMS_MAP.bot,
      vendor: "Anthropic"
    };
  }
}, {
  test: [/omgilibot/i, /webzio-extended/i],
  describe: function describe() {
    return {
      type: PLATFORMS_MAP.bot,
      vendor: "Webz.io"
    };
  }
}, {
  test: [/diffbot/i],
  describe: function describe() {
    return {
      type: PLATFORMS_MAP.bot,
      vendor: "Diffbot"
    };
  }
}, {
  test: [/perplexitybot/i],
  describe: function describe() {
    return {
      type: PLATFORMS_MAP.bot,
      vendor: "Perplexity AI"
    };
  }
}, {
  test: [/perplexity-user/i],
  describe: function describe() {
    return {
      type: PLATFORMS_MAP.bot,
      vendor: "Perplexity AI"
    };
  }
}, {
  test: [/youbot/i],
  describe: function describe() {
    return {
      type: PLATFORMS_MAP.bot,
      vendor: "You.com"
    };
  }
}, {
  test: [/ia_archiver/i],
  describe: function describe() {
    return {
      type: PLATFORMS_MAP.bot,
      vendor: "Internet Archive"
    };
  }
}, {
  test: [/meta-webindexer/i],
  describe: function describe() {
    return {
      type: PLATFORMS_MAP.bot,
      vendor: "Meta"
    };
  }
}, {
  test: [/meta-externalads/i],
  describe: function describe() {
    return {
      type: PLATFORMS_MAP.bot,
      vendor: "Meta"
    };
  }
}, {
  test: [/meta-externalagent/i],
  describe: function describe() {
    return {
      type: PLATFORMS_MAP.bot,
      vendor: "Meta"
    };
  }
}, {
  test: [/meta-externalfetcher/i],
  describe: function describe() {
    return {
      type: PLATFORMS_MAP.bot,
      vendor: "Meta"
    };
  }
}, {
  test: [/facebookexternalhit/i, /facebookcatalog/i],
  describe: function describe() {
    return {
      type: PLATFORMS_MAP.bot,
      vendor: "Meta"
    };
  }
}, {
  test: [/slackbot/i, /slack-imgProxy/i],
  describe: function describe() {
    return {
      type: PLATFORMS_MAP.bot,
      vendor: "Slack"
    };
  }
}, {
  test: [/yahoo/i],
  describe: function describe() {
    return {
      type: PLATFORMS_MAP.bot,
      vendor: "Yahoo"
    };
  }
}, {
  test: [/yandexbot/i, /yandexmobilebot/i],
  describe: function describe() {
    return {
      type: PLATFORMS_MAP.bot,
      vendor: "Yandex"
    };
  }
}, {
  test: [/pingdom/i],
  describe: function describe() {
    return {
      type: PLATFORMS_MAP.bot,
      vendor: "Pingdom"
    };
  }
}, {
  test: [/huawei/i],
  describe: function describe(ua) {
    var model = Utils.getFirstMatch(/(can-l01)/i, ua) && "Nova";
    var platform = {
      type: PLATFORMS_MAP.mobile,
      vendor: "Huawei"
    };
    if (model) platform.model = model;
    return platform;
  }
}, {
  test: [/nexus\s*(?:7|8|9|10).*/i],
  describe: function describe() {
    return {
      type: PLATFORMS_MAP.tablet,
      vendor: "Nexus"
    };
  }
}, {
  test: [/ipad/i],
  describe: function describe() {
    return {
      type: PLATFORMS_MAP.tablet,
      vendor: "Apple",
      model: "iPad"
    };
  }
}, {
  test: function test(parser) {
    return Utils.isFirefoxOnIpad(parser.getUA());
  },
  describe: function describe() {
    return {
      type: PLATFORMS_MAP.tablet,
      vendor: "Apple",
      model: "iPad"
    };
  }
}, {
  test: [/kftt build/i],
  describe: function describe() {
    return {
      type: PLATFORMS_MAP.tablet,
      vendor: "Amazon",
      model: "Kindle Fire HD 7"
    };
  }
}, {
  test: [/silk/i],
  describe: function describe() {
    return {
      type: PLATFORMS_MAP.tablet,
      vendor: "Amazon"
    };
  }
}, {
  test: [/tablet(?! pc)/i],
  describe: function describe() {
    return {
      type: PLATFORMS_MAP.tablet
    };
  }
}, {
  test: function test(parser) {
    var iDevice = parser.test(/ipod|iphone/i);
    var likeIDevice = parser.test(/like (ipod|iphone)/i);
    return iDevice && !likeIDevice;
  },
  describe: function describe(ua) {
    var model = Utils.getFirstMatch(/(ipod|iphone)/i, ua);
    return {
      type: PLATFORMS_MAP.mobile,
      vendor: "Apple",
      model: model
    };
  }
}, {
  test: [/nexus\s*[0-6].*/i, /galaxy nexus/i],
  describe: function describe() {
    return {
      type: PLATFORMS_MAP.mobile,
      vendor: "Nexus"
    };
  }
}, {
  test: [/Nokia/i],
  describe: function describe(ua) {
    var model = Utils.getFirstMatch(/Nokia\s+([0-9]+(\.[0-9]+)?)/i, ua);
    var platform = {
      type: PLATFORMS_MAP.mobile,
      vendor: "Nokia"
    };
    if (model) platform.model = model;
    return platform;
  }
}, {
  test: [/[^-]mobi/i],
  describe: function describe() {
    return {
      type: PLATFORMS_MAP.mobile
    };
  }
}, {
  test: function test(parser) {
    return parser.getBrowserName(true) === "blackberry";
  },
  describe: function describe() {
    return {
      type: PLATFORMS_MAP.mobile,
      vendor: "BlackBerry"
    };
  }
}, {
  test: function test(parser) {
    return parser.getBrowserName(true) === "bada";
  },
  describe: function describe() {
    return {
      type: PLATFORMS_MAP.mobile
    };
  }
}, {
  test: function test(parser) {
    return parser.getBrowserName() === "windows phone";
  },
  describe: function describe() {
    return {
      type: PLATFORMS_MAP.mobile,
      vendor: "Microsoft"
    };
  }
}, {
  test: function test(parser) {
    var osMajorVersion = Number(String(parser.getOSVersion()).split(".")[0]);
    return parser.getOSName(true) === "android" && osMajorVersion >= 3;
  },
  describe: function describe() {
    return {
      type: PLATFORMS_MAP.tablet
    };
  }
}, {
  test: function test(parser) {
    return parser.getOSName(true) === "android";
  },
  describe: function describe() {
    return {
      type: PLATFORMS_MAP.mobile
    };
  }
}, {
  test: [/smart-?tv|smarttv/i],
  describe: function describe() {
    return {
      type: PLATFORMS_MAP.tv
    };
  }
}, {
  test: [/netcast/i],
  describe: function describe() {
    return {
      type: PLATFORMS_MAP.tv
    };
  }
}, {
  test: function test(parser) {
    return parser.getOSName(true) === "macos";
  },
  describe: function describe() {
    return {
      type: PLATFORMS_MAP.desktop,
      vendor: "Apple"
    };
  }
}, {
  test: function test(parser) {
    return parser.getOSName(true) === "windows";
  },
  describe: function describe() {
    return {
      type: PLATFORMS_MAP.desktop
    };
  }
}, {
  test: function test(parser) {
    return parser.getOSName(true) === "linux";
  },
  describe: function describe() {
    return {
      type: PLATFORMS_MAP.desktop
    };
  }
}, {
  test: function test(parser) {
    return parser.getOSName(true) === "playstation 4";
  },
  describe: function describe() {
    return {
      type: PLATFORMS_MAP.tv
    };
  }
}, {
  test: function test(parser) {
    return parser.getOSName(true) === "roku";
  },
  describe: function describe() {
    return {
      type: PLATFORMS_MAP.tv
    };
  }
}];

//#endregion
//#region src/parser-engines.js
var parser_engines_default = [{
  test: function test(parser) {
    return parser.getBrowserName(true) === "microsoft edge";
  },
  describe: function describe(ua) {
    if (/\sedg\//i.test(ua)) return {
      name: ENGINE_MAP.Blink
    };
    var version = Utils.getFirstMatch(/edge\/(\d+(\.?_?\d+)+)/i, ua);
    return {
      name: ENGINE_MAP.EdgeHTML,
      version: version
    };
  }
}, {
  test: function test(parser) {
    return parser.getBrowserName(true) === "ladybird";
  },
  describe: function describe() {
    return {
      name: ENGINE_MAP.LibWeb
    };
  }
}, {
  test: [/trident/i],
  describe: function describe(ua) {
    var engine = {
      name: ENGINE_MAP.Trident
    };
    var version = Utils.getFirstMatch(/trident\/(\d+(\.?_?\d+)+)/i, ua);
    if (version) engine.version = version;
    return engine;
  }
}, {
  test: function test(parser) {
    return parser.test(/presto/i);
  },
  describe: function describe(ua) {
    var engine = {
      name: ENGINE_MAP.Presto
    };
    var version = Utils.getFirstMatch(/presto\/(\d+(\.?_?\d+)+)/i, ua);
    if (version) engine.version = version;
    return engine;
  }
}, {
  test: function test(parser) {
    var isGecko = parser.test(/gecko/i);
    var likeGecko = parser.test(/like gecko/i);
    return isGecko && !likeGecko;
  },
  describe: function describe(ua) {
    var engine = {
      name: ENGINE_MAP.Gecko
    };
    var version = Utils.getFirstMatch(/gecko\/(\d+(\.?_?\d+)+)/i, ua);
    if (version) engine.version = version;
    return engine;
  }
}, {
  test: [/(apple)?webkit\/537\.36/i],
  describe: function describe() {
    return {
      name: ENGINE_MAP.Blink
    };
  }
}, {
  test: [/(apple)?webkit/i],
  describe: function describe(ua) {
    var engine = {
      name: ENGINE_MAP.WebKit
    };
    var version = Utils.getFirstMatch(/webkit\/(\d+(\.?_?\d+)+)/i, ua);
    if (version) engine.version = version;
    return engine;
  }
}];

//#endregion
//#region src/parser.js
/**
* @typedef {Object} ClientHints
* @property {Array<{brand: string, version: string}>} [brands] Array of brand objects
* @property {boolean} [mobile] Whether the device is mobile
* @property {string} [platform] Platform name (e.g., "Windows", "macOS")
* @property {string} [platformVersion] Platform version
* @property {string} [architecture] CPU architecture
* @property {string} [model] Device model
* @property {boolean} [wow64] Whether running under WoW64
*/
/**
* The main class that arranges the whole parsing process.
*/
var Parser = /*#__PURE__*/function () {
  /**
  * Create instance of Parser
  *
  * @param {String} UA User-Agent string
  * @param {Boolean|ClientHints} [skipParsingOrHints=false] Either a boolean to skip parsing,
  * or a ClientHints object containing User-Agent Client Hints data
  * @param {ClientHints} [clientHints] User-Agent Client Hints data (navigator.userAgentData)
  *
  * @throw {Error} in case of empty UA String
  *
  * @constructor
  */
  function Parser(UA, skipParsingOrHints, clientHints) {
    if (skipParsingOrHints === void 0) skipParsingOrHints = false;
    if (clientHints === void 0) clientHints = null;
    if (UA === void 0 || UA === null || UA === "") throw new Error("UserAgent parameter can't be empty");
    this._ua = UA;
    var skipParsing = false;
    if (typeof skipParsingOrHints === "boolean") {
      skipParsing = skipParsingOrHints;
      this._hints = clientHints;
    } else if (skipParsingOrHints != null && typeof skipParsingOrHints === "object") this._hints = skipParsingOrHints;else this._hints = null;
    /**
    * @typedef ParsedResult
    * @property {Object} browser
    * @property {String|undefined} [browser.name]
    * Browser name, like `"Chrome"` or `"Internet Explorer"`
    * @property {String|undefined} [browser.version] Browser version as a String `"12.01.45334.10"`
    * @property {Object} os
    * @property {String|undefined} [os.name] OS name, like `"Windows"` or `"macOS"`
    * @property {String|undefined} [os.version] OS version, like `"NT 5.1"` or `"10.11.1"`
    * @property {String|undefined} [os.versionName] OS name, like `"XP"` or `"High Sierra"`
    * @property {Object} platform
    * @property {String|undefined} [platform.type]
    * platform type, can be either `"desktop"`, `"tablet"` or `"mobile"`
    * @property {String|undefined} [platform.vendor] Vendor of the device,
    * like `"Apple"` or `"Samsung"`
    * @property {String|undefined} [platform.model] Device model,
    * like `"iPhone"` or `"Kindle Fire HD 7"`
    * @property {Object} engine
    * @property {String|undefined} [engine.name]
    * Can be any of this: `WebKit`, `Blink`, `Gecko`, `Trident`, `Presto`, `EdgeHTML`,
    * `LibWeb`
    * @property {String|undefined} [engine.version] String version of the engine
    */
    this.parsedResult = {};
    if (skipParsing !== true) this.parse();
  }
  /**
  * Get Client Hints data
  * @return {ClientHints|null}
  *
  * @public
  * @example
  * const parser = Bowser.getParser(UA, clientHints);
  * const hints = parser.getHints();
  * console.log(hints.platform); // 'Windows'
  * console.log(hints.mobile); // false
  */
  var _proto = Parser.prototype;
  _proto.getHints = function getHints() {
    return this._hints;
  };
  _proto.hasBrand = function hasBrand(brandName) {
    if (!this._hints || !Array.isArray(this._hints.brands)) return false;
    var brandLower = brandName.toLowerCase();
    return this._hints.brands.some(function (b) {
      return b.brand && b.brand.toLowerCase() === brandLower;
    });
  };
  _proto.getBrandVersion = function getBrandVersion(brandName) {
    if (!this._hints || !Array.isArray(this._hints.brands)) return;
    var brandLower = brandName.toLowerCase();
    var brand = Utils.find(this._hints.brands, function (b) {
      return b.brand && b.brand.toLowerCase() === brandLower;
    });
    return brand ? brand.version : void 0;
  };
  _proto.getUA = function getUA() {
    return this._ua;
  };
  _proto.test = function test(regex) {
    return regex.test(this._ua);
  };
  _proto.parseBrowser = function parseBrowser() {
    var _this = this;
    this.parsedResult.browser = {};
    var browserDescriptor = Utils.find(browsersList, function (_browser) {
      if (typeof _browser.test === "function") return _browser.test(_this);
      if (Array.isArray(_browser.test)) return _browser.test.some(function (condition) {
        return _this.test(condition);
      });
      throw new Error("Browser's test function is not valid");
    });
    if (browserDescriptor) this.parsedResult.browser = browserDescriptor.describe(this.getUA(), this);
    return this.parsedResult.browser;
  };
  _proto.getBrowser = function getBrowser() {
    if (this.parsedResult.browser) return this.parsedResult.browser;
    return this.parseBrowser();
  };
  _proto.getBrowserName = function getBrowserName(toLowerCase) {
    if (toLowerCase) return String(this.getBrowser().name).toLowerCase() || "";
    return this.getBrowser().name || "";
  };
  _proto.getBrowserVersion = function getBrowserVersion() {
    return this.getBrowser().version;
  };
  _proto.getOS = function getOS() {
    if (this.parsedResult.os) return this.parsedResult.os;
    return this.parseOS();
  };
  _proto.parseOS = function parseOS() {
    var _this2 = this;
    this.parsedResult.os = {};
    var os = Utils.find(parser_os_default, function (_os) {
      if (typeof _os.test === "function") return _os.test(_this2);
      if (Array.isArray(_os.test)) return _os.test.some(function (condition) {
        return _this2.test(condition);
      });
      throw new Error("Browser's test function is not valid");
    });
    if (os) this.parsedResult.os = os.describe(this.getUA());
    return this.parsedResult.os;
  };
  _proto.getOSName = function getOSName(toLowerCase) {
    var name = this.getOS().name;
    if (toLowerCase) return String(name).toLowerCase() || "";
    return name || "";
  };
  _proto.getOSVersion = function getOSVersion() {
    return this.getOS().version;
  };
  _proto.getPlatform = function getPlatform() {
    if (this.parsedResult.platform) return this.parsedResult.platform;
    return this.parsePlatform();
  };
  _proto.getPlatformType = function getPlatformType(toLowerCase) {
    if (toLowerCase === void 0) toLowerCase = false;
    var type = this.getPlatform().type;
    if (toLowerCase) return String(type).toLowerCase() || "";
    return type || "";
  };
  _proto.parsePlatform = function parsePlatform() {
    var _this3 = this;
    this.parsedResult.platform = {};
    var platform = Utils.find(parser_platforms_default, function (_platform) {
      if (typeof _platform.test === "function") return _platform.test(_this3);
      if (Array.isArray(_platform.test)) return _platform.test.some(function (condition) {
        return _this3.test(condition);
      });
      throw new Error("Browser's test function is not valid");
    });
    if (platform) this.parsedResult.platform = platform.describe(this.getUA());
    return this.parsedResult.platform;
  };
  _proto.getEngine = function getEngine() {
    if (this.parsedResult.engine) return this.parsedResult.engine;
    return this.parseEngine();
  };
  _proto.getEngineName = function getEngineName(toLowerCase) {
    if (toLowerCase) return String(this.getEngine().name).toLowerCase() || "";
    return this.getEngine().name || "";
  };
  _proto.parseEngine = function parseEngine() {
    var _this4 = this;
    this.parsedResult.engine = {};
    var engine = Utils.find(parser_engines_default, function (_engine) {
      if (typeof _engine.test === "function") return _engine.test(_this4);
      if (Array.isArray(_engine.test)) return _engine.test.some(function (condition) {
        return _this4.test(condition);
      });
      throw new Error("Browser's test function is not valid");
    });
    if (engine) this.parsedResult.engine = engine.describe(this.getUA());
    return this.parsedResult.engine;
  };
  _proto.parse = function parse() {
    this.parseBrowser();
    this.parseOS();
    this.parsePlatform();
    this.parseEngine();
    return this;
  };
  _proto.getResult = function getResult() {
    return Utils.assign({}, this.parsedResult);
  };
  _proto.satisfies = function satisfies(checkTree) {
    var _this5 = this;
    var platformsAndOSes = {};
    var platformsAndOSCounter = 0;
    var browsers = {};
    var browsersCounter = 0;
    Object.keys(checkTree).forEach(function (key) {
      var currentDefinition = checkTree[key];
      if (typeof currentDefinition === "string" || Array.isArray(currentDefinition)) {
        browsers[key] = currentDefinition;
        browsersCounter += 1;
      } else if (typeof currentDefinition === "object") {
        platformsAndOSes[key] = currentDefinition;
        platformsAndOSCounter += 1;
      }
    });
    if (platformsAndOSCounter > 0) {
      var platformsAndOSNames = Object.keys(platformsAndOSes);
      var OSMatchingDefinition = Utils.find(platformsAndOSNames, function (name) {
        return _this5.isOS(name);
      });
      if (OSMatchingDefinition) {
        var osResult = this.satisfies(platformsAndOSes[OSMatchingDefinition]);
        if (osResult !== void 0) return osResult;
      }
      var platformMatchingDefinition = Utils.find(platformsAndOSNames, function (name) {
        return _this5.isPlatform(name);
      });
      if (platformMatchingDefinition) {
        var platformResult = this.satisfies(platformsAndOSes[platformMatchingDefinition]);
        if (platformResult !== void 0) return platformResult;
      }
    }
    if (browsersCounter > 0) {
      var browserNames = Object.keys(browsers);
      var matchingDefinition = Utils.find(browserNames, function (name) {
        return _this5.isBrowser(name, true);
      });
      if (matchingDefinition !== void 0) return this.compareVersions(browsers[matchingDefinition]);
    }
  };
  _proto.isBrowser = function isBrowser(browserName, includingAlias) {
    if (includingAlias === void 0) includingAlias = false;
    var defaultBrowserName = this.getBrowserName().toLowerCase();
    var browserNameLower = browserName.toLowerCase();
    var alias = Utils.getBrowserTypeByAlias(browserNameLower);
    if (includingAlias && alias) browserNameLower = alias.toLowerCase();
    return browserNameLower === defaultBrowserName;
  };
  _proto.compareVersions = function compareVersions(versionsOrVersion) {
    var _this6 = this;
    if (typeof versionsOrVersion === "string") return this.compareVersion(versionsOrVersion);
    return versionsOrVersion.some(function (version) {
      return _this6.compareVersion(version);
    });
  };
  _proto.compareVersion = function compareVersion(version) {
    var expectedResults = [0];
    var comparableVersion = version;
    var isLoose = false;
    var currentBrowserVersion = this.getBrowserVersion();
    if (typeof currentBrowserVersion !== "string") return;
    if (version[0] === ">" || version[0] === "<") {
      comparableVersion = version.substr(1);
      if (version[1] === "=") {
        isLoose = true;
        comparableVersion = version.substr(2);
      } else expectedResults = [];
      if (version[0] === ">") expectedResults.push(1);else expectedResults.push(-1);
    } else if (version[0] === "=") comparableVersion = version.substr(1);else if (version[0] === "~") {
      isLoose = true;
      comparableVersion = version.substr(1);
    }
    return expectedResults.indexOf(Utils.compareVersions(currentBrowserVersion, comparableVersion, isLoose)) > -1;
  };
  _proto.isOS = function isOS(osName) {
    return this.getOSName(true) === String(osName).toLowerCase();
  };
  _proto.isPlatform = function isPlatform(platformType) {
    return this.getPlatformType(true) === String(platformType).toLowerCase();
  };
  _proto.isEngine = function isEngine(engineName) {
    return this.getEngineName(true) === String(engineName).toLowerCase();
  };
  _proto.is = function is(anything, includingAlias) {
    if (includingAlias === void 0) includingAlias = false;
    return this.isBrowser(anything, includingAlias) || this.isOS(anything) || this.isPlatform(anything);
  };
  _proto.some = function some(anythings) {
    var _this7 = this;
    if (anythings === void 0) anythings = [];
    return anythings.some(function (anything) {
      return _this7.is(anything);
    });
  };
  return Parser;
}();

//#endregion
//#region src/bowser.js
/*!
* Bowser - a browser detector
* https://github.com/bowser-js/bowser
* MIT License | (c) Dustin Diaz 2012-2015
* MIT License | (c) Denis Demchenko 2015-2026
*/
function _defineProperties(e, r) {
  for (var t = 0; t < r.length; t++) {
    var o = r[t];
    o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o);
  }
}
function _createClass(e, r, t) {
  return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", {
    writable: !1
  }), e;
}
function _toPropertyKey(t) {
  var i = _toPrimitive(t, "string");
  return "symbol" == typeof i ? i : i + "";
}
function _toPrimitive(t, r) {
  if ("object" != typeof t || !t) return t;
  var e = t[Symbol.toPrimitive];
  if (void 0 !== e) {
    var i = e.call(t, r || "default");
    if ("object" != typeof i) return i;
    throw new TypeError("@@toPrimitive must return a primitive value.");
  }
  return ("string" === r ? String : Number)(t);
}
/**
* Bowser class.
* Keep it simple as much as it can be.
* It's supposed to work with collections of {@link Parser} instances
* rather then solve one-instance problems.
* All the one-instance stuff is located in Parser class.
*
* @class
* @classdesc Bowser is a static object, that provides an API to the Parsers
* @hideconstructor
*/
var Bowser = /*#__PURE__*/function () {
  function Bowser() {}
  /**
  * Creates a {@link Parser} instance
  *
  * @param {String} UA UserAgent string
  * @param {Boolean|Object} [skipParsingOrHints=false] Either a boolean to skip parsing,
  * or a ClientHints object (navigator.userAgentData)
  * @param {Object} [clientHints] User-Agent Client Hints data (navigator.userAgentData)
  * @returns {Parser}
  * @throws {Error} when UA is not a String
  *
  * @example
  * const parser = Bowser.getParser(window.navigator.userAgent);
  * const result = parser.getResult();
  *
  * @example
  * // With User-Agent Client Hints
  * const parser = Bowser.getParser(
  *   window.navigator.userAgent,
  *   window.navigator.userAgentData
  * );
  */
  Bowser.getParser = function getParser(UA, skipParsingOrHints, clientHints) {
    if (skipParsingOrHints === void 0) skipParsingOrHints = false;
    if (clientHints === void 0) clientHints = null;
    if (typeof UA !== "string") throw new Error("UserAgent should be a string");
    return new Parser(UA, skipParsingOrHints, clientHints);
  };
  Bowser.parse = function parse(UA, clientHints) {
    if (clientHints === void 0) clientHints = null;
    return new Parser(UA, clientHints).getResult();
  };
  return _createClass(Bowser, null, [{
    key: "BROWSER_MAP",
    get: function get() {
      return BROWSER_MAP;
    }
  }, {
    key: "ENGINE_MAP",
    get: function get() {
      return ENGINE_MAP;
    }
  }, {
    key: "OS_MAP",
    get: function get() {
      return OS_MAP;
    }
  }, {
    key: "PLATFORMS_MAP",
    get: function get() {
      return PLATFORMS_MAP;
    }
  }]);
}();
var parse = Bowser.parse;
var getParser = Bowser.getParser;

//#endregion
export { BROWSER_MAP, ENGINE_MAP, OS_MAP, PLATFORMS_MAP, Bowser as default, getParser, parse };