import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-device-table',
  templateUrl: './device-table.component.html',
  styleUrls: ['./device-table.component.scss']
})
export class DeviceTableComponent implements OnInit {
  devices: MediaDeviceInfo[];
  constructor() { }

  async ngOnInit() {
    this.devices = await this.getConnectedDevices();
    navigator.mediaDevices.addEventListener('devicechange', async (event) => {
      this.devices = await this.getConnectedDevices();
    });
  }

  private async getConnectedDevices(): Promise<MediaDeviceInfo[]> {
    return navigator.mediaDevices.enumerateDevices();
  }

}
