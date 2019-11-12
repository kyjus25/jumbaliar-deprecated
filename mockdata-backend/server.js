const express = require('express');
const child_process = require('child_process');
const app = express();
const port = 80;
const base = '/services';
const bodyParser = require('body-parser');
const cors = require("cors");
const fs = require('fs');

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

const config = require('./config.json');

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.get('/data', (req, res) => res.send(config));
app.post('/data', (req, res) => {
  switch(req.body.action) {
    case 'update':
      for (let i = 0; i < config.length; i++) {
        if (config[i].path === req.body.path && config[i].method === req.body.method) {
          config[i].body = req.body.body;
        }
      }
      break;
    case 'add':
      const create = {
        path: req.body.path,
        method: req.body.method,
        body: req.body.body
      };
      config.push(create);
      break;
    case 'delete':
      for (let i = 0; i < config.length; i++) {
        if (config[i].path === req.body.path && config[i].method === req.body.method) {
          config.splice(i, 1);
        }
      }
      break;
  }

  saveAndRestart(config);
  res.send(config);
});

function saveAndRestart(config) {
  fs.writeFile(__dirname + "/config.json", JSON.stringify(config), function(err) {
    if(err) {
      return console.log(err);
    }
    restartServer();
  });
}

function saveConfig(config) {
  fs.writeFile(__dirname + "/config.json", JSON.stringify(config), function(err) {
    if(err) {
      return console.log(err);
    }
  });
}

function restartServer() {
  buildEndpoints();
  // server.close();
  // child_process.exec('pm2 restart server.js', function(error, stdout, stderr){
  //   console.log(error);
  // });
  // process.exit();
}

function readCrud(index, id) {
  const toSend = config[index].body.find(item => {
    return Object.keys(item).findIndex(key => item[key] === id) > -1;
  });
  if (toSend) {
    return parseBody(toSend);
  } else {
    return {status: 404}
  }
}

function createCrud(index, body) {
  body['id'] = uuid();
  body['createdBy'] = 'JumbaLiar';
  body['createdOn'] = Date.now();
  body['versionId'] = uuid();
  body['updatedBy'] = 'JumbaLiar';
  body['updatedOn'] = Date.now();
  config[index].body.push(body);
  saveConfig(config);
  return body;
}

function updateCrud(index, id, body) {
  body['versionId'] = uuid();
  body['updatedBy'] = 'JumbaLiar';
  body['updatedOn'] = Date.now();
  const toUpdate = config[index].body.find(item => {
    return Object.keys(item).findIndex(key => item[key] === id) > -1;
  });
  toUpdate ? Object.assign(toUpdate, body) : null;
  saveConfig(config);
  return toUpdate;
}

function deleteCrud(index, id) {
  const toDelete = config[index].body.findIndex(item => {
    return Object.keys(item).findIndex(key => item[key] === id) > -1;
  });
  toDelete > -1 ? config[index].body.splice(toDelete, 1) : null;
  saveConfig(config);
  return {'status': '200'};
}

function parseBody(body) {
  try {
    body.forEach(item => {
      parseItem(item);
    });
  } catch (e) {
    parseItem(body);
  }
  return body;
}

function parseItem(item) {
  Object.keys(item).forEach(key => {
    const regex = item[key].toString().match('\{{.*?\}}');
    if (regex && regex[0]) {
      const dto = regex[0].replace('{{','').replace('}}','').split('[')[0];
      const hasIndex = regex[0].replace('{{','').replace('}}','').split('[')[1];
      const index = hasIndex ? hasIndex.split(']')[0] : undefined;
      const dtoKey = regex[0].replace('{{','').replace('}}','').split('.')[1];

      const endpointBody = config.find(endpoint => endpoint.path === dto && (endpoint.method === 'full' || endpoint.method === 'get')).body;
      const object = index ? endpointBody[index] : endpointBody;
      const value = dtoKey ? object[dtoKey] : object;
      item[key] = value;
    }
  });
}

function buildEndpoints() {
  for (let i = 0; i < config.length; i++) {
    if (config[i].method === 'full') {
      app['get'](base + '/' + config[i].path, (req, res) => res.send(parseBody(config[i].body)));
      app['get'](base + '/' + config[i].path + '/:id', (req, res) => res.send(readCrud(i, req.params.id)));
      app['post'](base + '/' + config[i].path, (req, res) => res.send(createCrud(i, req.body)));
      app['put'](base + '/' + config[i].path + '/:id', (req, res) => res.send(updateCrud(i, req.params.id, req.body)));
      app['delete'](base + '/' + config[i].path + '/:id', (req, res) => res.send(deleteCrud(i, req.params.id)));
    } else if (config[i].method === 'get') {
      app[config[i].method](base + '/' + config[i].path, (req, res) => config[i] ? res.send(parseBody(config[i].body)) : res.status(404).send({'status': 404}));
    } else {
      app[config[i].method](base + '/' + config[i].path, (req, res) => config[i] ? res.send(config[i].body) : res.status(404).send({'status': 404}));
    }
  }
}

buildEndpoints();
const server = app.listen(port, () => console.log(`Mock data server listening on port ${port}!`));
