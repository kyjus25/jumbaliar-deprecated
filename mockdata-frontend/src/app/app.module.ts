import {BrowserModule} from '@angular/platform-browser';
import {NgModule} from '@angular/core';

import {AppRoutingModule} from './app-routing.module';
import {AppComponent} from './app.component';
import {MainComponent} from './main/main.component';
import {MonacoEditorModule} from 'ngx-monaco-editor';
import {FormsModule} from '@angular/forms';
import {TableModule} from 'primeng/table';
import {ButtonModule} from 'primeng/button';
import {HttpClientModule} from '@angular/common/http';
import {DialogModule} from 'primeng/dialog';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {DropdownModule, PanelModule, ConfirmationService, ConfirmDialogModule, MessageService} from 'primeng/primeng';
import {MultiSelectModule} from 'primeng/multiselect';
import {ToastModule} from 'primeng/toast';

@NgModule({
  declarations: [
    AppComponent,
    MainComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    MonacoEditorModule.forRoot(),
    FormsModule,
    TableModule,
    ButtonModule,
    BrowserAnimationsModule,
    HttpClientModule,
    DialogModule,
    DropdownModule,
    PanelModule,
    ConfirmDialogModule,
    MultiSelectModule,
    ToastModule
  ],
  providers: [
    ConfirmationService,
    MessageService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
