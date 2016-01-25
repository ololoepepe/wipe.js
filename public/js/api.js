if (typeof $ != "undefined") {
    $._ajax = $.ajax;
    $.ajax = function() {
        var _arguments = arguments;
        return new Promise(function(resolve, reject) {
            $._ajax.apply($, _arguments).then(function(data) {
                resolve(data);
            }).fail(function(err) {
                reject(err);
            });
        });
    };
}

/*wipe global object*/

var wipe = wipe || {};

/*Classes*/

/*constructor*/ wipe.PopupMessage = function(text, options) {
    this.hideTimer = null;
    this.text = text;
    this.timeout = (options && !isNaN(+options.timeout)) ? +options.timeout : 5 * 1000;
    this.classNames = (options && typeof options.classNames == "string") ? options.classNames : "";
    if (options && typeof options.type == "string" && wipe.in(["critical", "warning"], options.type.toLowerCase()))
        this.classNames += options.type.toLowerCase() + (("" != this.classNames) ? " " : "");
    this.html = (options && typeof options.type == "string" && options.type.toLowerCase() == "html");
    this.node = (options && typeof options.type == "string" && options.type.toLowerCase() == "node");
    this.msg = wipe.node("div");
    wipe.addClass(this.msg, "popup");
    wipe.addClass(this.msg, this.classNames);
    this.msg.onclick = this.hide.bind(this);
    if (wipe.popups.length > 0) {
        var prev = wipe.popups[wipe.popups.length - 1];
        this.msg.style.top = (prev.msg.offsetTop + prev.msg.offsetHeight + 5) + "px";
    }
    if (this.html)
        this.msg.innerHTML = text;
    else if (this.node)
        this.msg.appendChild(text);
    else
        this.msg.appendChild(wipe.node("text", text));
};

/*public*/ wipe.PopupMessage.prototype.show = function() {
    if (this.hideTimer)
        return;
    document.body.appendChild(this.msg);
    wipe.popups.push(this);
    this.hideTimer = setTimeout(this.hide.bind(this), this.timeout);
};

/*public*/ wipe.PopupMessage.prototype.hide = function() {
    if (!this.hideTimer)
        return;
    clearTimeout(this.hideTimer);
    this.hideTimer = null;
    var offsH = this.msg.offsetHeight + 5;
    document.body.removeChild(this.msg);
    var ind = wipe.popups.indexOf(this);
    if (ind < 0)
        return;
    wipe.popups.splice(ind, 1);
    for (var i = ind; i < wipe.popups.length; ++i) {
        var top = +wipe.popups[i].msg.style.top.replace("px", "");
        top -= offsH;
        wipe.popups[i].msg.style.top = top + "px";
    }
};

/*public*/ wipe.PopupMessage.prototype.resetTimeout = function(timeout) {
    if (!this.hideTimer)
        return;
    clearTimeout(this.hideTimer);
    this.timeout = (!isNaN(+timeout)) ? +timeout : 5 * 1000;
    this.hideTimer = setTimeout(this.hide.bind(this), this.timeout);
};

/*public*/ wipe.PopupMessage.prototype.resetText = function(text, options) {
    var offsH = this.msg.offsetHeight;
    this.text = text;
    this.classNames = (options && typeof options.classNames == "string") ? options.classNames : "";
    if (options && typeof options.type == "string" && wipe.in(["critical", "warning"], options.type.toLowerCase()))
        this.classNames += options.type.toLowerCase() + (("" != this.classNames) ? " " : "");
    this.html = (options && typeof options.type == "string" && options.type.toLowerCase() == "html");
    this.node = (options && typeof options.type == "string" && options.type.toLowerCase() == "node");
    this.msg.className = "";
    wipe.addClass(this.msg, "popup");
    wipe.addClass(this.msg, this.classNames);
    wipe.removeChildren(this.msg);
    if (this.html)
        this.msg.innerHTML = text;
    else if (this.node)
        this.msg.appendChild(text);
    else
        this.msg.appendChild(wipe.node("text", text));
    if (!this.hideTimer)
        return;
    var ind = wipe.popups.indexOf(this);
    if (ind < 0)
        return;
    offsH = this.msg.offsetHeight - offsH;
    for (var i = ind + 1; i < wipe.popups.length; ++i) {
        var top = +wipe.popups[i].msg.style.top.replace("px", "");
        top += offsH;
        wipe.popups[i].msg.style.top = top + "px";
    }
};

/*constructor*/ wipe.OverlayProgressBar = function(options) {
    this.visible = false;
    this.max = (options && +options.max >= 0) ? +options.max : 100;
    this.value = (options && +options.value <= this.max) ? +options.value : 0;
    this.mask = wipe.node("div");
    wipe.addClass(this.mask, "overlayMask");
    this.progressBar = wipe.node("progress");
    this.progressBar.max = this.max;
    this.progressBar.value = this.value;
    wipe.addClass(this.progressBar, "overlayProgressBar");
    var _this = this;
    var createCancelButton = function(callback) {
        _this.cancelButton = wipe.node("button");
        wipe.addClass(_this.cancelButton, "button overlayProgressBarCancelButton");
        _this.cancelButton.onclick = function() {
            _this.cancelButton.disabled = true;
            callback();
        };
        _this.cancelButton.appendChild(wipe.node("text", "Cancel"));
    };
    if (options && typeof options.cancelCallback == "function")
        createCancelButton(options.cancelCallback);
    else
        this.cancelButton = null;
    if (options && typeof options.finishCallback == "function") {
        this.finishCallback = options.finishCallback;
    } else {
        this.finishCallback = function() {
            _this.hide();
        };
    }
    if (options && options.xhr) {
        if (!this.cancelButton)
            createCancelButton(options.xhr.abort);
        options.xhr.upload.onprogress = function(e) {
            if (!e.lengthComputable)
                return;
            _this.max = e.total;
            _this.progressBar.max = _this.max;
            _this.progress(e.loaded);
        };
        options.xhr.upload.onload = function() {
            _this.max = 0;
            _this.value = 0;
            _this.progressBar.removeAttribute("max");
            _this.progressBar.removeAttribute("value");
        };
        options.xhr.onprogress = function(e) {
            if (!e.lengthComputable)
                return;
            _this.max = e.total;
            _this.progressBar.max = _this.max;
            _this.progress(e.loaded);
        };
        options.xhr.onload = function() {
            _this.max = 0;
            _this.value = 0;
            _this.progressBar.removeAttribute("max");
            _this.progressBar.removeAttribute("value");
            _this.finishCallback();
        };
    } else {
        this.finishOnMaxValue = true;
    }
};

