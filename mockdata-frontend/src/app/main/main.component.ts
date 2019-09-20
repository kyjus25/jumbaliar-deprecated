import { Component, OnInit } from '@angular/core';
import {HttpClient} from '@angular/common/http';

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.css']
})
export class MainComponent implements OnInit {
  public disableSave = false;
  public editorOptions = {theme: 'vs-dark', language: 'json'};
  public code: string= '{\n\n}';
  public endpoints;
  public modalPayload;
  public display: boolean = false;
  public path: string;
  public method = 'get';
  public methods = [
    {label: 'GET', value: 'get'},
    {label: 'POST', value: 'post'},
    {label: 'DELETE', value: 'delete'},
    {label: 'PUT', value: 'put'}
  ];

  constructor(private http: HttpClient) {
    this.http.get('http://localhost:8081/data').subscribe(res => {
      this.endpoints = res;
    });
  }

  ngOnInit() {
  }

  public showObject(rowData) {
    this.modalPayload = rowData;
    this.code = JSON.stringify(rowData.body, null, "   ");
    this.display = true;
  }

  public addEndpoint() {
    this.display = true;
    this.modalPayload = null;
    this.path = null;
    this.method = 'get';
  }

  public saveObject() {
    this.modalPayload.body = JSON.parse(this.code);
    this.modalPayload.action = 'update';
    this.http.post('http://localhost:8081/data', this.modalPayload).subscribe(res => {
      this.endpoints = res;
      this.display = false;
    });
  }

  public saveEndpoint() {
    const payload = {
      path: this.path,
      method: this.method,
      action: 'add',
      body: {}
    };

    this.http.post('http://localhost:8081/data', payload).subscribe(res => {
      this.endpoints = res;
      this.display = false;
    });
  }

  public delete(endpoint) {
    endpoint.action = 'delete';
    this.http.post('http://localhost:8081/data', endpoint).subscribe(res => {
      this.endpoints = res;
    });
  }

  public checkMonaco() {
    try {
      JSON.parse(this.code);
    } catch (e) {
      return true;
    }
    return false;
  }
}
