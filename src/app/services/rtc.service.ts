import webSocketService, { MixerW3CWebSocket } from './web-socket.service';
import { ApplicationRef, Injectable, QueryList } from '@angular/core';
import { environment } from './../../environments/environment';
import Logger from 'src/logger';

export const VIDEO_ANSWER = 'video-answer';
export const VIDEO_OFFER = 'video-offer';
export const NEW_ICE_CANDIDATE = 'new-ice-candidate';
export const HANG_UP = 'hang-up';

enum ConnectionType {
  MIXER = 'mixer',
  FEED = 'feed',
  VIEWER = 'viewer',
}

export interface VideoAnswerMessage {
  name: string;
  targetId: string;
  senderId: string;
  type: string;
  sdp: RTCSessionDescriptionInit;
}

export interface VideoOfferMessage {
  senderId: string;
  targetId: string;
  type: string;
  sdp: RTCSessionDescription;
}

export interface NewICECandidateMessage {
  type: string;
  targetId: string;
  candidate: RTCIceCandidate;
  senderId: string;
}

export interface HangUpMessage {
  senderId: string;
  targetId: string;
  type: string;
}

// the key is the id of the remote websocket connection which will
// send messages to this PeerConnection's remote counterpart
export interface PeerConnectionMap {
  [key: string]: RTCPeerConnection;
}

export interface MediaStreamTrackWithStreamId extends MediaStreamTrack {
  mediaStreamId: string;
}

@Injectable({
  providedIn: 'root'
})
export class RtcService {
  private localPeerConnections: PeerConnectionMap;
  private localWebSocketConnection: MixerW3CWebSocket;
  private activeStream: MediaStream;
  trackIds: QueryList<string>;
  constructor() {
    this.localPeerConnections = {};
    this.activeStream = new MediaStream();

    this.trackIds = new QueryList<string>();
    this.trackIds.changes.subscribe(() => {
      console.log('track ids changed');
      this.trackIds.reset(this.trackIds.toArray());
    });
  }

  public setLocalWebSocketConnection(connection: MixerW3CWebSocket): void {
    this.localWebSocketConnection = connection;
  }

  public getLocalWebSocketConnection(): MixerW3CWebSocket {
    return this.localWebSocketConnection;
  }

  public getLocalPeerConnections(): PeerConnectionMap {
    return this.localPeerConnections;
  }

  public async createPeerConnection(targetId: string, targetName: string): Promise<RTCPeerConnection> {
    console.log('creating peer connection');
    const conn = new RTCPeerConnection({
      iceServers: [
        {
          // This is an array of objects describing STUN and/or TURN servers for
          // the ICE layer to use when attempting to establish a route between
          // the caller and the callee. These servers are used to determine the
          // best route and protocols to use when communicating between the peers,
          // even if they're behind a firewall or using NAT.
          urls: environment.TURN_SERVER_URI,
          // can add username + credential if auth is needed
          username: '1599763535',
          credential: 'vgeuDQ+cQEhfxE+1Sw2Iu7Era/M=',
        }]
    });

    switch (this.localWebSocketConnection.type) {
    case ConnectionType.FEED:
      conn.getTransceivers().forEach(t => t.direction = 'sendonly');
      break;
    case ConnectionType.VIEWER:
      conn.getTransceivers().forEach(t => t.direction = 'recvonly');
      break;
    }

    // required
    conn.onicecandidate = (event) => this.handleICECandidateEvent(event, targetId);
    // required
    conn.ontrack = (event) => this.handleTrackEvent(event, targetId, targetName);
    // required
    conn.onnegotiationneeded = () => this.handleNegotiationNeededEvent(conn, targetId, targetName);
    // localPeer.onremovetrack = this.handleRemoveTrackEvent;
    // localPeer.oniceconnectionstatechange = this.handleICEConnectionStateChangeEvent;
    // localPeer.onicegatheringstatechange = this.handleICEGatheringStateChangeEvent;
    // localPeer.onsignalingstatechange = this.handleSignalingStateChangeEvent;
    conn.onconnectionstatechange = (event) => {
      // console.log('connection state change');
      console.log('state:', conn.connectionState);
      // console.log('csc event', event);
    };

    const mediaContraints = {
      audio: true,
      video: true,
    };
    const localStream = await navigator.mediaDevices.getUserMedia(mediaContraints);
    localStream.getTracks().forEach(track => {
      conn.addTrack(track, localStream);
      // this.localPeerConnection.addTransceiver(track, { streams: [localStream] });
    });
    this.localPeerConnections[targetId] = conn;
    return conn;
  }

