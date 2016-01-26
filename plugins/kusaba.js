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

plugin.captchaContainerQuery = function(task) {
    return "#postform";
};

plugin.formFieldNames = function(task) {
    return {
        board: "board",
        thread: "replythread",
        text: "message",
        subject: "subject",
        email: "em",
        file: "imagefile"
    };
};

plugin.getUrl = function(task) {
    var url = getSite(task) + task.board;
    if (task.thread)
        url += `/res/${task.thread}.html`;
    return url;
};

plugin.postUrl = function(task) {
    return `${getSite(task)}board.php`;
};

plugin.checkProxy = function(body, task) {
    return true;
};

plugin.checkBody = function(body, task) {
    return !/error/gi.test(body);
};

module.exports = plugin;
