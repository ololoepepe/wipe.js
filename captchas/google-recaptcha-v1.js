var FS = require("q-io/fs");
var FSSync = require("fs");
var HTTP = require("q-io/http");
var UUID = require("uuid");

var Captcha = require("./captcha");
var config = require("../helpers/config");
var Tools = require("../helpers/tools");

var captcha = new Captcha("google-recaptcha-v1", "Google reCAPTCHA v1 (old)");

captcha.getData = function(window, container) {
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
    return f().then(function(img) {
        return HTTP.request({
            method: "GET",
            url: img.src
        });
    }).then(function(response) {
        return response.body.read();
    });
};

captcha.getFields = function(data, window, container) {
    return Promise.resolve({
        recaptcha_challenge_field: window.jQuery("#recaptcha_challenge_field", container)[0].value,
        recaptcha_response_field: data
    });
};

module.exports = captcha;
