var config = require("../helpers/config");
var Tools = require("../helpers/tools");

var defineSetting = function(o, name, def) {
    Object.defineProperty(o, name, {
        get: function() {
            return config("plugin." + o.id + "." + name, config("plugin." + name, def));
        },
        configurable: true
    });
};

var plugins = {};

var Plugin = function(id, title, options) {
    Object.defineProperty(this, "id", {
        value: id,
        configurable: true
    });
    Object.defineProperty(this, "title", {
        value: title,
        configurable: true
    });
};

/*public*/ Plugin.prototype.defineSetting = function(name, def) {
    return defineSetting(this, name, def);
};

/*public*/ Plugin.prototype.supportedFileTypes = function(task) {
    return ["image/jpeg", "image/png", "image/gif"];
};

/*public*/ Plugin.prototype.mustAttachFile = function(task) {
    return task.thread > 0;
};

/*public*/ Plugin.prototype.captchaContainerQuery = function(task) {
    return "";
};

/*public*/ Plugin.prototype.formFieldNames = function(task) {
    return {
        board: null,
        thread: null,
        text: null,
        subject: null,
        email: null,
        name: null,
        file: null
    };
};

/*public*/ Plugin.prototype.getFormData = function(task, file, proxy) {
    var o = {};
    var fieldNames = this.formFieldNames(task);
    if (fieldNames.board)
        o[fieldNames.board] = task.board;
    if (fieldNames.thread)
        o[fieldNames.thread] = task.thread;
    if (fieldNames.text && task.generatorOptions.text)
        o[fieldNames.text] = task.generator.generate(task, "text");
    if (task.sage && fieldNames.email)
        o[fieldNames.email] = "sage";
    else if (fieldNames.email && task.generatorOptions.email)
        o[fieldNames.email] = task.generator.generate(task, "email");
    if (fieldNames.name && task.generatorOptions.name)
        o[fieldNames.name] = task.generator.generate(task, "name");
    if (fieldNames.subject && task.generatorOptions.subject)
        o[fieldNames.subject] = task.generator.generate(task, "subject");
    if ("doNotAttach" != task.fileAttachingMode && fieldNames.file
        && (this.mustAttachFile(task) || "attach" == task.fileAttachingMode)) {
        o[fieldNames.file] = FSSync.createReadStream(file);
    }
    if (!task.captcha)
        return Promise.resolve(o);
    var ccq = this.captchaContainerQuery(task);
    var c = {};
    var p;
    if (!task.captcha.getUrl()) {
        p = Tools.getPageDom(this.getUrl(task)).then(function(window) {
            c.window = window;
            c.container = window.jQuery(ccq)[0];
            return task.captcha.getData(window, c.container);
        });
    } else {
        p = Tools.get(Tools.requestData({ url: task.captcha.getUrl() }, proxy));
    }
    return p.then(function(data) {
        return task.solver.solve(data);
    }).then(function(data) {
        return task.captcha.getFields(data, c.window, c.container);
    }).then(function(fields) {
        Tools.forIn(fields, function(val, key) {
            o[key] = val;
        });
        return Promise.resolve(o);
    });
};

/*public*/ Plugin.prototype.getUrl = function(task) {
    return "";
};

/*public*/ Plugin.prototype.postUrl = function(task) {
    return "";
};

/*public*/ Plugin.prototype.checkProxy = function(body, task) {
    return false;
};

/*public*/ Plugin.prototype.checkBody = function(body, task) {
    return false;
};

Plugin.plugin = function(id) {
    return plugins[id];
};

Plugin.addPlugin = function(plugin) {
    if (!Plugin.prototype.isPrototypeOf(plugin))
        return;
    plugins[plugin.id] = plugin;
};

Plugin.pluginIds = function() {
    return Tools.toArray(plugins).sort(function(p1, p2) {
        return (p1.id < p2.id) ? -1 : 1;
    }).map(function(plugin) {
        return plugin.id;
    });
};

module.exports = Plugin;
