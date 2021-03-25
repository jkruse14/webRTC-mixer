import { RtcService } from './../services/rtc.service';
import { WebSocketService, ConnectionType, ConnectedDevices } from './../services/web-socket.service';
import { Component, OnInit, Input, OnChanges } from '@angular/core';
import rtcService from '../services/rtc.service';

@Component({
  selector: 'app-connection-list',
  templateUrl: './connection-list.component.html',
  styleUrls: ['./connection-list.component.scss']
})
export class ConnectionListComponent implements OnInit, OnChanges {
  @Input() connections: Array<ConnectedDevices>;
  @Input() webSocketService: WebSocketService;
  @Input() rtcService: RtcService;
  @Input() type: ConnectionType;
  filteredConnections: Array<ConnectedDevices>;
  constructor() {
    this.filteredConnections = [];
  }

  ngOnInit(): void {
    // this.getConnections();
  }

  ngOnChanges(changes): void {
    if (changes.connections?.currentValue) {
      this.connections = changes.connections.currentValue;
      this.filteredConnections = this.getConnections();
    }
  }

  async addToMixer(targetId: string, name: string) {
    const mediaContraints = {
      audio: true,
      video: true,
    };
    if (targetId === this.webSocketService.getLocalWebSocketConnection().id) {
      console.log('Nope. Don\'t add your own stream.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia(mediaContraints);
      await rtcService.createPeerConnection(targetId, name);
      stream.getTracks().forEach(
         track => {
           rtcService.getLocalPeerConnections()[targetId].addTrack(track);
          //  rtcService.getLocalPeerConnection().addTransceiver(track, { streams: [stream] });
          });
    } catch (e) {
      this.handleGetUserMediaError(e);
    }
  }

  public getConnections(): Array<ConnectedDevices> {
    switch (this.type) {
    case ConnectionType.VIEWER:
      return this.connections.filter(c => c.type === ConnectionType.MIXER);
    default:
      // return this.connections.filter(c => c.type !== ConnectionType.VIEWER);
      return this.connections;
    }
  }

  private handleGetUserMediaError(e) {
    switch (e.name) {
      case 'NotFoundError':
        alert('Unable to open your call because no camera and/or microphone were found.');
        break;
      case 'SecurityError':
      case 'PermissionDeniedError':
        // Do nothing; this is the same as the user canceling the call.
        break;
      default:
        alert(`Error opening your camera and/or microphone: ${e.message}`);
        break;
    }
  }
}
