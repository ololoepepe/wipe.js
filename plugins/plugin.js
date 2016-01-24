var FS = require("q-io/fs");
var FSSync = require("fs");
var Path = require("path");
var promisify = require("promisify-node");
var Util = require("util");

var config = require("../helpers/config");
var Tools = require("../helpers/tools");

var defineSetting = function(o, name, def) {
    Object.defineProperty(o, name, {
        get: function() {
            return config("plugin." + o.id + "." + name, config("plugin." + name, def));
        },
        configurable: true
    });
};

var plugins = {};

var Plugin = function(id, title, options) {
    Object.defineProperty(this, "id", {
        value: id,
        configurable: true
    });
    Object.defineProperty(this, "title", {
        value: title,
        configurable: true
    });
};

/*public*/ Plugin.prototype.defineSetting = function(name, def) {
    return defineSetting(this, name, def);
};

/*public*/ Plugin.prototype.supportedFileTypes = function(task) {
    return ["image/jpeg", "image/png", "image/gif"];
};

/*public*/ Plugin.prototype.mustAttachFile = function(task) {
    return task.thread > 0;
};

/*public*/ Plugin.prototype.getFormData = function(task, file) {
    return {};
};

/*public*/ Plugin.prototype.getUrl = function(task) {
    return "";
};

/*public*/ Plugin.prototype.checkProxy = function(body, task) {
    return false;
};

/*public*/ Plugin.prototype.checkBody = function(body, task) {
    return false;
};

Plugin.plugin = function(id) {
    return plugins[id];
};

Plugin.addPlugin = function(plugin) {
    if (!Plugin.prototype.isPrototypeOf(plugin))
        return;
    plugins[plugin.id] = plugin;
};

Plugin.pluginIds = function() {
    return Tools.toArray(plugins).sort(function(p1, p2) {
        return (p1.name < p2.name) ? -1 : 1;
    }).map(function(plugin) {
        return plugin.id;
    });
};

module.exports = Plugin;
