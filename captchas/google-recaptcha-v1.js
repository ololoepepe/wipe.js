var FS = require("q-io/fs");
var FSSync = require("fs");
var HTTP = require("q-io/http");
var UUID = require("uuid");

var Captcha = require("./captcha");
var config = require("../helpers/config");
var Tools = require("../helpers/tools");

var captcha = new Captcha("google-recaptcha-v1", "Google reCAPTCHA v1 (old)");

captcha.solve = function(window, container) {
    var f = function() {
        var img = window.jQuery("#recaptcha_image > img", container)[0];
        if (img)
            return Promise.resolve(img);
        return new Promise(function(resolve, reject) {
            setTimeout(function() {
                f().then(resolve);
            }, 500);
        });
    };
    var key = config("captcha.google-recaptcha-v1.key");
    var fileName = Tools.tmpPath() + "/captcha/" + UUID.v4();
    return f().then(function(img) {
        return HTTP.request({
            method: "GET",
            url: img.src
        });
    }).then(function(response) {
        return response.body.read();
    }).then(function(data) {
        return FS.write(fileName, data);
    }).then(function() {
        return Tools.post({
            url: "http://2captcha.com/in.php",
            formData: {
                method: "post",
                key: key,
                file: FSSync.createReadStream(fileName)
            }
        });
    }).then(function(body) {
        FS.remove(fileName).catch(function(err) {
            console.error(err);
        });
        var match = (body || "").match(/^OK\|(.+$)/i);
        if (!match)
            return Promise.reject("Failed to upload captcha");
        var captchaId = match[1];
        var f = function() {
            return HTTP.request({
                method: "GET",
                url: `http://2captcha.com/res.php?key=${key}&action=get&id=${captchaId}`
            }).then(function(response) {
                return response.body.read();
            }).then(function(data) {
                data = data ? data.toString("utf8") : "";
                if ("CAPCHA_NOT_READY" == data) {
                    return new Promise(function(resolve, reject) {
                        setTimeout(function() {
                            f().then(resolve);
                        }, 2000);
                    });
                }
                var match = data.match(/^OK\|(.+$)/i);
                if (!match)
                    return Promise.reject("Failed to recognize captcha");
                return Promise.resolve(match[1]);
            });
        };
        return f();
    }).then(function(captchaResponse) {
        return Promise.resolve({
            recaptcha_challenge_field: window.jQuery("#recaptcha_challenge_field", container)[0].value,
            recaptcha_response_field: captchaResponse
        });
    });
};

module.exports = captcha;
