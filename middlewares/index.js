var device = require("express-device");
var express = require("express");

module.exports = [
    express.static(__dirname + "/../public"),
    device.capture()
];
