"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const web_socket_service_1 = require("./services/web-socket.service");
const https = require("https");
const fs = require("fs");
const logger_1 = require("./logger");
const PORT = 3478;
(() => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
    const server = https.createServer({
        key: fs.readFileSync('/Users/justinkruse/server.key'),
        cert: fs.readFileSync('/Users/justinkruse/server.cert')
    }, (request, response) => {
        console.log((new Date()) + ' Received request for ' + request.url);
        response.writeHead(404);
        response.end();
    });
    server.listen({ port: PORT, host: '192.168.0.46' }, () => {
        logger_1.default.info(`Server is listening on port ${PORT}`);
    });
    const wsServer = new web_socket_service_1.default(server);
}))();
//# sourceMappingURL=index.js.map