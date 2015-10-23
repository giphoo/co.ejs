/**
 * Created by giphoo on 2015/10/19.
 */
var ejs = require("../index.js");
var co = require("co");
var q = require("q");
var _ = require("lodash");

ejs.filters.doAsync = function(input, opt){
    return q.delay(500).then(function(){
        return input + opt;
    })
}
ejs.filters.doSync = function(input, opt){
    return input + opt;
}

ejs.tags.test = function(filename/*other arguments*/){
    //do something...
    console.log(arguments)
    return filename;//value or promise
}
_.set(ejs.tags, "package.work", function(){
    console.log(arguments)
    return arguments;//value or promise
})

var start = Date.now();
co(function*(){
    //var result = yield ejs.renderFile(__dirname + "/test.ejs", {debug:true});
    var parser = require("./test.ejs");
    console.log("complie time:", Date.now() - start);
    start = Date.now();
    var result = yield parser({key1:"123"})
    console.log("parse time:", Date.now() - start);
    console.log(result)
}).catch(function(e){
    console.log(e.stack)
})