  public async handleNegotiationNeededEvent(
    localPeerConnection: RTCPeerConnection,
    targetId: string,
    targetName: string,
  ): Promise<void> {
    console.log('negotiation needed');
    try {
      // If the connection hasn't yet achieved the "stable" state,
      // return to the caller. Another negotiationneeded event
      // will be fired when the state stabilizes.
      if (localPeerConnection.signalingState !== 'stable') {
        Logger.info(`The connection isn't stable yet; postponing...`);
        return;
      }
      const offer = await localPeerConnection.createOffer();
      console.log('setting local description in negotiationneeded');
      await localPeerConnection.setLocalDescription(offer);
      this.localWebSocketConnection.send(JSON.stringify({
        senderId: this.localWebSocketConnection.id,
        targetId,
        name: targetName,
        type: VIDEO_OFFER,
        sdp: localPeerConnection.localDescription,
      }));
    } catch (error) {
      Logger.error(`Error during negotiation: ${error.message} ${(error as Error).stack}`);
    }
  }

  public async handleVideoOfferMessage(message): Promise<VideoAnswerMessage | undefined> {
    console.log('handleVideoOfferMessage');
    let localPeerConnection = this.localPeerConnections[message.senderId];
    try {
      if (!localPeerConnection) {
        localPeerConnection = await this.createPeerConnection(message.senderId, message.name);
      }
      // Set the remote description to the received SDP offer
      // so this local WebRTC layer knows how to talk to the caller
      const desc = new RTCSessionDescription(message.sdp);
      if (localPeerConnection?.signalingState !== 'stable') {
        Logger.info(`Signaling state isn't stable, triggering rollback`);

        // Set the local and remove descriptions for rollback; don't proceed
        // until both return.
        await localPeerConnection.setLocalDescription({type: 'rollback'});
        await localPeerConnection.setRemoteDescription(desc);
        return;
      }

      const targetId = message.senderId;
      await localPeerConnection.setRemoteDescription(desc);
      // const mediaContraints = {
      //   audio: true,
      //   video: true,
      // };
      // const localStream = await navigator.mediaDevices.getUserMedia(mediaContraints);
      // localStream.getTracks().forEach(track => {
      //   this.localPeerConnection.addTrack(track, localStream);
      //   // this.localPeerConnection.addTransceiver(track, { streams: [localStream] });
      // });

      const answer = await localPeerConnection.createAnswer();
      console.log('setting local description in handlevideooffer');
      await localPeerConnection.setLocalDescription(answer);

      return {
        name: this.localWebSocketConnection.name,
        senderId: this.localWebSocketConnection.id,
        targetId,
        type: VIDEO_ANSWER,
        sdp: localPeerConnection.localDescription,
      };
    } catch (error) {
      this.handleGetUserMediaError(error);
    }
  }

  public async handleVideoAnswerMessage(message): Promise<void> {
    const localPeerConnection = this.localPeerConnections[message.senderId];
    if (localPeerConnection.signalingState  !== 'have-local-offer') {
      Logger.info(`The connection isn't 'have-local-offer' yet; postponing video answer`);
      return;
    }
    try {
      const desc = new RTCSessionDescription(message.sdp);
      console.log('decription type: ', desc.type);
      await localPeerConnection.setRemoteDescription(desc);
      console.log('answered!');
    } catch (e) {
      Logger.error(`Error ${e.name}: ${e.message}`);
    }
  }

