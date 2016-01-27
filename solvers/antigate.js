var Antigate = require("agate");

var Solver = require("./solver");
var Tools = require("../helpers/tools");

var solver = new Solver("antigate", "Antigate");
solver.defineSetting("key", "");

solver.solveImplementation = function(fileName) {
    var key = this.key;
    if (!key)
        return Promise.reject("No key specified");
    var ag = new Antigate(key);
    return ag.recognizeFile(fileName);
};

module.exports = solver;
