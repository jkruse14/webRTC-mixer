import { server as WebSocketServer, connection, request, IMessage } from 'websocket';
import { Server as httpServer } from 'http';
import { Server as httpsServer } from 'https';
import Logger from '../logger';
import * as uuid from 'uuid';

type HttpServer = httpServer | httpsServer | Array<httpServer | httpsServer>;
type SendableMessage = string | Buffer;

enum ConnectionMessageTypes {
  CONNECTIONS_LIST = 'connection-list',
  CONNECTION_ID = 'connection-id',
}

enum SDPMessageType {
  VIDEO_OFFER = 'video-offer',
  VIDEO_ANSWER = 'video-answer',
}

enum ICEMessageType {
  NEW_CANDIDATE = 'new-ice-candidate',
}

enum ConnectionType {
  MIXER = 'mixer',
  FEED = 'feed'
}

interface Connection extends connection {
  id: string;
  name: string;
  type: ConnectionType;
}

interface ConnectionBasics {
  id: string;
  name: string;
  type: ConnectionType;
}

interface Request extends request {
  name: string;
  type: ConnectionType;
}

interface Message extends IMessage {
  type: string;
  targetId?: string;
  senderId?: string;
  data: any;
}

interface SDPMessage extends Message {
  type: SDPMessageType;
  senderId: string;
  sdp: string;
}

interface ConnectionMessage extends Message {
  type: ConnectionMessageTypes;
  data: {id: string, name: string} |
    Array<{ id: string, name: string }>;
}

interface GetMixersMessage extends Message {
  targetId: string;
  data: Array<ConnectionBasics>;
}

interface ICECandidateMessage extends Message {
  type: ICEMessageType;
  // The SDP candidate string, describing the proposed connection method.
  // You typically don't need to look at the contents of this string. All
  // your code needs to do is route it through to the remote peer using
  // the signaling server.
  candidate: string;
}

export default class WebSocketService {
  private wsServer;
  private connections: Array<Connection>;

  constructor(httpServerInst: HttpServer) {
    this.connections = [];
    this.wsServer = new WebSocketServer({
      httpServer: httpServerInst,
      // You should never allow auto-accept connections for production as it
      // defeats all standard cross origin protection built into the protocol
      // and browser. You should *ALWAYS* the connection's origin and decide
      // whether or not to accept it.
      autoAcceptConnections: false,
      maxReceivedFrameSize: 80000,
      maxReceivedMessageSize: 80000
    });

    this.wsServer.on('request', (connRequest: Request) => {
      if (!this.originIsAllowed(connRequest.origin)) {
        // make sure to only accept requests from allowed origins
        connRequest.reject();
        Logger.info(`Connection from origin '${connRequest.origin}' rejected`);
        return;
      }

      const conn: Connection = this.acceptConnectionRequest(connRequest);
      Logger.info(`Connection accepted from origin '${connRequest.origin}`);

      conn.on('message', (message: Message) => {
        Logger.info(`Received Message: ${message.utf8Data}`);
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
        Logger.info(`Peer ${conn.remoteAddress} disconnected: ${description}`);
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

  public originIsAllowed(origin: string): boolean {
    // put logic here to detect whether the specified origin is allowed.
    return true;
  }

  /**
   * Send a message (JSON stringified) to the given target
   * @param targetId where to send the message
   * @param message JSON string message to send
   */
  public sendMessage(message: {[key: string]: any}, targetId?: string): void {
    // if there is a target specified, send the message
    if (targetId) {
      const target = this.getConnectionById(targetId);

      if (!target) {
        Logger.info(`Connection Not Found: ${targetId}`);
        return;
      }

      if (!target.connected) {
        Logger.info(`Connection ${targetId} is not connected to the server with state: ${target.state}`);
        return;
      }
      Logger.info(`sending ${message.type} to ${targetId}`);
      target.sendUTF(JSON.stringify(message));
      return;
    }
    // if no target is specified, broadcast to all connections
    Logger.info(`broadcasting message: ${message.type}`);
    this.connections.forEach((c) => c.sendUTF(JSON.stringify(message)));
  }

  private acceptConnectionRequest(req: Request): Connection {
    const c = req.accept('json', req.origin) as Connection;
    c.id = uuid.v4();
    return c;
  }

  private getConnectionById(id: string): Connection | null {
    return this.connections.find((c) => c.id === id) || null;
  }

  private handleSetupMessgage(message: Message): void {
    const conn = this.getConnectionById(message.senderId);
    const nameCheck = this.connections.map((c) => c.name === message.data.name);
    conn.name = message.data.name;
    if (nameCheck.length > 0) {
      conn.name = `${conn.name} - ${conn.id.split('-')[0]}`;
    }
    conn.type = message.data.type;
    this.sendMessage(this.makeSetupConfirmedMessage(conn.id, conn.name, conn.type));
  }

  private makeSetupConfirmedMessage(id: string, name: string, type: ConnectionType): Message {
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

  private makeConnectionListMessage(): ConnectionMessage {
    return {
      type: ConnectionMessageTypes.CONNECTIONS_LIST,
      data: this.connections.map((c) => {
        if (c.connected) {
          return { name: c.name, id: c.id, type: c.type };
        }
      }) as Array<{name: string, id: string, type: string}>,
    };
  }

  private makeConnectionIdMessage(conn: Connection): ConnectionMessage {
    return {
      type: ConnectionMessageTypes.CONNECTION_ID,
      data: {
        id: conn.id,
        name: conn.name,
      }
    };
  }
}
