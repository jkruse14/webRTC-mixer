import rtcService, { RtcService } from './../services/rtc.service';
import webSocketService, { WebSocketService, ConnectedDevices, ConnectionType, SETUP_MESSAGE } from './../services/web-socket.service';
import { Component, OnInit, SimpleChanges, AfterViewInit, OnChanges, OnDestroy } from '@angular/core';

@Component({
  selector: 'app-watch',
  templateUrl: './watch.component.html',
  styleUrls: ['./watch.component.scss']
})
export class WatchComponent implements OnInit, OnChanges, OnDestroy {
  webSocketService: WebSocketService;
  rtcService: RtcService = rtcService;
  connectedMixers: Array<ConnectedDevices>;
  readonly type: ConnectionType;
  constructor() {
    this.webSocketService = webSocketService;
    this.type = ConnectionType.VIEWER;
  }

  async ngOnInit(): Promise<void> {
    await this.createConnection();
  }

  // ngAfterViewInit(): void {
    // rtcServive.getActiveStreams
    // -- make connection to websocket server
    // -- get all conections with type mixer
    // -- get active stream from given mixer
    // show connections in connection table
    // on click:
    // -- create peer connection, receive only
    // -- connect to mixer
    // -- set mixer's active stream to watch video srcObject
  // }

  ngOnChanges(changes: SimpleChanges): void {}

  ngOnDestroy(): void {}

  private async createConnection(): Promise<void> {
    const c = await this.webSocketService.createConnection({
      type: ConnectionType.VIEWER,
      name: `VIEWER-${Date.now()}`,
    });
    this.webSocketService.setLocalConnection(c);
    // this.connectedStreams = this.webSocketService.connectedStreams;
    // this.connectedDevices = this.webSocketService.connectedDevices;
  }
}
