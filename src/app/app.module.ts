import { WebSocketService } from './services/web-socket.service';
import { DeviceTableComponent } from './device-table/device-table.component';
import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { AppComponent } from './app.component';
import { StreamComponent } from './stream/stream.component';
import { ConnectionListComponent } from './connection-list/connection-list.component';
import { WatchComponent } from './watch/watch.component';
import { MixerComponent } from './mixer/mixer.component';

const routes: Routes = [
  { path: 'setup', component: MixerComponent },
  { path: '', redirectTo: '/setup', pathMatch: 'full' },
  { path: 'watch', component: WatchComponent },
];

@NgModule({
  declarations: [
    AppComponent,
    DeviceTableComponent,
    StreamComponent,
    ConnectionListComponent,
    WatchComponent,
    MixerComponent
  ],
  imports: [
    BrowserModule,
    ReactiveFormsModule,
    RouterModule.forRoot(routes),
  ],
  providers: [WebSocketService],
  bootstrap: [AppComponent]
})
export class AppModule { }
