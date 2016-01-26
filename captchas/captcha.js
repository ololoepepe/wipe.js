var config = require("../helpers/config");
var Tools = require("../helpers/tools");

var defineSetting = function(o, name, def) {
    Object.defineProperty(o, name, {
        get: function() {
            return config("captcha." + o.id + "." + name, config("captcha." + name, def));
        },
        configurable: true
    });
};

var captchas = {};

var Captcha = function(id, title, options) {
    Object.defineProperty(this, "id", {
        value: id,
        configurable: true
    });
    Object.defineProperty(this, "title", {
        value: title,
        configurable: true
    });
};

/*public*/ Captcha.prototype.defineSetting = function(name, def) {
    return defineSetting(this, name, def);
};

/*public*/ Captcha.prototype.getData = function(window, container) {
    return Promise.resolve(null);
};

/*public*/ Captcha.prototype.getFields = function(data, window, container) {
    return Promise.resolve({});
};

/*public*/ Captcha.prototype.getUrl = function() {
    return "";
};

Captcha.captcha = function(id) {
    return captchas[id];
};

Captcha.addCaptcha = function(captcha) {
    if (!Captcha.prototype.isPrototypeOf(captcha))
        return;
    captchas[captcha.id] = captcha;
};

Captcha.captchaIds = function() {
    return Tools.toArray(captchas).sort(function(p1, p2) {
        return (p1.id < p2.id) ? -1 : 1;
    }).map(function(captcha) {
        return captcha.id;
    });
};

module.exports = Captcha;
