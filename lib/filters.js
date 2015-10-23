var q = require("q")
    , _ = require("lodash")
    , filters = {};
module.exports = {};
module.exports.__proto__ = filters;
filters.__proto__ = require('ejs/lib/filters.js');

filters.promisify = function(input){
    return q.isPromiseAlike(input) ? input : q(input);
};
filters.exec = function(input /*input arguments*/){
    var args = Array.prototype.slice.call(arguments, 1);
    return input.apply(this, args);
}

filters.set = function(input, pro, value){
    _.set(input, pro, value);
    return value;
};
filters.setLocals = function(input, pro, value){
    _.set(this, pro, value);
    return value;
};
filters.getLocals = function(input, pro, defaultValue){
    return _.get(this, pro, defaultValue);
};