  private handleICECandidateEvent(event: RTCPeerConnectionIceEvent, targetId: string): NewICECandidateMessage {
    if (event.candidate) {
      return {
        type: NEW_ICE_CANDIDATE,
        targetId,
        candidate: event.candidate,
        senderId: this.localWebSocketConnection.id,
      };
    }
  }

  public async handleNewICECandidateMessage(message): Promise<void> {
    const candidate = new RTCIceCandidate(message.candidate);
    try {
      await this.localPeerConnections[message.senderId].addIceCandidate(candidate);
    } catch (e) {
      Logger.error(`Error handling new ICE candidate: ${e.message}`);
    }
  }

  private handleTrackEvent(event: RTCTrackEvent, targetId: string, targetName: string): void {
    console.log('handle add track');
    const newTrackIds: Array<string> = [];
    event.streams.map(s => s.getTracks().forEach(t => newTrackIds.push(t.id)));
    // event.streams.map(stream => newTracks[`${stream.id}`] = { stream,  name: targetName, active: false, targetId });
    this.trackIds.reset([...this.trackIds, ...newTrackIds]);
    event.streams.map(
      stream => stream.getTracks().forEach(t => {
        (t as MediaStreamTrackWithStreamId).mediaStreamId = stream.id;
        // the mixer gets multiple tracks. Disable them to select an output stream
        if (this.localWebSocketConnection.type === ConnectionType.MIXER) {
          t.enabled = false;
        }
        this.activeStream.addTrack(t);
      }));
  }

  public getTracks(): any {
    return this.activeStream.getTracks();
  }

  public getTrackIds(): Array<string> {
    return this.activeStream.getTracks().map(t => t.id);
  }

  public getActiveStream(): MediaStream {
    return this.activeStream;
  }

  public setActiveTacksByStreamId(streamId: string): void {
    this.activeStream.getTracks()
      .forEach((t: MediaStreamTrackWithStreamId) => {
        if (t.mediaStreamId === streamId) {
          t.enabled = true;
        } else {
          t.enabled = false;
        }
    });
  }

  public disableTrack(trackId: string): void {
    this.activeStream.getTrackById(trackId).enabled = false;
  }

  public hangUp(targetId: string): HangUpMessage {
    // shut down, reset the connection, and release resources
    this.closeRtcConnection(this.localPeerConnections[targetId]);
    return {
      targetId,
      senderId: this.localWebSocketConnection.id,
      type: HANG_UP,
    };
  }

  private closeRtcConnection(localPeerConnection): void {
    if (localPeerConnection) {
      localPeerConnection.ontrack = null;
      // this.localPeerConnection.removetrack = null;
      // this.localPeerConnection.removestream = null;
      localPeerConnection.onicecandidate = null;
      localPeerConnection.oniceconnectionstatechange = null;
      localPeerConnection.onsignalingstatechange = null;
      localPeerConnection.onicegatheringstatechange = null;
      localPeerConnection.onnegotiationneeded = null;

      localPeerConnection.close();
      localPeerConnection = null;
    }
  }

  private handleICEConnectionStateChangeEvent(event, localPeerConnection): void {
    switch (localPeerConnection.iceConnectionState) {
      // NOTE: We don't watch the disconnected signaling state here as it can
      // indicate temporary issues and may go back to a connected state after
      // some time. Watching it would close the video call on any temporary
      // network issue.
      case 'closed':
      case 'failed':
        this.closeRtcConnection(localPeerConnection);
        break;
    }
  }

  private handleSignalingStateChangeEvent(event, localPeerConnection): void {
    // Note: The closed signaling state has been deprecated in favor of the closed
    // iceConnectionState. We are watching for it here to add a bit of backward
    // compatibility.
    switch (localPeerConnection.signalingState) {
      case 'closed':
        this.closeRtcConnection(localPeerConnection);
        break;
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

export default new RtcService();
