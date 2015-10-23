
/*!
 * EJS
 * Copyright(c) 2015 Giphoo <giphoo@vip.qq.com>
 * MIT Licensed
 */

/**
 * Module dependencies.
 */
var q = require("q")
    , co = require("co")
    , _ = require("lodash")
    , GeneratorFunction = Object.getPrototypeOf(function*(){}).constructor
    , utils = require('ejs/lib/utils.js')
    , path = require('path')
    , dirname = path.dirname
    , extname = path.extname
    , join = path.join
    , fs = require('fs')
    , read = q.nbind(fs.readFile, fs)
    , readSync = fs.readFileSync.bind(fs)

/**
 * Filters.
 *
 * @type Object
 */

var filters = exports.filters = require('./lib/filters.js');

/**
 * tags.
 *
 * @type Object
 */
var tags = exports.tags = require("./lib/tags.js");

/**
 * Intermediate js cache.
 *
 * @type Object
 */

var cache = {};

/**
 * Clear intermediate js cache.
 *
 * @api public
 */

exports.clearCache = function(){
    cache = {};
};

/**
 * Translate filtered code into function calls.
 *
 * @param {String} js
 * @return {String}
 * @api private
 */
var filteredTemplate = _.template([
    'yield filters.promisify(',
        '_.get(filters, \'<%=filter.name%>\', _.get(locals.__proto__, \'<%=filter.name%>\')).call(',
            'locals,',
            '<%=js%><%=filter.argument.length ? \',\' : \'\'%><%=filter.argument.join(",")%>',
        ')',
    ')'
].join(''));
function filtered(js) {
    var splitors1 = js.substr(1).split("|");
    splitors1.forEach(function(splitor1, i){
        splitors1[i] = splitor1.split(":");
    });

    var result = [];
    var buf = "";
    var input = "";
    splitors1.forEach(function(splitor1, i){
        splitor1.forEach(function(splitor2, j){
            //filters
            if(input && j == 0 && !buf){
                //->filters.name
                result.push({
                    name: splitor2.trim(),
                    argument: []
                });
            }else{
                if(buf){//exists buf means that the last char is not splitor
                    if(j == 0){
                        //(..|xx)->argument
                        buf += "|";
                    }else{
                        //(..:xx)->argument
                        buf += ":";
                    }
                }
                //result[result.length - 1].argument
                buf += splitor2;
                try{
                    new GeneratorFunction("return " + buf);
                    if(input){
                        _.last(result).argument.push(buf);
                    }else{
                        input = buf;
                    }
                    buf = "";
                }catch(e){
                }
            }
        })
    });

    var str = result.reduce(function(js, filter){
        return filteredTemplate({
            js: js,
            filter: filter
        });
    }, 'yield filters.promisify(' + input + ")");
    return str;
}

/**
 * Translate taged code into function calls.
 *
 * @param {String} js
 * @return {String}
 * @api private
 */

var tagRegexp = /^([a-zA-Z\$_][^:\\\|\s]*)\s/;
function taged(js) {
    //<% tag filename [? argument1 : argument2][| filter1 : arguments4filter1 ... |filter2... ]%>
    var tagMatch = js.trim().match(tagRegexp);
    if(tagMatch){
        var tagname = tagMatch[1];
        if(_.get(exports.tags, tagname)){
            var tagBuf = ''
                ,tagFunc = "_.get(tags, '" + tagname + "')";
            js = js.trim().replace(tagname, "").trim();
            if(!js.match(/\||\?/)){//... filename%>
                tagBuf = [
                    'yield filters.promisify(',
                        tagFunc,
                        ".call(locals,",
                            js,//=tagFilename
                        ')',
                    ')'
                ].join("");
            }else{//... filename [? argument1 : argument2][| filter1 : arguments4filter1 ... |filter2... ]%>
                var tagFilename;
                if(js.match(/[^\|]*\?/)){//exists arguments for tag function
                    //filename ? arguments4tag ... | filter1 : arguments4filter1 ... |filter2...
                    tagFilename = js.split("?")[0].trim();
                    tagFunc += '.bind(locals,\'' + tagFilename + '\')|__proto__.exec : '
                }else{//filename | filter1 : arguments4filter1 ... |filter2...
                    tagFilename = js.split("|")[0].trim();
                    tagFunc += '.call(locals,\'' + tagFilename + '\')'
                }

                //<tagFunc> [? argument1 : argument2]| filter1 : arguments4filter1 ... |filter2..
                tagBuf = js.replace(new RegExp(tagFilename + '\\s*\\??'), tagFunc);
                tagBuf = filtered(":" + tagBuf);
            }
            return tagBuf;
        }
    }
    return "";
}

