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

/*Variables*/

wipe.popups = [];
wipe.unloading = false;
wipe.leftChain = [];
wipe.rightChain = [];
wipe.models = {};
wipe.templates = {};

/*Functions*/

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
            text = "Error " + error.status;
                break;
            default:
                if (0 == error.readyState)
                    text = "No connection with server";
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
