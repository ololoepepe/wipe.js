var FS = require("q-io/fs");
var FSSync = require("fs");
var HTTP = require("q-io/http");

var Solver = require("./solver");
var Tools = require("../helpers/tools");

var solver = new Solver("2captcha", "2Captcha");
solver.defineSetting("key", "");

solver.solveImplementation = function(fileName) {
    var key = this.key;
    if (!key)
        return Promise.reject("No key specified");
    return Tools.post({
        url: "http://2captcha.com/in.php",
        formData: {
            method: "post",
            key: key,
            file: FSSync.createReadStream(fileName)
        }
    }).then(function(body) {
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
    });
};

module.exports = solver;
