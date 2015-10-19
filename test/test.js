/**
 * Created by giphoo on 2015/10/19.
 */
var ejs = require("../index.js");
var co = require("co");
var q = require("q");

ejs.filters.doAsync = function(input, opt){
    console.log(this)//===>locals
    console.log(arguments);
    return q.delay(500).then(function(){
        return input + opt;
    })
}
ejs.filters.doSync = function(input, opt){
    return input + opt;
}
var start = Date.now();
for(var i =0; i< 50 ; i++)
co(function*(){
    var result = yield ejs.renderFile(__dirname + "/test.ejs");
    console.log("after", Date.now() - start);
    //console.log(result)
}).catch(function(e){
    console.log(e.stack)
})