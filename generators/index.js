var FSSync = require("fs");
var Util = require("util");

var Generator = require("./generator");
var Tools = require("../helpers/tools");

FSSync.readdirSync(__dirname).forEach(function(file) {
    if ("index.js" == file || "js" != file.split(".").pop())
        return;
    var generator = require("./" + file.split(".").shift());
    if (Util.isArray(generator)) {
        generator.forEach(function(generator) {
            Generator.addGenerator(generator);
        });
    } else {
        Generator.addGenerator(generator);
    }
});

module.exports = Generator;
