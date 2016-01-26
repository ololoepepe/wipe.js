var config = require("../helpers/config");
var Tools = require("../helpers/tools");

var defineSetting = function(o, name, def) {
    Object.defineProperty(o, name, {
        get: function() {
            return config("generator." + o.id + "." + name, config("generator." + name, def));
        },
        configurable: true
    });
};

var generators = {};

var Generator = function(id, title, options) {
    Object.defineProperty(this, "id", {
        value: id,
        configurable: true
    });
    Object.defineProperty(this, "title", {
        value: title,
        configurable: true
    });
};

/*public*/ Generator.prototype.defineSetting = function(name, def) {
    return defineSetting(this, name, def);
};

/*public*/ Generator.prototype.generate = function(task) {
    return Promise.resolve("");
};

Generator.generator = function(id) {
    return generators[id];
};

Generator.addGenerator = function(generator) {
    if (!Generator.prototype.isPrototypeOf(generator))
        return;
    generators[generator.id] = generator;
};

Generator.generatorIds = function() {
    return Tools.toArray(generators).sort(function(p1, p2) {
        return (p1.id < p2.id) ? -1 : 1;
    }).map(function(generator) {
        return generator.id;
    });
};

module.exports = Generator;
