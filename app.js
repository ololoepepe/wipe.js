#!/usr/bin/env node

var express = require("express");
var Log4JS = require("log4js");

var config = require("./helpers/config");
var controller = require("./helpers/controller");
var Global = require("./helpers/global");
var Tools = require("./helpers/tools");

var appenders = [];
var logTargets = config("log.targets", ["console", "file"]);
if (logTargets.indexOf("console") >= 0)
    appenders.push({ type: "console" });
if (logTargets.indexOf("console") >= 0) {
    appenders.push({
        type: "file",
        filename: __dirname + "/logs/ololord.log",
        maxLogSize: config("log.maxSize", 1048576),
        backups: config("log.backups", 100)
    });
}
Log4JS.configure({ appenders: appenders });
Global.logger = Log4JS.getLogger();
["trace", "debug", "info", "warn", "error", "fatal"].forEach(function(name) {
    Global[name] = function() {
        return Global.logger[name].apply(Global.logger, arguments);
    };
});

console.log("[" + process.pid + "] Initializing...");

var app = express();

app.use(require("./middlewares"));
app.use(require("./controllers"));
app.use("*", function(req, res) {
    controller.notFound(res);
});

controller.initialize().then(function() {
    app.listen(config("server.port", 8080), function() {
        console.log("[" + process.pid + "] Listening on port " + config("server.port", 8080) + "...");
        var commands = require("./helpers/commands");
        var rl = commands();
    });
}).catch(function(err) {
    Global.error(err);
});
