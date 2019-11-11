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

  saveConfig(config);
  res.send(config);
});

function saveConfig(config) {
  fs.writeFile(__dirname + "/config.json", JSON.stringify(config), function(err) {
    if(err) {
      return console.log(err);
    }
    restartServer();
  });
}

function restartServer() {
  server.close();
  child_process.exec('pm2 restart server.js', function(error, stdout, stderr){
    console.log(error);
  });
  process.exit();
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
  const toUpdate = config[index].body.find(obj => obj.id === id);
  Object.assign(toUpdate, body);
  saveConfig(config);
  return body;
}

function deleteCrud(index, id) {
  const toDelete = config[index].body.findIndex(obj => obj.id === id);
  config[index].body.splice(toDelete, 1);
  saveConfig(config);
  return {'status': '200'};
}

for (let i = 0; i < config.length; i++) {
  if (config[i].method === 'full') {
    app['get'](base + '/' + config[i].path, (req, res) => res.send(config[i].body));
    app['post'](base + '/' + config[i].path, (req, res) => res.send(createCrud(i, req.body)));
    app['put'](base + '/' + config[i].path + '/:id', (req, res) => res.send(updateCrud(i, req.params.id, req.body)));
    app['delete'](base + '/' + config[i].path + '/:id', (req, res) => res.send(deleteCrud(i, req.params.id)));
  } else {
    app[config[i].method](base + '/' + config[i].path, (req, res) => res.send(config[i].body));
  }
}

const server = app.listen(port, () => console.log(`Mock data server listening on port ${port}!`));
