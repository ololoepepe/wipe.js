var UUID = require("uuid");

var Generator = require("./generator");

var generator = new Generator("uuid", "UUID");

generator.generate = function(task) {
    return UUID.v4();
};

module.exports = generator;