/*public*/ wipe.OverlayProgressBar.prototype.progress = function(value) {
    value = +value;
    if (isNaN(value) || value < 0 || value > this.max)
        return;
    this.value = value;
    this.progressBar.value = this.value;
    if (this.finishOnMaxValue && this.value == this.max)
        this.finishCallback();
};

/*public*/ wipe.OverlayProgressBar.prototype.show = function() {
    if (this.visible)
        return;
    this.visible = true;
    document.body.appendChild(this.mask);
    document.body.appendChild(this.progressBar);
    if (this.cancelButton)
        document.body.appendChild(this.cancelButton);
};

/*public*/ wipe.OverlayProgressBar.prototype.showDelayed = function(delay) {
    var _this = this;
    this.mustShow = true;
    setTimeout(function() {
        if (!_this.mustShow)
            return;
        _this.show();
    }, delay || 0);
};

/*public*/ wipe.OverlayProgressBar.prototype.hide = function() {
    this.mustShow = false;
    this.mustHide = false;
    if (!this.visible)
        return;
    this.visible = false;
    if (this.cancelButton)
        document.body.removeChild(this.cancelButton);
    document.body.removeChild(this.progressBar);
    document.body.removeChild(this.mask);
};

/*public*/ wipe.OverlayProgressBar.prototype.hideDelayed = function(delay) {
    var _this = this;
    this.mustHide = true;
    setTimeout(function() {
        if (!_this.mustHide)
            return;
        _this.hide();
    }, delay || 0);
};

/*Constants*/

wipe.Second = 1000;
wipe.Minute = 60 * wipe.Second;
wipe.Hour = 60 * wipe.Minute;
wipe.Day = 24 * wipe.Hour;
wipe.Year = 365 * wipe.Day;
wipe.Billion = 2 * 1000 * 1000 * 1000;
wipe.SettingsStoredInCookies = ["deviceType", "time", "timeZoneOffset", "captchaEngine"];
//
wipe.keyboardMap = [
  "", // [0]
  "", // [1]
  "", // [2]
  "CANCEL", // [3]
  "", // [4]
  "", // [5]
  "HELP", // [6]
  "", // [7]
  "Backspace", // [8]
  "Tab", // [9]
  "", // [10]
  "", // [11]
  "CLEAR", // [12]
  "Enter", // [13]
  "ENTER_SPECIAL", // [14]
  "", // [15]
  "", // [16]
  "", // [17]
  "", // [18]
  "Pause", // [19]
  "CapsLock", // [20]
  "KANA", // [21]
  "EISU", // [22]
  "JUNJA", // [23]
  "FINAL", // [24]
  "HANJA", // [25]
  "", // [26]
  "Esc", // [27]
  "CONVERT", // [28]
  "NONCONVERT", // [29]
  "ACCEPT", // [30]
  "MODECHANGE", // [31]
  "Space", // [32]
  "PageUp", // [33]
  "PageDown", // [34]
  "End", // [35]
  "Home", // [36]
  "Left", // [37]
  "Up", // [38]
  "Right", // [39]
  "Down", // [40]
  "SELECT", // [41]
  "Print", // [42]
  "EXECUTE", // [43]
  "PrintScreen", // [44]
  "Insert", // [45]
  "Delete", // [46]
  "", // [47]
  "0", // [48]
  "1", // [49]
  "2", // [50]
  "3", // [51]
  "4", // [52]
  "5", // [53]
  "6", // [54]
  "7", // [55]
  "8", // [56]
  "9", // [57]
  ":", // [58]
  ";", // [59]
  "<", // [60]
  "=", // [61]
  ">", // [62]
  "?", // [63]
  "@", // [64]
  "A", // [65]
  "B", // [66]
  "C", // [67]
  "D", // [68]
  "E", // [69]
  "F", // [70]
  "G", // [71]
  "H", // [72]
  "I", // [73]
  "J", // [74]
  "K", // [75]
  "L", // [76]
  "M", // [77]
  "N", // [78]
  "O", // [79]
  "P", // [80]
  "Q", // [81]
  "R", // [82]
  "S", // [83]
  "T", // [84]
  "U", // [85]
  "V", // [86]
  "W", // [87]
  "X", // [88]
  "Y", // [89]
  "Z", // [90]
  "OS_KEY", // [91] Windows Key (Windows) or Command Key (Mac)
  "", // [92]
  "CONTEXT_MENU", // [93]
  "", // [94]
  "SLEEP", // [95]
  "Num0", // [96]
  "Num1", // [97]
  "Num2", // [98]
  "Num3", // [99]
  "Num4", // [100]
  "Num5", // [101]
  "Num6", // [102]
  "Num7", // [103]
  "Num8", // [104]
  "Num9", // [105]
  "*", // [106]
  "+", // [107]
  "SEPARATOR", // [108]
  "-", // [109]
  "/", // [110]
  "/", // [111]
  "F1", // [112]
  "F2", // [113]
  "F3", // [114]
  "F4", // [115]
  "F5", // [116]
  "F6", // [117]
  "F7", // [118]
  "F8", // [119]
  "F9", // [120]
  "F10", // [121]
  "F11", // [122]
  "F12", // [123]
  "F13", // [124]
  "F14", // [125]
  "F15", // [126]
  "F16", // [127]
  "F17", // [128]
  "F18", // [129]
  "F19", // [130]
  "F20", // [131]
  "F21", // [132]
  "F22", // [133]
  "F23", // [134]
  "F24", // [135]
  "", // [136]
  "", // [137]
  "", // [138]
  "", // [139]
  "", // [140]
  "", // [141]
  "", // [142]
  "", // [143]
  "NumLock", // [144]
  "ScrollLock", // [145]
  "WIN_OEM_FJ_JISHO", // [146]
  "WIN_OEM_FJ_MASSHOU", // [147]
  "WIN_OEM_FJ_TOUROKU", // [148]
  "WIN_OEM_FJ_LOYA", // [149]
  "WIN_OEM_FJ_ROYA", // [150]
  "", // [151]
  "", // [152]
  "", // [153]
  "", // [154]
  "", // [155]
  "", // [156]
  "", // [157]
  "", // [158]
  "", // [159]
  "CIRCUMFLEX", // [160]
  "EXCLAMATION", // [161]
  "\"", // [162]
  "#", // [163]
  "$", // [164]
  "%", // [165]
  "&", // [166]
  "_", // [167]
  "(", // [168]
  ")", // [169]
  "*", // [170]
  "+", // [171]
  "|", // [172]
  "-", // [173]
  "{", // [174]
  "}", // [175]
  "~", // [176]
  "", // [177]
  "", // [178]
  "", // [179]
  "", // [180]
  "VOLUME_MUTE", // [181]
  "VOLUME_DOWN", // [182]
  "VOLUME_UP", // [183]
  "", // [184]
  "", // [185]
  ";", // [186]
  "=", // [187]
  ",", // [188]
  "-", // [189]
  "PERIOD", // [190]
  "/", // [191]
  "`", // [192]
  "", // [193]
  "", // [194]
  "", // [195]
  "", // [196]
  "", // [197]
  "", // [198]
  "", // [199]
  "", // [200]
  "", // [201]
  "", // [202]
  "", // [203]
  "", // [204]
  "", // [205]
  "", // [206]
  "", // [207]
  "", // [208]
  "", // [209]
  "", // [210]
  "", // [211]
  "", // [212]
  "", // [213]
  "", // [214]
  "", // [215]
  "", // [216]
  "", // [217]
  "", // [218]
  "[", // [219]
  "\\", // [220]
  "]", // [221]
  "'", // [222]
  "", // [223]
  "", // [224]
  "ALTGR", // [225]
  "", // [226]
  "WIN_ICO_HELP", // [227]
  "WIN_ICO_00", // [228]
  "", // [229]
  "WIN_ICO_CLEAR", // [230]
  "", // [231]
  "", // [232]
  "WIN_OEM_RESET", // [233]
  "WIN_OEM_JUMP", // [234]
  "WIN_OEM_PA1", // [235]
  "WIN_OEM_PA2", // [236]
  "WIN_OEM_PA3", // [237]
  "WIN_OEM_WSCTRL", // [238]
  "WIN_OEM_CUSEL", // [239]
  "WIN_OEM_ATTN", // [240]
  "WIN_OEM_FINISH", // [241]
  "WIN_OEM_COPY", // [242]
  "WIN_OEM_AUTO", // [243]
  "WIN_OEM_ENLW", // [244]
  "WIN_OEM_BACKTAB", // [245]
  "ATTN", // [246]
  "CRSEL", // [247]
  "EXSEL", // [248]
  "EREOF", // [249]
  "PLAY", // [250]
  "ZOOM", // [251]
  "", // [252]
  "PA1", // [253]
  "WIN_OEM_CLEAR", // [254]
  "" // [255]
];

