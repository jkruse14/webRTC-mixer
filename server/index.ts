import WebSocketService from './services/web-socket.service';
import * as https from 'https';
import * as fs from 'fs';
import Logger from './logger';

const PORT = 3478;

(async () => {
  const server = https.createServer({
    key: fs.readFileSync('/Users/justinkruse/server.key'),
    cert: fs.readFileSync('/Users/justinkruse/server.cert')
  }, (request, response) => {
    console.log((new Date()) + ' Received request for ' + request.url);
    response.writeHead(404);
    response.end();
  });
  server.listen({port: PORT, host: '192.168.0.46' }, () => {
      Logger.info(`Server is listening on port ${PORT}`);
  });
  const wsServer = new WebSocketService(server);
})();
