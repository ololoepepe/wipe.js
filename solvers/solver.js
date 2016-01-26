var FS = require("q-io/fs");
var UUID = require("uuid");

var config = require("../helpers/config");
var Tools = require("../helpers/tools");

var defineSetting = function(o, name, def) {
    Object.defineProperty(o, name, {
        get: function() {
            return config("solver." + o.id + "." + name, config("solver." + name, def));
        },
        configurable: true
    });
};

var solvers = {};

var Solver = function(id, title, options) {
    Object.defineProperty(this, "id", {
        value: id,
        configurable: true
    });
    Object.defineProperty(this, "title", {
        value: title,
        configurable: true
    });
};

/*public*/ Solver.prototype.defineSetting = function(name, def) {
    return defineSetting(this, name, def);
};

/*public*/ Solver.prototype.solve = function(data) {
    var _this = this;
    var fileName = Tools.tmpPath() + "/captcha/" + UUID.v4();
    return FS.write(fileName, data).then(function() {
        return _this.solveImplementation(fileName);
    }).then(function(data) {
        FS.remove(fileName).catch(function(err) {
            console.error(err);
        });
        return Promise.resolve(data);
    }).catch(function(err) {
        FS.remove(fileName).catch(function(err) {
            console.error(err);
        });
        return Promise.reject(err);
    });
};

/*public*/ Solver.prototype.solveImplementation = function(fileName) {
    return Promise.resolve("");
};

Solver.solver = function(id) {
    return solvers[id];
};

Solver.addSolver = function(solver) {
    if (!Solver.prototype.isPrototypeOf(solver))
        return;
    solvers[solver.id] = solver;
};

Solver.solverIds = function() {
    return Tools.toArray(solvers).sort(function(p1, p2) {
        return (p1.id < p2.id) ? -1 : 1;
    }).map(function(solver) {
        return solver.id;
    });
};

module.exports = Solver;