/*Variables*/

wipe.popups = [];
wipe.unloading = false;
wipe.leftChain = [];
wipe.rightChain = [];
wipe.models = {};
wipe.templates = {};

/*Functions*/

wipe.isAudioType = function(type) {
    return type in {"application/ogg": true, "audio/mpeg": true, "audio/ogg": true, "audio/wav": true};
};

wipe.isImageType = function(type) {
    return type in {"image/gif": true, "image/jpeg": true, "image/png": true};
};

wipe.isVideoType = function(type) {
    return type in {"video/mp4": true, "video/ogg": true, "video/webm": true};
};

wipe.getCookie = function(name, defValue) {
    var matches = document.cookie.match(
        new RegExp("(?:^|; )" + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + "=([^;]*)"));
    return matches ? decodeURIComponent(matches[1]) : defValue;
};

wipe.setCookie = function(name, value, options) {
    options = options || {};
    var expires = options.expires;
    if (typeof expires == "number" && expires) {
        var d = new Date();
        d.setTime(d.getTime() + expires * 1000);
        expires = options.expires = d;
    }
    if (expires && expires.toUTCString)
        options.expires = expires.toUTCString();
    value = encodeURIComponent(value);
    var updatedCookie = name + "=" + value;
    for (var propName in options) {
        updatedCookie += "; " + propName;
        var propValue = options[propName];
        if (propValue !== true)
            updatedCookie += "=" + propValue;
    }
    document.cookie = updatedCookie;
};

wipe.deleteCookie = function(name) {
    wipe.setCookie(name, "", {expires: -1});
};

wipe.getLocalObject = function(key, defValue) {
    if (!key || typeof key != "string")
        return null;
    try {
        var val = localStorage.getItem(key);
        return (null != val) ? JSON.parse(val) : defValue;
    } catch (ex) {
        return null;
    }
};

wipe.setLocalObject = function(key, value) {
    if (!key || typeof key != "string")
        return false;
    try {
        if (null != value && typeof value != "undefined")
            localStorage.setItem(key, JSON.stringify(value));
        else
            localStorage.setItem(key, null);
        return true;
    } catch (ex) {
        return false;
    }
};

wipe.removeLocalObject = function(key) {
    if (!key || typeof key != "string")
        return;
    try {
        return localStorage.removeItem(key);
    } catch (ex) {
        //
    }
};

wipe.in = function(arr, obj, strict) {
    if (!arr || !arr.length)
        return false;
    for (var i = 0; i < arr.length; ++i) {
        if ((strict && obj === arr[i]) || (!strict && obj == arr[i]))
            return true;
    }
    return false;
};

