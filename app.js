#!/usr/bin/env node

var express = require("express");

var config = require("./helpers/config");
var controller = require("./helpers/controller");

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
    console.error(err);
});
