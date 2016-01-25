var FSSync = require("fs");

var Captcha = require("../captchas");
var config = require("./config");
var Plugin = require("../plugins");
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

var selectProxy = function() {
    var list = proxies.filter(function(proxy) {
        return !proxy.hasOwnProperty("failCount") || proxy.failCount < config("maxFailCount", 1);
    });
    if (list.length < 1)
        return null;
    return list[Math.floor(Math.random() * list.length)];
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
    var proxy = (proxies.length > 0) ? selectProxy() : null;
    var file = selectFile(task.plugin.supportedFileTypes(task), task.usedFiles);
    var next = function(ok) {
        var prop = ok ? "win" : "fail";
        if (!task.hasOwnProperty(prop))
            task[prop] = 0;
        task[prop] += 1;
        setTimeout(function() {
            doWipe(task);
        }, task.period);
    };
    if (task.plugin.mustAttachFile(task))
        task.usedFiles.push(file);
    task.plugin.getFormData(task, file).then(function(formData) {
        var o = {
            url: task.plugin.getUrl(task),
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
        var proxyOk = task.plugin.checkProxy(body, task);
        if (!proxyOk) {
            if (!proxy.hasOwnProperty("failCount"))
                proxy.failCount = 0;
            proxy.failCount += 1;
        }
        next(task.plugin.checkBody(body, task));
    }).catch(function(err) {
        console.error(err.stack || err);
        next(false);
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
    if (!fields.board)
        return Promise.reject("Invalid board");
    var thread = +fields.thread;
    if (isNaN(thread) || thread < 0)
        return Promise.reject("Invalid thread");
    var period = +fields.period;
    if (isNaN(period) || period < 0)
        return Promise.reject("Invalid period");
    var task = {
        id: id,
        plugin: plugin,
        board: fields.board,
        thread: thread,
        started: false,
        usedFiles: [],
        period: period,
        site: fields.site,
        sage: ("true" == fields.sage),
        captcha: captcha
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