wipe.arr = function(obj) {
    var arr = [];
    if (!obj || !obj.length)
        return arr;
    for (var i = 0; i < obj.length; ++i)
        arr.push(obj[i]);
    return arr;
};

wipe.hasOwnProperties = function(obj) {
    if (!obj)
        return false;
    for (var x in obj) {
        if (obj.hasOwnProperty(x))
            return true;
    }
    return false;
};

wipe.forIn = function(obj, f) {
    if (!obj || typeof f != "function")
        return;
    for (var x in obj) {
        if (obj.hasOwnProperty(x))
            f(obj[x], x);
    }
};

wipe.mapIn = function(obj, f) {
    if (!obj || typeof f != "function")
        return;
    var arr = [];
    for (var x in obj) {
        if (obj.hasOwnProperty(x))
            arr.push(f(obj[x], x));
    }
    return arr;
};

wipe.filterIn = function(obj, f) {
    if (!obj || typeof f != "function")
        return;
    var nobj = {};
    for (var x in obj) {
        if (obj.hasOwnProperty(x)) {
            var item = obj[x];
            if (f(item, x))
                nobj[x] = item;
        }
    }
    return nobj;
};

wipe.toArray = function(obj) {
    var arr = [];
    var i = 0;
    for (var x in obj) {
        if (obj.hasOwnProperty(x)) {
            arr[i] = obj[x];
            ++i;
        }
    }
    return arr;
};

wipe.removeChildren = function(obj) {
    if (!obj || typeof obj.removeChild != "function")
        return;
    while (obj.firstChild)
        obj.removeChild(obj.firstChild);
};

wipe.last = function(arr) {
    if (!arr || !arr.length)
        return null;
    return arr[arr.length - 1];
};

wipe.equal = function(x, y) {
    var p;
    if (isNaN(x) && isNaN(y) && typeof x === "number" && typeof y === "number")
        return true;
    if (x === y)
        return true;
    if ((typeof x === "function" && typeof y === "function") ||
        (x instanceof Date && y instanceof Date) ||
        (x instanceof RegExp && y instanceof RegExp) ||
        (x instanceof String && y instanceof String) ||
        (x instanceof Number && y instanceof Number)) {
        return x.toString() === y.toString();
    }
    if (!(x instanceof Object && y instanceof Object))
        return false;
    if (x.isPrototypeOf(y) || y.isPrototypeOf(x))
        return false;
    if (x.constructor !== y.constructor)
        return false;
    if (x.prototype !== y.prototype)
        return false;
    if (wipe.leftChain.indexOf(x) > -1 || wipe.rightChain.indexOf(y) > -1)
         return false;
    for (p in y) {
        if (y.hasOwnProperty(p) !== x.hasOwnProperty(p))
            return false;
        else if (typeof y[p] !== typeof x[p])
            return false;
    }
    for (p in x) {
        if (y.hasOwnProperty(p) !== x.hasOwnProperty(p))
            return false;
        else if (typeof y[p] !== typeof x[p])
            return false;
        switch (typeof (x[p])) {
        case "object":
        case "function":
            wipe.leftChain.push(x);
            wipe.rightChain.push(y);
            if (!equal(x[p], y[p]))
                return false;
            wipe.leftChain.pop();
            wipe.rightChain.pop();
            break;
        default:
            if (x[p] !== y[p])
                return false;
            break;
        }
    }
    return true;
};

wipe.gently = function(obj, f, options) {
    if (!obj || typeof f != "function")
        return Promise.reject("invalidArgumentsErrorText");
    var delay = options ? +options.delay : undefined;
    var n = options ? +options.n : undefined;
    var promise = options && options.promise;
    if (isNaN(delay) || delay < 1)
        delay = 1;
    if (isNaN(n) || n < 1)
        n = 1;
    return new Promise(function(resolve, reject) {
        if (Array.isArray(obj)) {
            var arr = obj;
            var ind = 0;
            var g = function() {
                if (ind >= arr.length)
                    return resolve();
                if (promise) {
                    var i = ind;
                    var h = function() {
                        return f(arr[i], i).then(function() {
                            ++i;
                            if (i >= Math.min(ind + n, arr.length))
                                return Promise.resolve();
                            return h();
                        });
                    };
                    h().then(function() {
                        ind += n;
                        setTimeout(g, delay);
                    });
                } else {
                    for (var i = ind; i < Math.min(ind + n, arr.length); ++i)
                        f(arr[i], i);
                    ind += n;
                    setTimeout(g, delay);
                }
            };
            g();
        } else {
            var arr = [];
            for (var x in obj) {
                if (obj.hasOwnProperty(x)) {
                    arr.push({
                        "key": x,
                        "value": obj[x]
                    });
                }
            }
            var ind = 0;
            var g = function() {
                if (ind >= arr.length)
                    return resolve();
                if (promise) {
                    var i = ind;
                    var h = function() {
                        return f(arr[i].value, arr[i].key).then(function() {
                            ++i;
                            if (i >= Math.min(ind + n, arr.length))
                                return Promise.resolve();
                            return h();
                        });
                    };
                    h().then(function() {
                        ind += n;
                        setTimeout(g, delay);
                    });
                } else {
                    for (var i = ind; i < Math.min(ind + n, arr.length); ++i)
                        f(arr[i].value, arr[i].key);
                    ind += n;
                    setTimeout(g, delay);
                }
            };
            g();
        }
    });
};

wipe.regexp = function(s) {
    if (!s || typeof s != "string")
        return null;
    var m = s.match("/((\\\\/|[^/])+?)/(i(gm?|mg?)?|g(im?|mi?)?|m(ig?|gi?)?)?");
    if (!m)
        return null;
    return new RegExp(m[1], m[3]);
};

wipe.id = function(id) {
    if (typeof id != "string" && typeof id != "number")
        return null;
    return document.getElementById(id);
};

wipe.query = function(query, parent) {
    if (typeof query != "string")
        return null;
    if (!parent)
        parent = document;
    var elements = parent.querySelectorAll(query);
    var list = [];
    if (!elements)
        return list;
    for (var i = 0; i < elements.length; ++i)
        list.push(elements[i]);
    return list;
};

