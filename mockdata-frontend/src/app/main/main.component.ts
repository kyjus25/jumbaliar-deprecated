import {Component, OnInit} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {ConfirmationService, MessageService, SelectItem} from 'primeng/primeng';

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.scss']
})
export class MainComponent implements OnInit {
  public disableSave = false;
  public editorOptions = {theme: 'vs-dark', language: 'json'};
  public code = '[\n\n]';
  public endpoints;
  public modalPayload;
  public display = false;

  public path: string;
  public method = 'full';
  public creator: string = this.toTitleCase(window['env']['creators'].split(',')[0]);
  public usedBy;

  public creators: SelectItem[] = [];
  public frontends: SelectItem[] = [];
  public methods: SelectItem[] = [
    {label: 'FULL', value: 'full'},
    {label: 'GET', value: 'get'},
    {label: 'POST', value: 'post'},
    {label: 'DELETE', value: 'delete'},
    {label: 'PUT', value: 'put'}
  ];
  cols: any[];

  constructor(
    private http: HttpClient,
    private confirmationService: ConfirmationService,
    private messageService: MessageService
  ) {
    window['env']['creators'].split(',').forEach(element => {
      this.creators.push({
        label: this.toTitleCase(element),
        value: element
      });
    });

    window['env']['frontends'].split(',').forEach(element => {
      this.frontends.push({
        label: this.toTitleCase(element),
        value: element
      });
    });

    this.http.get(window['env']['backendUrl'] + '/data').subscribe(res => {
      this.endpoints = res;
    });
  }

  ngOnInit() {
    this.cols = [
      { field: 'path', header: 'Path' },
      { field: 'method', header: 'Method' },
      { field: 'creator', header: 'Creator' },
      { field: 'usedBy', header: 'Used By:' }
    ];
  }

  private toTitleCase(str): string {
    return str.replace(
      /\w\S*/g,
      (txt) => {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
      }
    );
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
    this.http.post(window['env']['backendUrl'] + '/data', this.modalPayload).subscribe(res => {
      this.endpoints = res;
      this.display = false;
    });
  }

  public saveEndpoint() {
    const payload = {
      path: this.path,
      method: this.method,
      creator: this.creator,
      usedBy: this.usedBy,
      action: 'add',
      body: []
    };

    this.http.post(window['env']['backendUrl'] + '/data', payload).subscribe(
      res => {
        this.endpoints = res;
        this.display = false;
      },
      err => {
        this.display = false;
        this.messageService.add(
          {
            key: 'createConflictError',
            severity: 'error',
            summary: '409 CONFLICT - Cannot Create',
            detail: 'An endpoint alreday exists for that Path-Method combination!'
          }
        );
      }
    );
  }

  public delete(endpoint) {
    this.confirmationService.confirm({
      message: 'Are you sure you want to delete this endpoint?',
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      accept: () => {
        endpoint.action = 'delete';
        this.http.post(window['env']['backendUrl'] + '/data', endpoint).subscribe(res => {
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
