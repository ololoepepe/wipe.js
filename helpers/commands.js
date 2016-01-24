var ReadLine = require("readline");
var ReadLineSync = require("readline-sync");

var config = require("./config");
var Global = require("./global");
var Tools = require("./tools");

var rl = ReadLine.createInterface({
    "input": process.stdin,
    "output": process.stdout
});

rl.setPrompt("wipe.js> ");

rl.tmp_question = rl.question;
rl.question = function(question) {
    return new Promise(function(resolve, reject) {
        rl.tmp_question.apply(rl, [question, resolve]);
    });
};

var handlers = {};

var _installHandler = function(cmd, f) {
    if (typeof cmd == "string") {
        handlers[cmd] = f;
    } else {
        cmd.forEach(function(cmd) {
            handlers[cmd] = f;
        });
    }
};

_installHandler(["quit", "q"], function() {
    process.exit(0);
    return Promise.resolve();
});

_installHandler("help", function() {
    console.log("q | quit - Exit the application");
    console.log("help - Print this Help");
    console.log("set <path> [value] - Set an option (config.json). "
        + "If value is not specified, you will be prompted to enter it");
    console.log("get <path> - Print an option (config.json)");
    console.log("remove <path> - Remove option (config.json)");
    return Promise.resolve();
});

_installHandler("set", function(args) {
    var path = args.split(/\s+/)[0];
    var value = args.split(/\s+/).slice(1).join(" ");
    if (!path)
        return Promise.reject("Invalid command. Type 'help' for commands");
    if (value) {
        config.set(path, JSON.parse(value));
        return Promise.resolve("OK");
    }
    return rl.question("Enter value for '" + path + "': ").then(function(answer) {
        config.set(path, (typeof answer == "string") ? answer : JSON.parse(answer));
        return Promise.resolve("OK");
    });
});

_installHandler("get", function(args) {
    if (!args)
        return Promise.reject(console.log("Invalid command. Type 'help' for commands"));
    var v = config(args);
    if (undefined == v)
        return Promise.reject("No such value");
    return Promise.resolve("Value for '" + args + "': " + JSON.stringify(v, null, 4));
});

_installHandler("remove", function(args) {
    if (!args)
        Promise.reject("Invalid command. Type 'help' for commands");
    config.remove(args);
    return Promise.resolve("OK");
});

var init = function() {
    console.log("Type 'help' for commands");
    rl.prompt();
    rl.on("line", function(line, lineCount, byteCount) {
        if ("" == line)
            return rl.prompt();
        var cmd = "";
        var i = 0;
        for (; i < line.length; ++i) {
            if (line[i] == " ")
                break;
            cmd += line[i];
        }
        if (!handlers.hasOwnProperty(cmd)) {
            console.log("Invalid command. Type 'help' for commands");
            return rl.prompt();
        }
        rl.pause();
        handlers[cmd]((i < (line.length - 1)) ? line.substr(i + 1) : undefined).then(function(msg) {
            if (msg)
                console.log(msg);
            rl.resume();
            rl.prompt();
        }).catch(function(err) {
            Global.error(err.stack ? err.stack : err);
            rl.resume();
            rl.prompt();
        });
    }).on("error", function(err) {
        Global.error(err);
    });
    return rl;
};

init.installHandler = _installHandler;

module.exports = init;