wipe.queryOne = function(query, parent) {
    if (typeof query != "string")
        return null;
    if (!parent)
        parent = document;
    return parent.querySelector(query);
};

wipe.name = function(name, parent) {
    return wipe.query("[name='" + name + "']", parent);
};

wipe.nameOne = function(name, parent) {
    return wipe.queryOne("[name='" + name + "']", parent);
};

wipe.contains = function(s, subs) {
    if (typeof s == "string" && typeof subs == "string")
        return s.replace(subs, "") != s;
    if (!s || !s.length || s.length < 1)
        return false;
    for (var i = 0; i < s.length; ++i) {
        if (wipe.equal(s[i], subs))
            return true;
    }
    return false;
};

wipe.addClass = function(element, classNames) {
    if (!element || !element.tagName || !classNames || typeof classNames != "string")
        return;
    wipe.arr(classNames.split(" ")).forEach(function(className) {
        if (!className)
            return;
        if (wipe.hasClass(element, className))
            return;
        if (element.className)
            element.className += " " + className;
        else
            element.className = className;
    });
};

wipe.hasClass = function(element, className) {
    if (!element || !element.tagName || !className || typeof className != "string")
        return false;
    return !!element.className.match(new RegExp("(^| )" + className + "( |$)"));
};

wipe.removeClass = function(element, classNames) {
    if (!element || !element.tagName || !classNames || typeof classNames != "string")
        return;
    wipe.arr(classNames.split(" ")).forEach(function(className) {
        if (!className)
            return;
        element.className = element.className.replace(new RegExp("(^| )" + className + "$"), "");
        element.className = element.className.replace(new RegExp("^" + className + "( |$)"), "");
        element.className = element.className.replace(new RegExp(" " + className + " "), " ");
    });
};

wipe.node = function(type, text) {
    if (typeof type != "string")
        return null;
    type = type.toUpperCase();
    return ("TEXT" == type) ? document.createTextNode(text ? text : "") : document.createElement(type);
};

wipe.toCenter = function(element, sizeHintX, sizeHintY, border) {
    var doc = document.documentElement;
    sizeHintX = +sizeHintX;
    sizeHintY = +sizeHintY;
    if (isNaN(sizeHintX) || sizeHintX <= 0)
        sizeHintX = +element.offsetWidth;
    if (isNaN(sizeHintY)  || sizeHintY <= 0)
        sizeHintY = +element.offsetHeight;
    borded = +border;
    if (!isNaN(border)) {
        sizeHintX += border * 2;
        sizeHintY += border * 2;
    }
    element.style.left = (doc.clientWidth / 2 - sizeHintX / 2) + "px";
    element.style.top = (doc.clientHeight / 2 - sizeHintY / 2) + "px";
};

wipe.reloadPage = function() {
    document.location.reload(true);
};

wipe.showPopup = function(text, options) {
    var popup = new wipe.PopupMessage(text, options);
    popup.show();
    return popup;
};

wipe.showNotification = function(title, body, icon) {
    if (!("Notification" in window))
        return;
    Notification.requestPermission(function(permission) {
        if (permission !== "granted")
            return;
        var notification = new Notification(title, {
            "body": body,
            "icon": icon
        });
    });
};

wipe.deviceType = function(expected) {
    var base = wipe.models.base;
    if (!base)
        return expected ? false : null;
    if (expected)
        return expected == base.deviceType;
    return base.deviceType;
};

wipe.showDialog = function(body, options) {
    return new Promise(function(resolve, reject) {
        var buttons = ((options && options.buttons) || ["cancel", "ok"]).map(function(button) {
            if ("ok" == button) {
                return {
                    text: "Confirm",
                    click: function() {
                        resolve(true);
                        $(this).dialog("close");
                    }
                };
            } else if ("cancel" == button) {
                return {
                    text: "Cancel",
                    click: function() {
                        $(this).dialog("close");
                    }
                };
            } else if ("close" == button) {
                return {
                    text: "Close",
                    click: function() {
                        $(this).dialog("close");
                    }
                };
            } else if (button && button.text && typeof button.action == "function") {
                return {
                    text: button.text,
                    click: function() {
                        var result = button.action();
                        if (typeof result != "boolean")
                            return;
                        resolve(result);
                        $(this).dialog("close");
                    }
                };
            } else {
                return null;
            }
        }).filter(function(button) {
            return button;
        });
        $(body).dialog({
            title: (options && options.title) || "",
            modal: true,
            buttons: buttons,
            closeText: "Close",
            width: "auto",
            maxHeight: $(window).height() - 20,
            maxWidth: $(window).width() - 40,
            close: function() {
                resolve(false);
                $(this).dialog("destroy").remove();
            },
            create: function() {
                $("body").css({ overflow: "hidden" });
                $(".navigationButton").css({ display: "none" });
            },
            open: (options ? options.afterShow : undefined),
            beforeClose: function() {
                $("body").css({ overflow: "inherit" });
                if (wipe.scrollHandler)
                    wipe.scrollHandler();
            }
        });
    });
};

wipe.isHashpass = function(s) {
    return !!s.match(/([0-9a-fA-F]{8}\-){4}[0-9a-fA-F]{8}/g);
};

wipe.generateImageHash = function(imageData, sizeX, sizeY) {
    sizeX = +sizeX;
    sizeY = +sizeY;
    if (!imageData || isNaN(sizeX) || isNaN(sizeY))
        return null;
    var buf = new Uint8Array(imageData);
    var oldw = sizeX;
    var oldh = sizeY;
    var size = oldw * oldh;
    for (var i = 0, j = 0; i < size; i++, j += 4)
        buf[i] = buf[j] * 0.3 + buf[j + 1] * 0.59 + buf[j + 2] * 0.11;
    var newh = 8;
    var neww = 8;
    var levels = 3;
    var areas = 256 / levels;
    var values = 256 / (levels - 1);
    var hash = 0;
    for (var i = 0; i < newh; i++) {
        for (var j = 0; j < neww; j++) {
            var tmp = i / (newh - 1) * (oldh - 1);
            var l = Math.min(tmp | 0, oldh - 2);
            var u = tmp - l;
            tmp = j / (neww - 1) * (oldw - 1);
            var c = Math.min(tmp | 0, oldw - 2);
            var t = tmp - c;
            var first = buf[l * oldw + c] * ((1 - t) * (1 - u));
            first += buf[l * oldw + c + 1] * (t * (1 - u));
            first += buf[(l + 1) * oldw + c + 1] * (t * u);
            first += buf[(l + 1) * oldw + c] * ((1 - t) * u);
            first /= areas;
            first = values * (first | 0);
            hash = (hash << 4) + Math.min(first, 255);
            var g = hash & 4026531840;
            if (g)
                hash ^= g >>> 24;
            hash &= ~g;
        }
    }
    return hash;
};

