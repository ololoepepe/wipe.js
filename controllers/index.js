var express = require("express");
var FS = require("q-io/fs");

var controller = require("../helpers/controller");
var Tools = require("../helpers/tools");
var Wipe = require("../helpers/wipe");

var router = express.Router();

var mapTask = function(task) {
    return {
        id: task.id,
        plugin: {
            id: task.plugin.id,
            title: task.plugin.title
        },
        captcha: (task.captcha ? {
            id: task.captcha.id,
            title: task.captcha.title
        } : null),
        board: task.board,
        thread: task.thread,
        started: task.started
    };
};

router.post("/action/addTask", function(req, res) {
    Tools.parseForm(req).then(function(result) {
        return Wipe.addTask(result.fields);
    }).then(function(task) {
        res.send(mapTask(task));
    }).catch(function(err) {
        controller.error(res, err, true);
    });
});

router.post("/action/removeTask", function(req, res) {
    Tools.parseForm(req).then(function(result) {
        return Wipe.removeTask(result.fields.id);
    }).then(function() {
        res.send({});
    }).catch(function(err) {
        controller.error(res, err, true);
    });
});

router.post("/action/startTask", function(req, res) {
    Tools.parseForm(req).then(function(result) {
        return Wipe.startTask(result.fields.id);
    }).then(function(task) {
        res.send(mapTask(task));
    }).catch(function(err) {
        controller.error(res, err, true);
    });
});

router.post("/action/stopTask", function(req, res) {
    Tools.parseForm(req).then(function(result) {
        return Wipe.stopTask(result.fields.id);
    }).then(function(task) {
        res.send(mapTask(task));
    }).catch(function(err) {
        controller.error(res, err, true);
    });
});

router.get("/api/tasks.json", function(req, res) {
    res.json(Wipe.tasks().map(mapTask));
});

router.get("/misc/base.json", function(req, res) {
    var model = controller.baseModel(req);
    res.send(model);
});

router.get("/misc/partials.json", function(req, res) {
    FS.list(__dirname + "/../public/templates/partials").then(function(fileNames) {
        res.send(fileNames.map(function(fileName) {
            return fileName.split(".").shift();
        }));
    });
});

router.get("/", function(req, res) {
    controller("home", { title: "wipe.js" }).then(function(data) {
        res.send(data);
    }).catch(function(err) {
        controller.error(err);
    });
});

module.exports = router;
