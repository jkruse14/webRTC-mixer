import { environment } from './../../environments/environment';
import { Injectable } from '@angular/core';
import { w3cwebsocket as W3CWebSocket, IMessageEvent } from 'websocket';
import Logger from '../../logger';
import { Subject, BehaviorSubject } from 'rxjs';
import rtcSerivce from './rtc.service';

export const SETUP_MESSAGE = 'setup-message';

export interface MixerW3CWebSocket extends W3CWebSocket {
  id?: string;
  type?: ConnectionType;
  name?: string;
}

export enum ConnectionType {
  MIXER = 'mixer',
  FEED = 'feed',
  VIEWER = 'viewer',
}

interface CreateSocketArgs {
  type?: ConnectionType;
  name?: string;
}

export interface ConnectedDevices {
  id: string;
  name: string;
  type: ConnectionType;
}

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {
  private localConnection: MixerW3CWebSocket;
  connections: Array<MixerW3CWebSocket>;
  connectedStreams: { [key: string]: MediaStream };
  connectedStreamsChanges = new BehaviorSubject<{ [key: string]: MediaStream }>({});
  connectedDevices: Array<ConnectedDevices> = [];
  connectedIdsChange = new Subject<Array<string>>();
  connectedStreams$ = this.connectedStreamsChanges.asObservable();
  remoteStream: MediaStream;

  constructor() {
    this.connectedStreams = {};
    // this.connectedStreamsChanges.subscribe(value => {
    //   console.log('connected streams change', value);
    //   this.connectedStreams = value;
    // });
  }

  getLocalWebSocketConnection(): MixerW3CWebSocket | undefined {
    return this.localConnection;
  }

  async createConnection(params?: CreateSocketArgs): Promise<MixerW3CWebSocket> {
    console.log('cc params: ', params);
    const connection: MixerW3CWebSocket = this.createWebSocket(params || {});
    connection.type = params.type;
    connection.onerror = (error: Error) => {
      console.log(`Connection Error: ${error.message}`, error.stack);
    };

    connection.onopen = () => {
      Logger.info(`WebSocket Connection ${connection.id} Connected`);
    };

    connection.onclose = () => {
      Logger.info(`Connection '${connection.id}' Connection Closed`);
    };

    connection.onmessage = async (messageEvent: IMessageEvent) => {
      const message: any = JSON.parse(messageEvent.data as string);

      switch (message.type) {
        case 'connection-id':
          connection.id = message.data.id;
          rtcSerivce.setLocalWebSocketConnection(connection);
          this.setLocalConnection(connection);
          this.sendMessage(JSON.stringify({
            targetId: connection.id,
            senderId: connection.id,
            type: SETUP_MESSAGE,
            data: {
              name: connection.name,
              type: connection.type,
            }
          }));
          break;
        case 'connection-list':
          this.connectedDevices = message.data as any;
          break;
        case 'video-offer':
          const answer = await rtcSerivce.handleVideoOfferMessage(message);
          if (answer) {
            this.sendMessage(answer);
          }
          break;
        case 'video-answer':
          await rtcSerivce.handleVideoAnswerMessage(message);
          break;
        case 'new-ice-candidate':
          await rtcSerivce.handleNewICECandidateMessage(message);
          break;
        case 'connected-streams':
          this.connectedStreams.new = new MediaStream();
          delete this.connectedStreams.new;
          break;
        case 'setup-confirmation':
          Logger.info(`Setup confirmed for connection ${message.data.name}`);
          break;
        default:
          Logger.info(`Unknown Message Type: ${message.type}`);
      }

    };

    return connection;
  }

  setLocalConnection(conn: MixerW3CWebSocket): void {
    this.localConnection = conn;
  }
  closeConnection(id: string): void {
    const connection = this.getConnectionById(id);
    if (!connection) {
      Logger.info(`Connection Not Found: ${id}`);
      return;
    }
    connection.close();
  }

  sendMessage(message: string | { [key: string]: any }): void {
    if (typeof message !== 'string') {
      message = JSON.stringify(message);
    }
    this.localConnection.send(message);
  }

  createWebSocket(params: CreateSocketArgs): MixerW3CWebSocket {
    console.log('params: ', params);
    const c = new W3CWebSocket(environment.WEB_SOCKET_SERVER_URI, 'json') as MixerW3CWebSocket;
    c.type = params.type;
    c.name = params.name;
    return c;
  }

  private getConnectionById(id: string): MixerW3CWebSocket | null {
    return this.connections.find((c) => c.id === id) || null;
  }

  public getConnectedStreams(): { [key: string]: MediaStream } {
    return this.connectedStreams;
  }

  private handleICEGatheringStateChangeEvent(event): void {

  }
}

export default new WebSocketService();