wipe.getPlainText = function(node) {
    if (!node)
        return "";
    function normalize(a) {
        if (!a)
            return "";
        a = a.replace(/ +/g, " ").replace(/[\t]+/gm, "").replace(/[ ]+$/gm, "").replace(/^[ ]+/gm, "");
        a = a.replace(/\n+/g, "\n").replace(/\n+$/, "").replace(/^\n+/, "").replace(/\nNEWLINE\n/g, "\n\n");
        return a.replace(/NEWLINE\n/g, "\n\n");
    }
    function removeWhiteSpace(node) {
        var isWhite = function(node) {
            return !(/[^\t\n\r ]/.test(node.nodeValue));
        };
        var ws = [];
        var findWhite = function(node) {
            for(var i = 0; i < node.childNodes.length; i++) {
                var n = node.childNodes[i];
                if (n.nodeType == 3 && isWhite(n))
                    ws.push(n);
                else if (n.hasChildNodes())
                    findWhite(n);
            }
        };
        findWhite(node);
        for(var i = 0; i < ws.length; i++)
            ws[i].parentNode.removeChild(ws[i]);
    }
    function sty(n, prop) {
        if (n.style[prop])
            return n.style[prop];
        var s = n.currentStyle || n.ownerDocument.defaultView.getComputedStyle(n, null);
        if (n.tagName == "SCRIPT")
            return "none";
        if(!s[prop])
            return ("LI,P,TR".indexOf(n.tagName) > -1) ? "block" : n.style[prop];
        if (s[prop] =="block" && n.tagName=="TD")
            return "feaux-inline";
        return s[prop];
    }
    var blockTypeNodes = "table-row,block,list-item";
    function isBlock(n) {
        var s = sty(n, "display") || "feaux-inline";
        if (blockTypeNodes.indexOf(s) > -1)
            return true;
        return false;
    }
    function recurse(n) {
        if (/pre/.test(sty(n, "whiteSpace"))) {
            t += n.innerHTML.replace(/\t/g, " ").replace(/\n/g, " ");
            return "";
        }
        var s = sty(n, "display");
        if (s == "none")
            return "";
        var gap = isBlock(n) ? "\n" : " ";
        t += gap;
        for (var i = 0; i < n.childNodes.length; i++) {
            var c = n.childNodes[i];
            if (c.nodeType == 3)
                t += c.nodeValue;
            if (c.childNodes.length)
                recurse(c);
        }
        t += gap;
        return t;
    }
    node = node.cloneNode(true);
    node.innerHTML = node.innerHTML.replace(/<br>/g, "\n");
    var paras = node.getElementsByTagName("p");
    for (var i = 0; i < paras.length; i++)
        paras[i].innerHTML += "NEWLINE";
    var t = "";
    removeWhiteSpace(node);
    return normalize(recurse(node));
};

wipe.activateTab = function(a) {
    if (!a)
        return;
    var tabIndex = +wipe.data("index", a.parentNode);
    if (isNaN(tabIndex))
        return;
    var tab = a.parentNode;
    var header = tab.parentNode;
    var widget = wipe.queryOne("div", header.parentNode);
    var page = wipe.queryOne("[data-index='" + tabIndex + "']", widget);
    wipe.arr(widget.childNodes).forEach(function(node) {
        if (node.nodeType != 1) //Element
            return;
        node.style.display = ((node == page) ? "block" : "none");
    });
    wipe.query("ul > li", header.parentNode).forEach(function(node) {
        wipe.removeClass(node, "activated");
    });
    wipe.addClass(tab, "activated");
};

wipe.notificationsEnabled = function() {
    return wipe.getLocalObject("showAutoUpdateDesktopNotifications", true);
};

wipe.soundEnabled = function() {
    return wipe.getLocalObject("playAutoUpdateSound", false);
};

wipe.playSound = function() {
    if (!wipe.sound) {
        wipe.sound = wipe.node("audio");
        var source = wipe.node("source");
        source.type = "audio/ogg";
        source.src = "/" + wipe.data("sitePathPrefix") + "audio/signal.ogg";
        wipe.sound.volume = wipe.getLocalObject("soundNotificationsVolume", 100) / 100;
        wipe.sound.appendChild(source);
    }
    wipe.sound.play();
};

wipe.nearlyEqual = function(a, b, epsilon) {
    var absA = Math.abs(a);
    var absB = Math.abs(b);
    var diff = Math.abs(a - b);
    if (a == b) {
        return true;
    } else if (a == 0 || b == 0 || diff < Number.MIN_VALUE) {
        return diff < (epsilon * Number.MIN_VALUE);
    } else {
        return diff / (absA + absB) < epsilon;
    }
};

wipe.hash = function(hash) {
    if (typeof hash == "undefined")
        return window.location.hash.substr(1, window.location.hash.length - 1);
    hash = "" + hash;
    if (!hash && !wipe.hash())
        return;
    window.location.hash = "";
    window.location.hash = hash;
};

wipe.data = function(key, el, bubble) {
    el = el || document.body;
    while (el && el.dataset) {
        if (key in el.dataset)
            return el.dataset[key];
        el = bubble ? el.parentNode : undefined;
    }
    return undefined;
};

