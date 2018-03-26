import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule } from '@angular/forms'
import { AngularDraggableModule } from 'angular2-draggable';

import { AppComponent } from './app.component';
import { GameComponent } from './game/game.component';

import { BdbService } from './bdb.service';
import { IotaService } from './iota.service';
import { LoginComponent } from './login/login.component';
import { GameoverComponent } from './gameover/gameover.component';

const appRoutes: Routes = [
  { path: '', component: LoginComponent, pathMatch: 'full' },
  { path: 'game', component: GameComponent },
  { path: 'gameover', component: GameoverComponent }
];

@NgModule({
  declarations: [
    AppComponent,
    GameComponent,
    LoginComponent,
    GameoverComponent
  ],
  imports: [
    BrowserModule,
    RouterModule.forRoot(appRoutes),
    FormsModule,
    AngularDraggableModule
  ],
  providers: [
    BdbService,
    IotaService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