/**
 * Re-throw the given `err` in context to the
 * `str` of ejs, `filename`, and `lineno`.
 *
 * @param {Error} err
 * @param {String} str
 * @param {String} filename
 * @param {String} lineno
 * @api private
 */

function rethrow(err, str, filename, lineno){
    var lines = str.split('\n')
        , start = Math.max(lineno - 3, 0)
        , end = Math.min(lines.length, lineno + 3);

    // Error context
    var context = lines.slice(start, end).map(function(line, i){
        var curr = i + start + 1;
        return (curr == lineno ? ' >> ' : '    ')
            + curr
            + '| '
            + line;
    }).join('\n');

    // Alter exception message
    err.path = filename;
    err.message = (filename || 'ejs') + ':'
        + lineno + '\n'
        + context + '\n\n'
        + err.message;

    throw err;
}

/**
 * Parse the given `str` of ejs, returning the function body.
 *
 * @param {String} str
 * @return {Promise}
 * @api public
 */

var parse = exports.parse = function(str, options){
    options = options || {};
    var open = options.open || exports.open || '<%'
        , close = options.close || exports.close || '%>'
        , filename = options.filename
        , compileDebug = options.compileDebug !== false
        , buf = "";

    buf += 'var buf = [];';
    if (false !== options._with) buf += '\nwith (locals || {}) {';
    buf += '\n buf.push(\'';

    var lineno = 1;

    var consumeEOL = false;
    for (var i = 0, len = str.length; i < len; ++i) {
        var stri = str[i];
        if (str.slice(i, open.length + i) == open) {
            i += open.length

            var prefix, postfix, line = (compileDebug ? '__stack.lineno=' : '') + lineno;
            switch (str[i]) {
                case '=':
                    prefix = "', escape((" + line + ', ';
                    postfix = ")), '";
                    ++i;
                    break;
                case '-':
                    prefix = "', (" + line + ', ';
                    postfix = "), '";
                    ++i;
                    break;
                default:
                    prefix = "');" + line + ';';
                    postfix = "; buf.push('";
            }

            var end = str.indexOf(close, i);

            if (end < 0){
                throw new Error('Could not find matching close tag "' + close + '".');
            }

            var js = str.substring(i, end)
                , start = i
                , n = 0;

            if ('-' == js[js.length-1]){
                js = js.substring(0, js.length - 2);
                consumeEOL = true;
            }

            var checkTaged = taged(js);
            if(checkTaged){
                buf += "' + (" + line + "," + checkTaged + ") +  '";
                js = "";
            }

            while (~(n = js.indexOf("\n", n))) n++, lineno++;
            if (js.substr(0, 1) == ':') js = filtered(js)
            if (js) {
                if (js.lastIndexOf('//') > js.lastIndexOf('\n')) js += '\n';
                buf += prefix;
                buf += js;
                buf += postfix;
            }
            i += end - start + close.length - 1;

        } else if (stri == "\\") {
            buf += "\\\\";
        } else if (stri == "'") {
            buf += "\\'";
        } else if (stri == "\r") {
            // ignore
        } else if (stri == "\n") {
            if (consumeEOL) {
                consumeEOL = false;
            } else {
                buf += "\\n";
                lineno++;
            }
        } else {
            buf += stri;
        }
    }

    if (false !== options._with) buf += "');\n} \nreturn buf.join('');";
    else buf += "');\nreturn buf.join('');";
    return buf;
};

