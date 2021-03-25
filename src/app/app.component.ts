
import { Component, OnInit, OnChanges, SimpleChanges } from '@angular/core';


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnChanges {
  title = 'webRtcMixer';

  public constructor() {

  }

  ngOnInit() {}

  ngOnChanges(changes: SimpleChanges): void {}
}
