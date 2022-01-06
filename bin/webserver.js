/*jslint node: true, vars: true, plusplus: true*/
'use strict';
var httpServer = require("http"),
    path = require("path"),
    url = require("url"),
    fs = require("fs"),
    instance = null;

var WebServer = function (configuration) {
    this.contentTypes = {
        '.txt': 'text/plain',
        '.ns': 'text/plain',
        '.ts': 'text/plain',
        '.html': 'text/html',
        '.css': "text/css",
        '.js': 'application/javascript',
        '.png': 'image/png',
        '.woff': 'font/woff',
        '.ttf': 'font/ttf',
        '.eot': 'font/eot',
        '.svg': 'image/svg+xml'
    };
    this.config = configuration || {
        port: null,
        directory: null,
        verboseMode: false,
        cors: false
    };
    this.headers = {};

    return this;
};

WebServer.prototype.enableCORS = function () {
    this.headers['Access-Control-Allow-Origin'] = '*';
    this.headers['Access-Control-Allow-Methods'] = 'POST, GET, PUT, DELETE, OPTIONS';
    this.headers['Access-Control-Allow-Credentials'] = false;
    this.headers['Access-Control-Max-Age'] = '86400'; // 24 hours
    this.headers['Access-Control-Allow-Headers'] = 'X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept';
};

WebServer.prototype.getPort = function () {
    return this.config.port;
};

WebServer.prototype.log = function (message) {
    if (this.config.verboseMode) {
        console.log(message);
    }
};

WebServer.prototype.start = function () {
    var self = this;
    self.log('Server configuration : \n' + JSON.stringify(self.config));
    if (self.config.cors) {
        this.enableCORS();
    }
    httpServer.createServer(function (req, res) {
        var request = url.parse(req.url).pathname;

        if (request === '/' || request.slice(-1) === '/') {
            request += 'index.html';
        }

        var requestedFile = path.join(self.config.directory, request);

        if (request.search('favicon.ico') !== -1) {
            requestedFile = fs.existsSync(requestedFile) ? requestedFile : process.argv[1].replace('webserver.js', 'favicon.ico');
        }

        fs.readFile(requestedFile, "binary", function (err, file) {
            if (err) {
                res.writeHeader(500, {
                    "Content-Type": "text/plain"
                });
                res.write(err + "\n");
                res.end();
            } else {
                var contentType = self.contentTypes[path.extname(requestedFile)];
                self.headers['Content-Type'] = contentType;
                res.writeHead(200, self.headers); // HTTP "OK" Response
                res.write(file, "binary");
                res.end();
            }
        });
        self.log("Remote connection from: " + req.connection.remoteAddress + " requesting file " + requestedFile);
    }).listen(self.config.port, function () {
        console.log("Node Webserver running at port", self.config.port);
    });
};

if (require.main === module) {
    var input = process.argv;
    var i, length, fileInfo, configuration = {};
    for (i = 2, length = input.length; i < length; i++) {
        if (input[i] === '-f') {
            fileInfo = fs.readFileSync(input[i + 1], 'utf8');
            configuration = JSON.parse(fileInfo);
        } else if (input[i] === '-p') {
            configuration.port = input[i + 1];
        } else if (input[i] === '-d') {
            configuration.directory = input[i + 1];
        } else if (input[i] === '--verbose') {
            configuration.verboseMode = true;
        } else if (input[i] === '--enable_cors' || configuration.cors === true) {
            configuration.cors = true;
        }
    }
    if (input.length < 3) {
        console.log('Node Webserver usage : node webserver.js -d <WebServer Directory> -p <Port> ');
        console.log('                  or   node webserver.js -f <Configuration File>');
        console.log('Additional functionalities : --verbose, --enable_cors ');
    } else {
        instance = new WebServer(configuration);
        instance.start();
    }
}

//Catch Server Error
process.on('uncaughtException', function (err) {
    console.log('Was founded an error! Do you have any service running at port ' + instance.getPort() + '?');
    console.log(err);
});
