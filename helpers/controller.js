var dot = require("dot");
var FS = require("q-io/fs");
var merge = require("merge");
var Util = require("util");

var Captcha = require("../captchas");
var config = require("./config");
var Generator = require("../generators");
var Plugin = require("../plugins");
var Solver = require("../solvers");

var partials = {};
var templates = {};
var publicPartials;
var publicTemplates;

var controller = function(templateName, modelData) {
    var baseModelData = controller.baseModel();
    baseModelData.publicPartials = publicPartials;
    baseModelData.publicTemplates = publicTemplates;
    baseModelData.models = {
        base: JSON.stringify(controller.baseModel()),
        partials: JSON.stringify(publicPartials.map(function(partial) {
            return partial.name
        })),
        templates: JSON.stringify(publicTemplates.map(function(partial) {
            return partial.name
        }))
    };
    if (!modelData)
        modelData = {};
    var template = templates[templateName];
    if (!template)
        return Promise.reject("Invalid template");
    modelData = merge.recursive(baseModelData, modelData);
    return Promise.resolve(template(modelData));
};

controller.error = function(res, error, ajax) {
    if (!ajax && Util.isNumber(error) && 404 == error)
        return controller.notFound(res);
    var model = {};
    if (Util.isError(error)) {
        model.errorMessage = "Internal error";
        model.errorDescription = error.message;
    } else if (Util.isObject(error) && error.error) {
        model.errorMessage = error.description ? error.error : "Error";
        model.errorDescription = error.description || error.error;
    } else {
        model.errorMessage = "Error";
        model.errorDescription = (error && Util.isString(error)) ? error
            : ((404 == error) ? "404 (not found)" : "Unknown error");
    }
    if (ajax)
        res.send(model);
    else
        res.send(model.errorMessage + ": " + model.errorDescription);
    return Promise.resolve();
};

controller.notFound = function(res) {
    res.status(404).send("Page not found");
    return Promise.resolve();
};

controller.baseModel = function(req) {
    return {
        site: {
            protocol: config("site.protocol", "http"),
            domain: config("site.domain", "localhost:8080"),
            pathPrefix: config("site.pathPrefix", "")
        },
        deviceType: ((req && req.device.type == "desktop") ? "desktop" : "mobile"),
        plugins: Plugin.pluginIds().map(function(id) {
            var plugin = Plugin.plugin(id);
            return {
                id: id,
                title: plugin.title
            };
        }),
        captchas: Captcha.captchaIds().map(function(id) {
            var captcha = Captcha.captcha(id);
            return {
                id: id,
                title: captcha.title
            };
        }),
        solvers: Solver.solverIds().map(function(id) {
            var solver = Solver.solver(id);
            return {
                id: id,
                title: solver.title
            };
        }),
        generators: Generator.generatorIds().map(function(id) {
            var generator = Generator.generator(id);
            return {
                id: id,
                title: generator.title
            };
        })
    };
};

controller.initialize = function() {
    var path1 = __dirname + "/../views/partials";
    var path2 = __dirname + "/../public/templates/partials";
    var c = {};
    return FS.list(path1).then(function(fileNames) {
        c.fileNames = fileNames.map(function(fileName) {
            return path1 + "/" + fileName;
        });
        return FS.list(path2);
    }).then(function(fileNames) {
        publicPartials = fileNames.filter(function(fileName) {
            return fileName.split(".").pop() == "jst";
        }).map(function(fileName) {
            return fileName.split(".").shift();
        });
        c.fileNames = c.fileNames.concat(fileNames.map(function(fileName) {
            return path2 + "/" + fileName;
        })).filter(function(fileName) {
            return fileName.split(".").pop() == "jst";
        });
        var promises = c.fileNames.map(function(fileName) {
            FS.read(fileName).then(function(data) {
                var name = fileName.split("/").pop().split(".").shift();
                var ind = publicPartials.indexOf(name);
                if (ind >= 0) {
                    publicPartials[ind] = {
                        name: name,
                        data: data
                    };
                }
                partials[name] = data;
                return Promise.resolve();
            });
        });
        return Promise.all(promises);
    }).then(function() {
        path1 = __dirname + "/../views";
        path2 = __dirname + "/../public/templates";
        return FS.list(path1).then(function(fileNames) {
            c.fileNames = fileNames.map(function(fileName) {
                return path1 + "/" + fileName;
            });
            return FS.list(path2);
        });
    }).then(function(fileNames) {
        publicTemplates = fileNames.filter(function(fileName) {
            return fileName.split(".").pop() == "jst";
        }).map(function(fileName) {
            return fileName.split(".").shift();
        });
        c.fileNames = c.fileNames.concat(fileNames.map(function(fileName) {
            return path2 + "/" + fileName;
        })).filter(function(fileName) {
            return fileName.split(".").pop() == "jst";
        });
        var promises = c.fileNames.map(function(fileName) {
            FS.read(fileName).then(function(data) {
                var name = fileName.split("/").pop().split(".").shift();
                var ind = publicTemplates.indexOf(name);
                if (ind >= 0) {
                    publicTemplates[ind] = {
                        name: name,
                        data: data
                    };
                }
                templates[name] = dot.template(data, {
                    evaluate: /\{\{([\s\S]+?)\}\}/g,
                    interpolate: /\{\{=([\s\S]+?)\}\}/g,
                    encode: /\{\{!([\s\S]+?)\}\}/g,
                    use: /\{\{#([\s\S]+?)\}\}/g,
                    define: /\{\{##\s*([\w\.$]+)\s*(\:|=)([\s\S]+?)#\}\}/g,
                    conditional: /\{\{\?(\?)?\s*([\s\S]*?)\s*\}\}/g,
                    iterate: /\{\{~\s*(?:\}\}|([\s\S]+?)\s*\:\s*([\w$]+)\s*(?:\:\s*([\w$]+))?\s*\}\})/g,
                    varname: 'it',
                    strip: false,
                    append: true,
                    selfcontained: false
                }, partials);
                return Promise.resolve();
            });
        });
        return Promise.all(promises);
    });
};

module.exports = controller;

var config = require("./config");
var Tools = require("./tools");
