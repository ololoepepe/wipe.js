var FSSync = require("fs");
var UUID = require("uuid");

var Captcha = require("../captchas");
var config = require("../helpers/config");
var Plugin = require("./plugin");
var Tools = require("../helpers/tools");

var plugin = new Plugin("kusaba", "Kusaba");

var getSite = function(task) {
    var site = task.site;
    if (!/https?\:\/\//.test(site))
        site = "http://" + site;
    if ("/" != site[site.length - 1])
        site += "/";
    return site;
};

plugin.supportedFileTypes = function(task) {
    return ["image/jpeg", "image/png", "image/gif"];
};

plugin.mustAttachFile = function(task) {
    return 0 == task.thread;
};

plugin.getFormData = function(task, file) {
    var o = {
        board: task.board,
        replythread: task.thread,
        message: UUID.v4()
    };
    if (task.sage)
        o.em = "sage";
    if (this.mustAttachFile(task))
        o.imagefile = FSSync.createReadStream(file);
    if (!task.captcha)
        return Promise.resolve(o);
    var url = getSite(task) + task.board;
    if (task.thread)
        url += `/res/${task.thread}.html`;
    return Tools.getPageDom(url).then(function(window) {
        return task.captcha.solve(window, window.jQuery("#postform")[0]);
    }).then(function(solved) {
        Tools.forIn(solved, function(val, key) {
            o[key] = val;
        });
        return Promise.resolve(o);
    });
};

plugin.getUrl = function(task) {
    return `${getSite(task)}board.php`;
};

plugin.checkProxy = function(body, task) {
    return true;
};

plugin.checkBody = function(body, task) {
    return !/error/gi.test(body);
};

module.exports = plugin;
