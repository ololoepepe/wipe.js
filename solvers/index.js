var FSSync = require("fs");
var Util = require("util");

var Solver = require("./solver");
var Tools = require("../helpers/tools");

FSSync.readdirSync(__dirname).forEach(function(file) {
    if ("index.js" == file || "js" != file.split(".").pop())
        return;
    var solver = require("./" + file.split(".").shift());
    if (Util.isArray(solver)) {
        solver.forEach(function(solver) {
            Solver.addSolver(solver);
        });
    } else {
        Solver.addSolver(solver);
    }
});

module.exports = Solver;