wipe.scriptWorkaround = function(parent) {
    if (!parent)
        parent = document;
    wipe.query("script", parent).forEach(function(script) {
        var nscript = wipe.node("script");
        nscript.type = script.type;
        if (script.src)
            nscript.src = script.src;
        else if (script.innerHTML)
            nscript.innerHTML = script.innerHTML;
        script.parentNode.replaceChild(nscript, script);
    });
};

wipe.template = function(templateName, model, noparse) {
    var template = wipe.templates[templateName];
    if (!template)
        return null;
    if (!model)
        return template;
    var html = template(model);
    if (noparse)
        return html;
    var nodes = $.parseHTML(html, document, true);
    var node;
    for (var i = 0; i < nodes.length; ++i) {
        if (1 == nodes[i].nodeType) {
            node = nodes[i];
            break;
        }
    }
    if (!node)
        return null;
    wipe.scriptWorkaround(node);
    return node;
};

wipe.createDocumentFragment = function(html) {
    var temp = document.createElement("div");
    temp.innerHTML = html;
    if (typeof document.createDocumentFragment != "function")
        return Promise.resolve(temp);
    var frag = document.createDocumentFragment();
    return new Promise(function(resolve) {
        var f = function() {
            if (!temp.firstChild)
                return resolve(frag);
            frag.appendChild(temp.firstChild);
            setTimeout(f, 0);
        };
        f();
    });
};

wipe.createStylesheetLink = function(href, prefix) {
    var link = wipe.node("link");
    link.type = "text/css";
    link.rel = "stylesheet";
    link.href = (prefix ? ("/" + wipe.models.base.site.pathPrefix + "css/") : "") + href;
    wipe.queryOne("head").appendChild(link);
    return link;
};

wipe.createScript = function(src, prefix) {
    var script = wipe.node("script");
    script.type = "text/javascript";
    script.src = (prefix ? ("/" + wipe.models.base.site.pathPrefix + "js/") : "") + src;
    wipe.queryOne("head").appendChild(script);
    return script;
};

wipe.compareRegisteredUserLevels = function(l1, l2) {
    if (!l1)
        l1 = null;
    if (!l2)
        l2 = null;
    if (["ADMIN", "MODER", "USER", null].indexOf(l2) < 0)
        throw "Invalid registered user level l2: " + l2;
    switch (l1) {
    case "ADMIN":
        return (l1 == l2) ? 0 : 1;
    case "MODER":
        if (l1 == l2)
            return 0;
        return ("ADMIN" == l2) ? -1 : 1;
    case "USER":
        if (l1 == l2)
            return 0;
        return (null == l2) ? 1 : -1;
    case null:
        return (l1 == l2) ? 0 : -1;
    default:
        throw "Invalid reistered user level l1: " + l1;
    }
};

wipe.escaped = function(text) {
    return $("<div />").text(text).html();
};

wipe.model = function(modelName, mustMerge) {
    if (Array.isArray(modelName)) {
        var models = modelName.map(function(modelName) {
            return wipe.model(modelName);
        });
        if (!mustMerge)
            return models;
        var model = (models.length > 0) ? merge.clone(models[0]) : {};
        models.slice(1).forEach(function(m) {
            model = merge.recursive(model, m);
        })
        return model;
    } else {
        var match = modelName.match(/^board\/(\S+)$/);
        if (match) {
            var boards = wipe.models["boards"].boards;
            for (var i = 0; i < boards.length; ++i) {
                if (match[1] == boards[i].name)
                    return { board: boards[i] };
            }
            return wipe.models["boards"].boards[match[1]];
        }
        return wipe.models[modelName];
    }
};

wipe.get = function(what) {
    var xhr = new XMLHttpRequest();
    xhr.open("get", "/" + wipeData.site.pathPrefix + what, false);
    xhr.send(null);
    if (xhr.status === 200)
        return xhr.responseText;
    return null;
};

wipe.api = function(entity, parameters, prefix) {
    prefix = prefix || "api";
    var query = "";
    wipe.forIn(parameters, function(val, key) {
        if (!Array.isArray(val))
            val = [val];
        val.forEach(function(val) {
            if (query)
                query += "&";
            query += (key + "=" + val);
        });
    });
    query = (query ? "?" : "") + query;
    return new Promise(function(resolve, reject) {
        $.ajax({
            url: "/" + wipe.data("sitePathPrefix") + prefix + "/" + entity + ".json" + query,
            dataType: "json",
            cache: wipe.getLocalObject("apiRequestCachingEnabled", false)
        }).then(function(result) {
            if (wipe.checkError(result))
                reject(result);
            resolve(result);
        }).catch(function(err) {
            reject(err);
        });
    });
};

wipe.post = function(action, formData, progressBarContext, progressBarOptions) {
    var parameters = {
        type: "POST",
        data: formData,
        processData: false,
        contentType: false
    };
    if (typeof progressBarContext == "object") {
        parameters.xhr = function() {
            var xhr = new XMLHttpRequest();
            if (progressBarOptions && progressBarOptions.uploadProgress)
                xhr.upload.onprogress = progressBarOptions.uploadProgress;
            progressBarContext.progressBar = new wipe.OverlayProgressBar({ xhr: xhr });
            if (progressBarOptions && progressBarOptions.delay)
                progressBarContext.progressBar.showDelayed(progressBarOptions.delay);
            else
                progressBarContext.progressBar.show();
            return xhr;
        }
    }
    return $.ajax(action, parameters).then(function(result) {
        if (wipe.checkError(result))
            return Promise.reject(result);
        return Promise.resolve(result);
    });
};

wipe.now = function() {
    return new Date();
};

