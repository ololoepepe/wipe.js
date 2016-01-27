var Tesseract = require("node-tesseract");

var Solver = require("./solver");
var Tools = require("../helpers/tools");

var solver = new Solver("tesseract", "Tesseract OCR");

solver.solveImplementation = function(fileName) {
    return Tesseract.process(fileName);
};

module.exports = solver;
