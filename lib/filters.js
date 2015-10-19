var q = require("q")
    , _ = require("lodash")
    , filters = module.exports = require('ejs/lib/filters.js');

filters.promisify = function(input){
    return q.isPromiseAlike(input) ? input : q(input);
};

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