var ChildProcess = require("child_process");
var equal = require("deep-equal");
var Formidable = require("formidable");
var FS = require("q-io/fs");
var FSSync = require("fs-ext");
var JSDOM = require("jsdom");
var mkpath = require("mkpath");
var promisify = require("promisify-node");
var Request = require("request");
var Util = require("util");

var config = require("./config");

var tmpPath = function() {
    return config("tmpPath", __dirname + "/../tmp");
};

var jquery = FSSync.readFileSync(__dirname + "/../public/js/3rdparty/jquery-1.11.3.min.js", "utf8");

mkpath.sync(tmpPath() + "/formidable");

Object.defineProperty(module.exports, "Billion", { value: (2 * 1000 * 1000 * 1000) });
Object.defineProperty(module.exports, "Second", { value: 1000 });
Object.defineProperty(module.exports, "Minute", { value: (60 * 1000) });
Object.defineProperty(module.exports, "Hour", { value: (60 * 60 * 1000) });

var forIn = function(obj, f) {
    if (!obj || typeof f != "function")
        return;
    for (var x in obj) {
        if (obj.hasOwnProperty(x))
            f(obj[x], x);
    }
};

module.exports.forIn = forIn;

module.exports.mapIn = function(obj, f) {
    if (!obj || typeof f != "function")
        return;
    var arr = [];
    for (var x in obj) {
        if (obj.hasOwnProperty(x))
            arr.push(f(obj[x], x));
    }
    return arr;
};

module.exports.filterIn = function(obj, f) {
    if (!obj || typeof f != "function")
        return;
    var nobj = {};
    for (var x in obj) {
        if (obj.hasOwnProperty(x)) {
            var item = obj[x];
            if (f(item, x))
                nobj[x] = item;
        }
    }
    return nobj;
};

module.exports.toArray = function(obj) {
    var arr = [];
    var i = 0;
    forIn(obj, function(val) {
        arr[i] = val;
        ++i;
    });
    return arr;
};

module.exports.extend = function(Child, Parent) {
    var F = function() {};
    F.prototype = Parent.prototype;
    Child.prototype = new F();
    Child.prototype.constructor = Child;
    Child.superclass = Parent.prototype;
};

module.exports.arr = function(obj) {
    var arr = [];
    if (!obj || !obj.length)
        return arr;
    for (var i = 0; i < obj.length; ++i)
        arr.push(obj[i]);
    return arr;
};

module.exports.contains = function(s, subs) {
    if (typeof s == "string" && typeof subs == "string")
        return s.replace(subs, "") != s;
    if (!s || !s.length || s.length < 1)
        return false;
    for (var i = 0; i < s.length; ++i) {
        if (equal(s[i], subs))
            return true;
    }
    return false;
};

var hasOwnProperties = function(obj) {
    if (!obj)
        return false;
    for (var x in obj) {
        if (obj.hasOwnProperty(x))
            return true;
    }
    return false;
};

module.exports.hasOwnProperties = hasOwnProperties;

module.exports.replace = function(where, what, withWhat) {
    if (typeof where != "string" || (typeof what != "string" && !(what instanceof RegExp))
        || typeof withWhat != "string") {
        return;
    }
    var sl = where.split(what);
    return (sl.length > 1) ? sl.join(withWhat) : sl.pop();
};

module.exports.toUTC = function(date) {
    if (!(date instanceof Date))
        return;
    return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours(),
        date.getUTCMinutes(), date.getUTCSeconds(), date.getMilliseconds());
};

module.exports.now = function() {
    return new Date();
};

module.exports.forever = function() {
    var date = new Date();
    date.setTime(date.getTime() + module.exports.Billion * 1000);
    return date;
};

module.exports.mimeType = function(fileName) {
    if (!fileName || !Util.isString(fileName))
        return Promise.resolve(null);
    try {
        return new Promise(function(resolve, reject) {
            ChildProcess.exec(`file --brief --mime-type ${fileName}`, {
                timeout: 5000,
                encoding: "utf8",
                stdio: [
                    0,
                    "pipe",
                    null
                ]
            }, function(err, out) {
                if (err)
                    reject(err);
                resolve(out ? out.replace(/\r*\n+/g, "") : null);
            });
        });
    } catch (err) {
        return Promise.resolve(null);
    }
};

module.exports.mimeTypeSync = function(fileName) {
    if (!fileName || !Util.isString(fileName))
        return null;
    try {
        var out = ChildProcess.execSync(`file --brief --mime-type ${fileName}`, {
            timeout: 5000,
            encoding: "utf8",
            stdio: [
                0,
                "pipe",
                null
            ]
        });
        return out ? out.replace(/\r*\n+/g, "") : null;
    } catch (err) {
        return null;
    }
};

module.exports.splitCommand = function(cmd) {
    var args = [];
    var arg = "";
    var quot = 0;
    for (var i = 0; i < cmd.length; ++i) {
        var c = cmd[i];
        if (/\s/.test(c)) {
            if (quot) {
                arg += c;
            } else if (arg.length > 0) {
                args.push(arg);
                arg = "";
            }
        } else {
            if ("\"" == c && (i < 1 || "\\" != cmd[i - 1])) {
                switch (quot) {
                case 1:
                    quot = 0;
                    break;
                case -1:
                    arg += c;
                    break;
                case 0:
                default:
                    quot = 1;
                    break;
                }
            } else if ("'" == c && (i < 1 || "\\" != cmd[i - 1])) {
                switch (quot) {
                case 1:
                    arg += c;
                    break;
                case -1:
                    quot = 0;
                    break;
                case 0:
                default:
                    quot = -1;
                    break;
                }
            } else {
                if (("\"" == c || "'" == c) && (i > 0 || "\\" == cmd[i - 1]) && arg.length > 0)
                    arg = arg.substring(0, arg.length - 1);
                arg += c;
            }
        }
    }
    if (arg.length > 0) {
        if (quot)
            return null;
        args.push(arg);
    }
    var command = null;
    if (args.length > 0)
        command = args.shift();
    return {
        command: command,
        arguments: args
    };
};

