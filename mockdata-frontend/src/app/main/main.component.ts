import {Component, OnInit} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {ConfirmationService} from 'primeng/primeng';

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.scss']
})
export class MainComponent implements OnInit {
  public disableSave = false;
  public editorOptions = {theme: 'vs-dark', language: 'json'};
  public code = '{\n\n}';
  public endpoints;
  public modalPayload;
  public display = false;
  public path: string;
  public method = 'full';
  public methods = [
    {label: 'FULL', value: 'full'},
    {label: 'GET', value: 'get'},
    {label: 'POST', value: 'post'},
    {label: 'DELETE', value: 'delete'},
    {label: 'PUT', value: 'put'}
  ];
  cols: any[];

  constructor(
    private http: HttpClient,
    private confirmationService: ConfirmationService
  ) {
    this.http.get('http://localhost/data').subscribe(res => {
      this.endpoints = res;
    });
  }

  ngOnInit() {
    this.cols = [
      { field: 'path', header: 'Path' },
      { field: 'method', header: 'Method' }
    ];
  }

  public showObject(rowData) {
    this.modalPayload = rowData;
    this.code = JSON.stringify(rowData.body, null, '   ');
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
    this.http.post('http://localhost/data', this.modalPayload).subscribe(res => {
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

    this.http.post('http://localhost/data', payload).subscribe(res => {
      this.endpoints = res;
      this.display = false;
    });
  }

  public delete(endpoint) {
    this.confirmationService.confirm({
      message: 'Are you sure you want to delete this endpoint?',
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      accept: () => {
        endpoint.action = 'delete';
        this.http.post('http://localhost/data', endpoint).subscribe(res => {
          this.endpoints = res;
        });
      }
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
