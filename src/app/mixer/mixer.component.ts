import rtcService, { RtcService } from '../services/rtc.service';
import { WebSocketService, MixerW3CWebSocket, ConnectionType } from '../services/web-socket.service';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';

@Component({
  selector: 'app-mixer',
  templateUrl: './mixer.component.html',
  styleUrls: ['./mixer.component.scss']
})
export class MixerComponent implements OnInit {
  isMixer: boolean;
  connectedStreams: { [key: string]: MediaStream };
  connectedDevices: Array<{id: string, name: string}> = [];
  websocketService: WebSocketService;
  connection;
  rtcService: RtcService = rtcService;
  connectionOptions = [];
  selectedType = '';
  setupForm: FormGroup;

  constructor(private webSocketService: WebSocketService, private formBuilder: FormBuilder) {
    this.websocketService = webSocketService;

    this.setupForm = this.formBuilder.group({
      connectionOptions: [''],
      connectionName: '',
    });

    this.connectionOptions = [
      { name: 'Select a Connection Type', value: '', selected: true },
      { name: ConnectionType.MIXER, value: ConnectionType.MIXER },
      { name: ConnectionType.FEED, value: ConnectionType.FEED },
    ];
  }

  ngOnInit(): void {}

  async createConnection(setupForm: FormGroup) {
    const c = await this.websocketService.createConnection({
      type: setupForm.controls.connectionOptions.value,
      name: setupForm.controls.connectionName.value,
    });
    this.webSocketService.setLocalConnection(c);
    this.connectedStreams = this.websocketService.connectedStreams;
    this.connectedDevices = this.websocketService.connectedDevices;
  }

  public hideForm(): boolean {
    const id = this.webSocketService.getLocalWebSocketConnection()?.id;
    return id && this.websocketService.connectedDevices.map(c => c.id).includes(id);
  }

}
