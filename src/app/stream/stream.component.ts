import Logger from '../../logger';
import rtcService, { MediaStreamTrackWithStreamId } from './../services/rtc.service';
import { Component, OnInit, ElementRef, AfterViewInit, ViewChild, Input,
  OnChanges, OnDestroy, ViewChildren, QueryList } from '@angular/core';
import { ConnectionType } from '../services/web-socket.service';
// import rtcService from '../services/rtc.service';

@Component({
  selector: 'app-stream',
  templateUrl: './stream.component.html',
  styleUrls: ['./stream.component.scss'],
})
export class StreamComponent implements OnInit, AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('activeStream') activeStream: ElementRef;
  @ViewChildren('video') videoElements: QueryList<ElementRef>;
  @Input() stream: MediaStream;
  @Input() type: ConnectionType;
  @Input() tracks: QueryList<string>;
  uniqueStreamIds: Array<string>;
  constructor() {
  }

  ngOnInit(): void {}

  ngOnDestroy() {
    // this.connectedStreamsSub.unsubscribe();
    // this.connectedStreams = {};
    // TODO: shut down RTCPeerConnection
    // closeConnection(id)
  }

  async ngAfterViewInit() {
    if (this.type === ConnectionType.FEED) {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      this.activeStream.nativeElement.srcObject = stream;
      return;
    }

    if (this.type === ConnectionType.VIEWER) {
      console.log('viewer stream active?', this.stream.active);
      this.stream.getTracks().forEach(t => { t.enabled = true; });
      this.activeStream.nativeElement.srcObject = rtcService.getActiveStream();
      return;
    }

    this.activeStream.nativeElement.srcObject = rtcService.getActiveStream();
    // if (this.type === ConnectionType.MIXER) {
    this.videoElements.changes.subscribe(() => {
      this.videoElements.toArray().forEach(v => {
        if (!v.nativeElement.srcObject) {
          const tracks = this.stream.getTracks()
            .filter((t: MediaStreamTrackWithStreamId) => t.mediaStreamId === v.nativeElement.id)
            .map(t => {
              const newT = t.clone();
              newT.enabled = true;
              return newT;
            });
          const newStream = new MediaStream(tracks);
          v.nativeElement.srcObject = newStream;
        }
      });
    });
  }

  async ngOnChanges(changes) {
    console.log('STREAM changes: ', changes);
    if (changes.tracks?.currentValue && this.type === ConnectionType.MIXER) {
      if (!this.uniqueStreamIds) {
        this.uniqueStreamIds = [];
      }
      this.stream.getTracks().forEach((t: MediaStreamTrackWithStreamId) => {
        if (!this.uniqueStreamIds.includes(t.mediaStreamId)) {
          this.uniqueStreamIds.push(t.mediaStreamId);
        }
      });
      if (this.activeStream?.nativeElement?.srcObject?.load) {
        this.activeStream.nativeElement.srcObject.load();
        await this.activeStream.nativeElement.srcObject.play();
      }
    }

    if (changes.tracks?.currentValue && this.type === ConnectionType.VIEWER && this.activeStream?.nativeElement) {
      console.log('viewer stream active?', this.stream.active);
      rtcService.getActiveStream().getTracks().forEach(t => {
        console.log('track enabled', t.enabled);
        t.enabled = true;
      });
      this.activeStream.nativeElement.srcObject = rtcService.getActiveStream();
      return;
    }
  }

  async setActiveStream(id: string): Promise<void> {
    console.log('setActiveStream clicked');
    rtcService.setActiveTacksByStreamId(id);
    this.activeStream.nativeElement.srcObject = rtcService.getActiveStream();
  }

  deactivateStream(): void {
    (this.activeStream.nativeElement.srcObject as MediaStream)
      .getTracks().forEach(t => {
        // t.stop();
        this.activeStream.nativeElement.srcObject.removeTrack(t);
      });
  }
}
