console.log(module);
console.log(module.require.toString());
require.extensions[".ejs"] = function(){
    console.log(arguments);
}

require("./test.ejs")