module.exports.tmpPath = tmpPath;

module.exports.parseForm = function(req) {
    var form = new Formidable.IncomingForm();
    form.uploadDir = tmpPath() + "/formidable";
    form.hash = "sha1";
    form.maxFieldsSize = 5 * 1024 * 1024;
    return new Promise(function(resolve, reject) {
        form.parse(req, function(err, fields, files) {
            if (err) {
                reject(err);
            } else {
                resolve({
                    fields: fields,
                    files: files
                });
            }
        });
    });
};

module.exports.withoutDuplicates = function(arr) {
    if (!arr || !Util.isArray(arr))
        return arr;
    return arr.filter(function(item, i) {
        return arr.indexOf(item) == i;
    });
};

module.exports.remove = function(arr, what, both) {
    if (!arr || !Util.isArray(arr))
        return arr;
    if (Util.isUndefined(what))
        return;
    if (!Util.isArray(what))
        what = [what];
    for (var i = what.length - 1; i >= 0; --i) {
        var ind = arr.indexOf(what[i]);
        if (ind >= 0) {
            arr.splice(ind, 1);
            if (both)
                what.splice(i, 1);
        }
    }
};

var openFile = promisify(FSSync.open);
var closeFile = promisify(FSSync.close);
var flockFile = promisify(FSSync.flock);
var readData = promisify(FSSync.read);
var writeData = promisify(FSSync.write);

var recover = function(c, err) {
    if (!c.fd)
        return Promise.reject(err);
    return flockFile(c.fd, "un").catch(function(err) {
        console.error(err.stack || err);
        return Promise.resolve();
    }).then(function() {
        if (c.noclose)
            return Promise.resolve();
        return closeFile(c.fd);
    }).catch(function(err) {
        console.error(err.stack || err);
        return Promise.resolve();
    }).then(function() {
        return Promise.reject(err);
    });
};

module.exports.readFile = function(path, ifModifiedSince) {
    var c = {};
    return openFile(path, "r").then(function(fd) {
        c.fd = fd;
        return flockFile(c.fd, "sh");
    }).then(function() {
        c.locked = true;
        return FS.stat(path);
    }).then(function(stats) {
        c.lastModified = stats.node.mtime;
        if (ifModifiedSince && +ifModifiedSince >= +stats.mtime)
            return Promise.resolve();
        if (stats.size <= 0)
            return Promise.resolve();
        c.buffer = new Buffer(stats.size);
        return readData(c.fd, c.buffer, 0, c.buffer.length, null);
    }).then(function() {
        c.data = c.buffer ? c.buffer.toString("utf8") : "";
        return flockFile(c.fd, "un");
    }).then(function() {
        c.locked = false;
        return closeFile(c.fd);
    }).then(function() {
        return Promise.resolve({
            data: c.data,
            lastModified: c.lastModified
        });
    }).catch(recover.bind(null, c));
};

module.exports.writeFile = function(path, data) {
    var c = {};
    return openFile(path, "w").then(function(fd) {
        c.fd = fd;
        return flockFile(c.fd, "ex");
    }).then(function() {
        c.locked = true;
        return writeData(c.fd, data, null, "utf8");
    }).then(function() {
        return flockFile(c.fd, "un");
    }).then(function() {
        c.locked = false;
        return closeFile(c.fd);
    }).then(function() {
        return Promise.resolve(c.data);
    }).catch(recover.bind(null, c));
};

module.exports.removeFile = function(path) {
    var c = { noclose: true };
    return openFile(path, "w").then(function(fd) {
        c.fd = fd;
        return flockFile(c.fd, "ex");
    }).then(function() {
        c.locked = true;
        return FS.remove(path);
    }).then(function() {
        return flockFile(c.fd, "un");
    }).then(function() {
        c.locked = false;
        return Promise.resolve();
    }).catch(recover.bind(null, c));
};

module.exports.series = function(arr, f) {
    var p = Promise.resolve();
    if (Util.isArray(arr)) {
        arr.forEach(function(el) {
            p = p.then(function() {
                return f(el);
            });
        });
    } else if (Util.isObject(arr)) {
        forIn(arr, function(el, key) {
            p = p.then(function() {
                return f(el, key);
            });
        });
    }
    return p;
};

module.exports.post = function() {
    var args = Array.prototype.slice.call(arguments);
    return new Promise(function(resolve, reject) {
        Request.post.apply(Request, args.concat(function(err, httpResponse, body) {
            if (err)
                return reject(err);
            resolve(body);
        }));
    });
};

module.exports.getPageDom = function(url) {
    return new Promise(function(resolve, reject) {
        JSDOM.env({
            url: url,
            src: [jquery],
            features: {
                FetchExternalResources: ["script"],
                ProcessExternalResources: ["script"]
            },
            done: function(err, window) {
                if (err)
                    return reject(err);
                resolve(window);
            }
        });
    });
};
