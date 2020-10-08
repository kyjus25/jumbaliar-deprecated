const express = require('express');
const child_process = require('child_process');
const app = express();
const port = 80;
const base = '/services';
const bodyParser = require('body-parser');
const cors = require("cors");
const fs = require('fs');
const axios = require('axios');
const https = require('https');

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

let config = [];
try { config = require('./config.json') } catch (e) { console.error('No config file detected. Please pass one in.'); }
let proxy = [];
try { proxy = require('./proxy.json') } catch (e) { console.log('No proxy file detected.'); }

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
    server.close();
    process.exit();
  });
}

function saveConfig(config) {
  fs.writeFile(__dirname + "/config.json", JSON.stringify(config), function(err) {
    if(err) {
      return console.log(err);
    }
  });
}

function readCrud(index, id, req, res) {
  const toSend = config[index].body.find(item => {
    return Object.keys(item).findIndex(key => item[key] === id) > -1;
  });
  if (toSend) {
    parseBody(toSend, req, res);
  } else {
    checkProxy(req, res);
  }
}

function createCrud(index, body, req, res) {
  body['id'] = uuid();
  body['createdBy'] = 'JumbaLiar';
  body['createdOn'] = Date.now();
  body['versionId'] = uuid();
  body['updatedBy'] = 'JumbaLiar';
  body['updatedOn'] = Date.now();
  config[index].body.push(body);
  saveConfig(config);
  body ? res.send(body) : checkProxy(req, res);
}

function updateCrud(index, id, body, req, res) {
  body['versionId'] = uuid();
  body['updatedBy'] = 'JumbaLiar';
  body['updatedOn'] = Date.now();
  const toUpdate = config[index].body.find(item => {
    return Object.keys(item).findIndex(key => item[key] === id) > -1;
  });
  toUpdate ? Object.assign(toUpdate, body) : null;
  saveConfig(config);
  toUpdate ? res.send(toUpdate) : checkProxy(req, res);
}

function deleteCrud(index, id, req, res) {
  const toDelete = config[index].body.findIndex(item => {
    return Object.keys(item).findIndex(key => item[key] === id) > -1;
  });
  toDelete > -1 ? config[index].body.splice(toDelete, 1) : null;
  saveConfig(config);
  toDelete > -1 ? res.send({status: 200}) : checkProxy(req, res);
}

function parseBody(body, req, res) {
  if (body) {
    try {
      body.forEach(item => {
        parseItem(item);
      });
    } catch (e) {
      parseItem(body);
    }
    res.send(body);
  } else {
    checkProxy(req, res);
  }
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

for (let i = 0; i < config.length; i++) {
  if (config[i].method === 'full') {
    app['get'](base + '/' + config[i].path, (req, res) => parseBody(config[i].body, req, res));
    app['get'](base + '/' + config[i].path + '/:id', (req, res) => readCrud(i, req.params.id, req, res));
    app['post'](base + '/' + config[i].path, (req, res) => createCrud(i, req.body, req, res));
    app['put'](base + '/' + config[i].path + '/:id', (req, res) => updateCrud(i, req.params.id, req.body, req, res));
    app['delete'](base + '/' + config[i].path + '/:id', (req, res) => deleteCrud(i, req.params.id, req, res));
  } else if (config[i].method === 'get') {
    app[config[i].method](base + '/' + config[i].path, (req, res) => parseBody(config[i]['body'], req, res));
  } else {
    app[config[i].method](base + '/' + config[i].path, (req, res) => config[i] ? res.send(config[i].body) : checkProxy(req, res));
  }
}

// THE 404 ROUTE
app.get('*', function(req, res){ checkProxy(req, res); });
app.post('*', function(req, res){ checkProxy(req, res); });
app.put('*', function(req, res){ checkProxy(req, res); });
app.delete('*', function(req, res){ checkProxy(req, res); });
app.options('*', function(req, res){ checkProxy(req, res); });



function checkProxy(req, res) {
  const agent = new https.Agent({
    rejectUnauthorized: false
  });
  const headers = req.headers['authorization'] ? {authorization: req.headers['authorization']} : {};
  const promises = [];
  proxy.forEach(i => {
    promises.push(
      axios[req.method.toLowerCase()](`${i}${req.url}`, {httpsAgent: agent, headers: headers} )
    );
  });

  if (promises.length > 0) {
    let iteration = 0;
    let sent = 0;

    promises.
    map(promise => promise.
    then(i => {
      iteration++;
      if (sent === 0) {
        sent = 1;
        res.send(i.data);
      }
    }).
    catch(i => {
      iteration++;
      if (iteration === promises.length && sent === 0) {
        res.status(i.response.status).send({'status': i.response.data});
      }
    }));
  } else {
    res.status(404).send({'status': 404});
  }
}

const server = app.listen(port, () => console.log(`Mock data server listening on port ${port}!`));