/**
 * Compile the given `str` of ejs into a `Function`.
 *
 * @param {String} str
 * @param {Object} options
 * @return {Promise}
 * @api public
 */

var compile = exports.compile = function(str, options){
    options = options || {};
    var escape = options.escape || utils.escape;

    var input = JSON.stringify(str)
        , compileDebug = options.compileDebug !== false
        , filename = options.filename
            ? JSON.stringify(options.filename)
            : 'undefined';

    if (compileDebug) {
        // Adds the fancy stack trace meta info
        str = [
            'var __stack = { lineno: 1, input: ' + input + ', filename: ' + filename + ' };',
            rethrow.toString(),
            'try {',
            exports.parse(str, options),
            '} catch (err) {',
            '  rethrow(err, __stack.input, __stack.filename, __stack.lineno);',
            '}'
        ].join("\n");
    } else {
        str = exports.parse(str, options);
    }

    if (options.debug) {
        console.log("debug output:\n ======================\n", str, "\n========================\nend");
    }

    try {
        var fn = new GeneratorFunction('locals, _, co, filters, tags, escape, rethrow', str);
    } catch (err) {
        if ('SyntaxError' == err.name) {
            err.message += options.filename
                ? ' in ' + filename
                : ' while compiling ejs';
        }
        throw err;
    }

    return function(locals, scope){
        return co(fn.bind(scope || options.scope, locals, _, co, filters, tags, escape, rethrow));
    }
};

/**
 * Render the given `str` of ejs.
 *
 * Options:
 *
 *   - `locals`          Local variables object
 *   - `cache`           Compiled functions are cached, requires `filename`
 *   - `filename`        Used by `cache` to key caches
 *   - `scope`           Function execution context
 *   - `debug`           Output generated function body
 *   - `open`            Open tag, defaulting to "<%"
 *   - `close`           Closing tag, defaulting to "%>"
 *
 * @param {String} str
 * @param {Object} options
 * @return {Promise}
 * @api public
 */

exports.render = function(str, options){
    var fn;
    options = options || {};

    if (options.cache) {
        if (options.filename) {
            fn = cache[options.filename] || (cache[options.filename] = compile(str, options));
        } else {
            throw new Error('"cache" option requires "filename".');
        }
    } else {
        fn = compile(str, options);
    }

    options.__proto__ = options.locals;
    return fn(options);
};

/**
 * Render an EJS file at the given `path` and callback `fn(err, str)`.
 *
 * @param {String} path
 * @param {Object|Function} options or callback
 * @return {Promise}
 * @api public
 */

exports.renderFile = function(path, options){
    var key = path + ':string';
    options = options || {};

    options.filename = path;

    var str = options.cache
        ? cache[key] || (cache[key] = readSync(path, 'utf8'))
        : readSync(path, 'utf8');

    return exports.render(str, options);
};

/**
 * Resolve include `name` relative to `filename`.
 *
 * @param {String} name
 * @param {String} filename
 * @return {String}
 * @api private
 */

function resolveInclude(name, filename) {
    var path = join(dirname(filename), name);
    var ext = extname(name);
    if (!ext) path += '.ejs';
    return path;
}

// express support

exports.__express = function(path, options, fn){
    options = options || {};

    return q.try(function(){
        if(options.locals) options.__proto__ = options.locals;
        if(path) options.filename = path;

        return require(options.filename)(options, options.scope);
    }).nodeify(fn);
};

// require support

require.extensions[".ejs"] = function(module, filepath){
    var tempcontent = readSync(filepath, "utf8");
    var parser = compile(tempcontent);

    return module.exports = function(_locals, _scope){
        var locals = {};//protect orginal
        locals.__proto__ = {
            exports: module.exports = module.exports || {},
            module: module,
            require: module.require.bind(module),
            __dirname: dirname(filepath),
            __filename: filepath
        };

        if(_locals) locals.__proto__.__proto__ = _locals;
        return parser(locals, _scope);
    };
}