# EJS with co

All thanks to TJ!!!
Embedded JavaScript templates with co.


## Installation

    $ npm install co.ejs
    
## Startup

    $ node app.js --harmony

## Features

  * Complies with the [Express](http://expressjs.com) view system
  * Static caching of intermediate JavaScript
  * Unbuffered code for conditionals etc `<% code %>`
  * Escapes html by default with `<%= code %>`
  * Unescaped buffering with `<%- code %>`
  * Supports tag customization
  * Filter support for designer-friendly and async templates `<%=yield readFile(xxxx)%>`
  * Use filters with any arguments `<%=:{t: 'tell me'}|get: 't'|other : /t|m/gi%>`
  * Includes
  * Newline slurping with `<% code -%>` or `<% -%>` or `<%= code -%>` or `<%- code -%>`

## Base Usage(see ejs@1.0.0)

## Options

  - `cache`           Compiled functions are cached, requires `filename`
  - `filename`        Used by `cache` to key caches
  - `scope`           Function execution context
  - `debug`           Output generated function body
  - `compileDebug`    When `false` no debug instrumentation is compiled
  - `open`            Open tag, defaulting to "<%"
  - `close`           Closing tag, defaulting to "%>"
  - *                 All others are template-local variables

## Adding async filters

```js
//in filter, this === locals

//async by promise
ejs.filters.doAsync = function(obj) {
  this.sth//locals.sth; 
  return co(function*(){
    return yield readFile(xx)
  })
};
```


## Any type arguments in filter

```html
<%:= {t: locals, a: 123} | get: "path.to.property"| findByRegexp: /\S|./gi : "g" %>
```

## License 

(The MIT License)

Copyright (c) 2015 Giphoo

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
