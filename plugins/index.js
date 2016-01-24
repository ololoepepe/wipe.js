var FSSync = require("fs");
var Util = require("util");

var Plugin = require("./plugin");
var Tools = require("../helpers/tools");

FSSync.readdirSync(__dirname).forEach(function(file) {
    if ("index.js" == file || "js" != file.split(".").pop())
        return;
    var plugin = require("./" + file.split(".").shift());
    if (Util.isArray(plugin)) {
        plugin.forEach(function(plugin) {
            Plugin.addPlugin(plugin);
        });
    } else {
        Plugin.addPlugin(plugin);
    }
});

module.exports = Plugin;
