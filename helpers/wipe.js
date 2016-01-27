var FS = require("q-io/fs");
var FSSync = require("fs");

var Captcha = require("../captchas");
var config = require("./config");
var Generator = require("../generators");
var Plugin = require("../plugins");
var Solver = require("../solvers");
var Tools = require("./tools");

var proxies = require("../proxies.json");
var files = FSSync.readdirSync(__dirname + "/../files").filter(function(fileName) {
    return ".gitignore" != fileName;
}).map(function(fileName) {
    fileName = __dirname + "/../files/" + fileName;
    var mimeType = Tools.mimeTypeSync(fileName);
    if (!mimeType)
        return null;
    return {
        fileName: fileName,
        mimeType: mimeType
    };
}).filter(function(file) {
    return file;
}).reduce(function(acc, file) {
    if (!acc.hasOwnProperty(file.mimeType))
        acc[file.mimeType] = [file.fileName];
    else
        acc[file.mimeType].push(file.fileName);
    return acc;
}, {});

var tasks = {};
var lastProxy = -1;
var proxySaveTimer = null;

var selectProxy = function() {
    var list = proxies.filter(function(proxy) {
        return !proxy.hasOwnProperty("failCount") || proxy.failCount < config("maxFailCount", 1);
    });
    if (list.length < 1)
        return null;
    return list[Math.floor(Math.random() * list.length)];
};

var scheduleProxySave = function() {
    if (proxySaveTimer)
        return;
    proxySaveTimer = setTimeout(function() {
        FS.write(__dirname + "/../proxies.json", JSON.stringify(proxies));
        proxySaveTimer = null;
    }, 5 * Tools.Second);
};

var selectFile = function(supportedFileTypes, usedFiles) {
    var list = supportedFileTypes.reduce(function(acc, type) {
        return acc.concat(files[type] || []);
    }, []);
    Tools.remove(list, usedFiles);
    if (list.length < 1)
        return null;
    return list[Math.floor(Math.random() * list.length)];
};

var doWipe = function(task) {
    if (!task || !task.started)
        return;
    var next = function() {
        setTimeout(function() {
            doWipe(task);
        }, task.period);
    };
    if (task.requestCount >= task.maxTotal)
        return stopTask(task.id);
    if (!task.hasOwnProperty(requestCount))
        task.requestCount = 0;
    if (task.requestCount >= task.maxSimultaneous)
        return next();
    var proxy = (proxies.length > 0) ? selectProxy() : null;
    var file = selectFile(task.plugin.supportedFileTypes(task), task.usedFiles);
    var score = function(ok) {
        var prop = ok ? "win" : "fail";
        if (!task.hasOwnProperty(prop))
            task[prop] = 0;
        task[prop] += 1;
    };
    if (task.plugin.mustAttachFile(task))
        task.usedFiles.push(file);
    if ("afterFinish" != task.waitingMode)
        next();
    task.requestCount += 1;
    task.plugin.getFormData(task, file, proxy).then(function(formData) {
        var o = {
            url: task.plugin.postUrl(task),
            formData: formData
        };
        if (proxy) {
            o.proxy = proxy.host + (proxy.port ? (":" + proxy.port) : "");
            if (proxy.login) {
                o.auth = { user: proxy.login };
                if (proxy.password)
                    o.auth.pass = proxy.password;
            }
        }
        return Tools.post(o);
    }).then(function(body) {
        task.requestCount -= 1;
        var proxyOk = task.plugin.checkProxy(body, task);
        if (!proxyOk) {
            if (!proxy.hasOwnProperty("failCount"))
                proxy.failCount = 0;
            proxy.failCount += 1;
            scheduleProxySave();
        }
        var ok = task.plugin.checkBody(body, task);
        if (!task.hasOwnProperty(ok ? "winCount" : "failCount"))
            task[ok ? "winCount" : "failCount"] = 0;
        task[ok ? "winCount" : "failCount"] += 1;
        score(ok);
        if ("afterFinish" == task.waitingMode)
            next();
    }).catch(function(err) {
        task.requestCount -= 1;
        console.error(err.stack || err);
        score(false);
        if ("afterFinish" == task.waitingMode)
            next();
    });
};

var startTask = function(id) {
    var task = tasks[id];
    if (!task)
        return Promise.reject("Invalid task");
    if (task.started)
        return Promise.reject("Task is already started");
    task.started = true;
    doWipe(task);
    return Promise.resolve(task);
};

var stopTask = function(id) {
    var task = tasks[id];
    if (!task)
        return Promise.reject("Invalid task");
    if (!task.started)
        return Promise.reject("Task is not started");
    task.started = false;
    return Promise.resolve(task);
};

module.exports.startTask = startTask;

module.exports.stopTask = stopTask;

module.exports.tasks = function() {
    return Tools.toArray(tasks);
};

module.exports.task = function(id) {
    return tasks[id];
};

module.exports.addTask = function(fields) {
    var id = fields.id;
    if (!id)
        return Promise.reject("Invalid ID");
    if (tasks.hasOwnProperty(id))
        return Promise.reject("A task with this ID already exists");
    var plugin = Plugin.plugin(fields.plugin);
    if (!plugin)
        return Promise.reject("Invalid plugin");
    var captcha = fields.captcha || null;
    if (captcha) {
        captcha = Captcha.captcha(captcha);
        if (!captcha)
            return Promise.reject("Invalid captcha");
    }
    var solver = fields.solver || null;
    if (captcha && !solver)
        return Promise.reject("No captcha solving service specified");
    if (solver) {
        solver = Solver.solver(solver);
        if (!solver)
            return Promise.reject("Invalid captcha solving service");
    }
    var generator = Generator.generator(fields.generator);
    if (!generator)
        return Promise.reject("Invalid text generator");
    if (!fields.board)
        return Promise.reject("Invalid board");
    var thread = +fields.thread;
    if (isNaN(thread) || thread < 0)
        return Promise.reject("Invalid thread");
    var period = +fields.period;
    if (isNaN(period) || period < 0)
        return Promise.reject("Invalid period");
    var maxSimultaneous = +fields.maxSimultaneous;
    if (isNaN(maxSimultaneous) || maxSimultaneous <= 0)
        return Promise.reject("Invalid maximum simultaneous request count");
    var maxTotal = +fields.maxTotal;
    if (isNaN(maxTotal) || maxTotal < 0)
        return Promise.reject("Invalid maximum total request count");
    var task = {
        id: id,
        plugin: plugin,
        board: fields.board,
        thread: thread,
        started: false,
        usedFiles: [],
        period: period,
        maxSimultaneous: maxSimultaneous,
        maxTotal: maxTotal,
        site: fields.site,
        sage: ("true" == fields.sage),
        captcha: captcha,
        solver: solver,
        generator: generator,
        generatorOptions: {
            text: !!fields.generateText,
            email: !!fields.generateEmail,
            name: !!fields.generateName,
            subject: !!fields.generateSubject
        },
        delayMode: fields.delayMode || "afterStart",
        fileAttachingMode: fields.fileAttachingMode || "default"
    };
    tasks[task.id] = task;
    if ("true" != fields.start)
        return Promise.resolve(task);
    return startTask(task.id);
};

module.exports.removeTask = function(id) {
    var task = tasks[id];
    if (!task)
        return Promise.reject("Invalid task");
    if (!task.started) {
        delete tasks[id];
        return Promise.resolve();
    }
    return stopTask(id).then(function() {
        delete tasks[id];
        return Promise.resolve();
    });
};
