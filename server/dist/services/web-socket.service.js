"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const websocket_1 = require("websocket");
const logger_1 = require("../logger");
const uuid = require("uuid");
var ConnectionMessageTypes;
(function (ConnectionMessageTypes) {
    ConnectionMessageTypes["CONNECTIONS_LIST"] = "connection-list";
    ConnectionMessageTypes["CONNECTION_ID"] = "connection-id";
})(ConnectionMessageTypes || (ConnectionMessageTypes = {}));
var SDPMessageType;
(function (SDPMessageType) {
    SDPMessageType["VIDEO_OFFER"] = "video-offer";
    SDPMessageType["VIDEO_ANSWER"] = "video-answer";
})(SDPMessageType || (SDPMessageType = {}));
var ICEMessageType;
(function (ICEMessageType) {
    ICEMessageType["NEW_CANDIDATE"] = "new-ice-candidate";
})(ICEMessageType || (ICEMessageType = {}));
var ConnectionType;
(function (ConnectionType) {
    ConnectionType["MIXER"] = "mixer";
    ConnectionType["FEED"] = "feed";
})(ConnectionType || (ConnectionType = {}));
class WebSocketService {
    constructor(httpServerInst) {
        this.connections = [];
        this.wsServer = new websocket_1.server({
            httpServer: httpServerInst,
            // You should never allow auto-accept connections for production as it
            // defeats all standard cross origin protection built into the protocol
            // and browser. You should *ALWAYS* the connection's origin and decide
            // whether or not to accept it.
            autoAcceptConnections: false,
            maxReceivedFrameSize: 80000,
            maxReceivedMessageSize: 80000
        });
        this.wsServer.on('request', (connRequest) => {
            if (!this.originIsAllowed(connRequest.origin)) {
                // make sure to only accept requests from allowed origins
                connRequest.reject();
                logger_1.default.info(`Connection from origin '${connRequest.origin}' rejected`);
                return;
            }
            const conn = this.acceptConnectionRequest(connRequest);
            logger_1.default.info(`Connection accepted from origin '${connRequest.origin}`);
            conn.on('message', (message) => {
                logger_1.default.info(`Received Message: ${message.utf8Data}`);
                const m = JSON.parse(message.utf8Data);
                switch (m.type) {
                    case 'setup-message':
                        this.handleSetupMessgage(m);
                        this.sendMessage(this.makeConnectionListMessage());
                        break;
                    default:
                        this.sendMessage(m, m.targetId);
                        break;
                }
            });
            conn.on('close', (reasonCode, description) => {
                const index = this.connections.findIndex((c) => c.id === conn.id);
                this.connections.splice(index, 1);
                this.sendMessage(this.makeConnectionListMessage());
                logger_1.default.info(`Peer ${conn.remoteAddress} disconnected: ${description}`);
            });
            this.connections.push(conn);
            const interval = setInterval(() => {
                if (conn.connected) {
                    this.sendMessage(this.makeConnectionIdMessage(conn), conn.id);
                    this.sendMessage(this.makeConnectionListMessage());
                    clearInterval(interval);
                }
            }, 500);
        });
    }
    originIsAllowed(origin) {
        // put logic here to detect whether the specified origin is allowed.
        return true;
    }
    /**
     * Send a message (JSON stringified) to the given target
     * @param targetId where to send the message
     * @param message JSON string message to send
     */
    sendMessage(message, targetId) {
        // if there is a target specified, send the message
        if (targetId) {
            const target = this.getConnectionById(targetId);
            if (!target) {
                logger_1.default.info(`Connection Not Found: ${targetId}`);
                return;
            }
            if (!target.connected) {
                logger_1.default.info(`Connection ${targetId} is not connected to the server with state: ${target.state}`);
                return;
            }
            logger_1.default.info(`sending ${message.type} to ${targetId}`);
            target.sendUTF(JSON.stringify(message));
            return;
        }
        // if no target is specified, broadcast to all connections
        logger_1.default.info(`broadcasting message: ${message.type}`);
        this.connections.forEach((c) => c.sendUTF(JSON.stringify(message)));
    }
    acceptConnectionRequest(req) {
        const c = req.accept('json', req.origin);
        c.id = uuid.v4();
        return c;
    }
    getConnectionById(id) {
        return this.connections.find((c) => c.id === id) || null;
    }
    handleSetupMessgage(message) {
        const conn = this.getConnectionById(message.senderId);
        const nameCheck = this.connections.map((c) => c.name === message.data.name);
        conn.name = message.data.name;
        if (nameCheck.length > 0) {
            conn.name = `${conn.name} - ${conn.id.split('-')[0]}`;
        }
        conn.type = message.data.type;
        this.sendMessage(this.makeSetupConfirmedMessage(conn.id, conn.name, conn.type));
    }
    makeSetupConfirmedMessage(id, name, type) {
        return {
            targetId: id,
            type: 'setup-confirmation',
            data: {
                id,
                name,
                type,
            },
        };
    }
    makeConnectionListMessage() {
        return {
            type: ConnectionMessageTypes.CONNECTIONS_LIST,
            data: this.connections.map((c) => {
                if (c.connected) {
                    return { name: c.name, id: c.id, type: c.type };
                }
            }),
        };
    }
    makeConnectionIdMessage(conn) {
        return {
            type: ConnectionMessageTypes.CONNECTION_ID,
            data: {
                id: conn.id,
                name: conn.name,
            }
        };
    }
}
exports.default = WebSocketService;
//# sourceMappingURL=web-socket.service.js.map