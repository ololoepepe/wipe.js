/*wipe global object*/

var wipe = wipe || {};

/*Variables*/

wipe.models = {};
wipe.partials = {};
wipe.templates = {};

/**/

(function() {
    var baseModelHtml = wipe.get("misc/base.json") || "";
    ["base", "partials", "templates"].forEach(function(modelName) {
        var html = ("base" == modelName) ? baseModelHtml : wipe.id("model-" + modelName).innerHTML;
        wipe.models[modelName] = JSON.parse(html);
    });
    wipe.model("partials").forEach(function(partialName) {
        var html = wipe.id("partial-" + partialName).innerHTML;
        wipe.partials[partialName] = html;
    });
    var templates = {};
    wipe.model("templates").forEach(function(templateName) {
        var html = wipe.id("template-" + templateName).innerHTML;
        templates[templateName] = html;
    });
    wipe.forIn(templates, function(html, templateName) {
        wipe.templates[templateName] = doT.template(html, {
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
        }, wipe.partials);
    });
})();
