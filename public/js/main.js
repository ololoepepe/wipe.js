/*wipe global object*/

var wipe = wipe || {};

/*Constants*/

/*Variables*/

/*Functions*/

wipe.buttons = function(parent) {
    parent = parent || document.body;
    $("button, input[type='checkbox']", parent).button();
};

wipe.addTask = function() {
    var div = wipe.template("addTaskDialog", wipe.model("base"));
    $("[name='taskOptions'], [name='generatorOptions'], [name='delayMode'], [name='fileAttachingMode']",
        div).buttonset();
    wipe.showDialog(div, { title: "Add task" }).then(function(result) {
        if (!result)
            return Promise.resolve();
        var form = wipe.queryOne("form", div);
        var formData = new FormData(form);
        return wipe.post(form.action, formData);
    }).then(function(task) {
        if (!task)
            return Promise.resolve();
        task = wipe.template("task", task);
        wipe.buttons(task);
        wipe.queryOne("#tasks > ul").appendChild(task);
    }).catch(wipe.handleError);
};

wipe.startStopTask = function(btn) {
    $(btn).button("disable");
    var li = $(btn).closest(".task")[0];
    var started = (wipe.data("started", li) == "true");
    var formData = new FormData();
    formData.append("id", wipe.data("id", li));
    var path = "/" + wipe.data("sitePathPrefix") + "action/" + (started ? "stop" : "start") + "Task";
    return wipe.post(path, formData).then(function(task) {
        task = wipe.template("task", task);
        wipe.buttons(task);
        li.parentNode.replaceChild(task, li);
    }).catch(function(err) {
        $(btn).button("enable");
        wipe.handleError(err);
    });
};

wipe.removeTask = function(btn) {
    var li = $(btn).closest(".task")[0];
    var formData = new FormData();
    formData.append("id", wipe.data("id", li));
    var path = "/" + wipe.data("sitePathPrefix") + "action/removeTask";
    return wipe.post(path, formData).then(function(task) {
        li.parentNode.removeChild(li);
    }).catch(wipe.handleError);
};

wipe.showTaskStats = function(btn) {
    var li = $(btn).closest(".task")[0];
    var div = wipe.nameOne("stats", li);
    div.style.display = div.style.display ? "" : "none";
};

wipe.updateTask = function(id) {
    wipe.api("task", { id: id }).then(function(task) {
        var oldTask = wipe.id(id);
        var stats = wipe.id("statsButton" + id).checked;
        task = wipe.template("task", task);
        wipe.buttons(task);
        oldTask.parentNode.replaceChild(task, oldTask);
        if (stats)
            $("#statsButton" + id).click();
    }).catch(wipe.handleError);
};

wipe.updateAll = function() {
    wipe.api("tasks").then(function(tasks) {
        tasks.forEach(function(task) {
            var id = task.id;
            var oldTask = wipe.id(id);
            var stats = wipe.id("statsButton" + id).checked;
            task = wipe.template("task", task);
            wipe.buttons(task);
            oldTask.parentNode.replaceChild(task, oldTask);
            if (stats)
                $("#statsButton" + id).click();
        });
    }).catch(wipe.handleError);
};

wipe.initializeOnLoad = function() {
    wipe.buttons();
    wipe.api("tasks").then(function(tasks) {
        var div = wipe.id("tasks");
        wipe.removeChildren(tasks);
        tasks = wipe.template("tasks", { tasks: tasks });
        wipe.buttons(tasks);
        div.appendChild(tasks);
    }).catch(wipe.handleError);
};

window.addEventListener("load", function load() {
    window.removeEventListener("load", load, false);
    wipe.initializeOnLoad();
}, false);

window.addEventListener("beforeunload", function unload() {
    window.removeEventListener("beforeunload", unload, false);
    wipe.unloading = true;
}, false);
