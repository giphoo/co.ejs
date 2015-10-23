/**
 * Created by giphoo on 2015/10/19.
 */
var q = require("q");

module.exports = {};
var tags = module.exports.__proto__ = {
    include : function(file){
        return (this.__proto__.require || global.require)(file)(this)
    }
}