wipe.settings = function() {
    return {
        deviceType: wipe.getCookie("deviceType", "auto"),
        time: wipe.getCookie("time", "server"),
        timeZoneOffset: wipe.getCookie("timeZoneOffset", -wipe.now().getTimezoneOffset()),
        captchaEngine: { id: wipe.getCookie("captchaEngine", "google-recaptcha") },
        style: { name: wipe.getLocalObject("style", "photon") },
        codeStyle: { name: wipe.getLocalObject("codeStyle", "default") },
        shrinkPosts: wipe.getLocalObject("shrinkPosts", true),
        markupMode: wipe.getLocalObject("markupMode", "EXTENDED_WAKABA_MARK,BB_CODE"),
        stickyToolbar: wipe.getLocalObject("stickyToolbar", true),
        maxAllowedRating: wipe.getLocalObject("maxAllowedRating", "R-18G"),
        hidePostformRules: wipe.getLocalObject("hidePostformRules", false),
        minimalisticPostform: wipe.getLocalObject("minimalisticPostform", wipe.deviceType("mobile")),
        hiddenBoards: wipe.getLocalObject("hiddenBoards", []),
        autoUpdateThreadsByDefault: wipe.getLocalObject("autoUpdateThreadsByDefault", false),
        autoUpdateInterval: wipe.getLocalObject("autoUpdateInterval", 15),
        showAutoUpdateDesktopNotifications: wipe.getLocalObject("showAutoUpdateDesktopNotifications", true),
        playAutoUpdateSound: wipe.getLocalObject("playAutoUpdateSound", false),
        soundNotificationsVolume: wipe.getLocalObject("soundNotificationsVolume", 100),
        signOpPostLinks: wipe.getLocalObject("signOpPostLinks", true),
        signOwnPostLinks: wipe.getLocalObject("signOwnPostLinks", true),
        showLeafButtons: wipe.getLocalObject("showLeafButtons", true),
        leafThroughImagesOnly: wipe.getLocalObject("leafThroughImagesOnly", false),
        imageZoomSensitivity: wipe.getLocalObject("imageZoomSensitivity", 25),
        defaultAudioVideoVolume: wipe.getLocalObject("defaultAudioVideoVolume", 100),
        rememberAudioVideoVolume: wipe.getLocalObject("rememberAudioVideoVolume", true),
        playAudioVideoImmediately: wipe.getLocalObject("playAudioVideoImmediately", true),
        loopAudioVideo: wipe.getLocalObject("loopAudioVideo", true),
        quickReplyAction: wipe.getLocalObject("quickReplyAction", "goto_thread"),
        moveToPostOnReplyInThread: wipe.getLocalObject("moveToPostOnReplyInThread", false),
        checkFileExistence: wipe.getLocalObject("checkFileExistence", true),
        showAttachedFilePreview: wipe.getLocalObject("showAttachedFilePreview", true),
        addToFavoritesOnReply: wipe.getLocalObject("addToFavoritesOnReply", false),
        stripExifFromJpeg: wipe.getLocalObject("stripExifFromJpeg", true),
        hideTripcodes: wipe.getLocalObject("hideTripcodes", false),
        hideUserNames: wipe.getLocalObject("hideUserNames", false),
        strikeOutHiddenPostLinks: wipe.getLocalObject("strikeOutHiddenPostLinks", true),
        spellsEnabled: wipe.getLocalObject("spellsEnabled", true),
        showNewPosts: wipe.getLocalObject("showNewPosts", true),
        hotkeysEnabled: wipe.getLocalObject("hotkeysEnabled", true),
        userCssEnabled: wipe.getLocalObject("userCssEnabled", true),
        userJavaScriptEnabled: wipe.getLocalObject("userJavaScriptEnabled", true),
        sourceHighlightingEnabled: wipe.getLocalObject("sourceHighlightingEnabled", false),
        chatEnabled: wipe.getLocalObject("chatEnabled", true),
        closeFilesByClickingOnly: wipe.getLocalObject("closeFilesByClickingOnly", false),
        viewPostPreviewDelay: wipe.getLocalObject("viewPostPreviewDelay", 200),
        apiRequestCachingEnabled: wipe.getLocalObject("apiRequestCachingEnabled", false),
        bannersMode: wipe.getLocalObject("bannersMode", "random")
    };
};

wipe.setSettings = function(model) {
    if (!model)
        return;
    wipe.forIn(model, function(val, key) {
        if (wipe.SettingsStoredInCookies.indexOf(key) >= 0) {
            wipe.setCookie(key, val, {
                "expires": wipe.Billion,
                "path": "/"
            });
        } else {
            wipe.setLocalObject(key, val);
        }
    });
};

wipe.checkError = function(result) {
    return (["object", "number", "boolean"].indexOf(typeof result) < 0)
        || (result && (result.errorMessage || result.ban));
};

wipe.handleError = function(error) {
    console.log(error);
    if (wipe.unloading)
        return;
    var text;
    if (error) {
        if (error.errorMessage) {
            text = error.errorMessage;
            if (error.errorDescription)
                text += ": " + error.errorDescription;
        } else if (error.hasOwnProperty("readyState")) {
            switch (error.status) {
            case 400:
            case 404:
            case 408:
            case 413:
            case 429: //DDoS
            case 500:
            case 502:
            case 503:
            case 504:
            case 520: //CloudFlare
            case 521: //CloudFlare
            case 522: //CloudFlare
            case 523: //CloudFlare
            case 524: //CloudFlare
            case 525: //CloudFlare
            case 526: //CloudFlare
            text = "error" + error.status + "Text" + " (" + error.status + ")";
                break;
            default:
                if (0 == error.readyState)
                    text = "error0Text";
                break;
            }
        } else {
            text = error;
        }
    } else {
        text = "Unknown error";
    }
    wipe.showPopup(text, {type: "critical"});
};

wipe.toMap = function(arr, keyGenerator) {
    var map = {};
    arr.forEach(function(item) {
        map[keyGenerator(item)] = item;
    });
    return map;
};

wipe.readAs = function(blob, method) {
    switch (method) {
    case "ArrayBuffer":
    case "BinaryString":
    case "DataURL":
    case "Text":
        break;
    default:
        method = "ArrayBuffer";
        break;
    }
    var binaryReader = new FileReader();
    return new Promise(function(resolve, reject) {
        binaryReader.onload = function(e) {
            resolve(e.target.result);
        };
        binaryReader.onerror = function(e) {
            reject(e.getMessage());
        };
        binaryReader["readAs" + method](blob);
    });
};
