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
const multer = require('multer');
const mime = require('mime-types');
const passwordHash = require('password-hash');

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

var upload = multer({
  storage: multer.diskStorage({
    destination: function(req, file, callback) {
      callback(null, "./uploads");
    },
    filename: function(req, file, callback) {
      // callback(null, req.params.id + '.' + mime.extension(file.mimetype));
      callback(null, file.originalname);
    }
  })
}).array("file", 3); //Field name and max count

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

app.use('/uploads', express.static('uploads'))

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

    const clone = { ...toSend };
    delete clone.password;

    parseBody(clone, req, res);
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

  const clone = { ...body };
  delete clone.password;

  body ? res.send(clone) : checkProxy(req, res);
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

  const clone = { ...toUpdate };
  delete clone.password;

  toUpdate ? res.send(clone) : checkProxy(req, res);
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

// ACCOUNTS
app.get(base + '/auth/account/getAll', function(req, res){
  const i = config.findIndex(i => i.path === 'auth/account');
  if (i !== -1) {
    parseBody(config[i].body, req, res);
  } else {
    res.status(404).send({'404': 'user functionality not enabled'});
  }
});
// account login
app.post(base + '/auth/account/login', function(req, res){
  if (req.body && req.body.user && req.body.password) {
    const i = config.findIndex(i => i.path === 'auth/account');
    if (i !== -1) {
      const foundUser = config[i].body.find(i => i.user === req.body.user && passwordHash.verify(req.body.password, i.password));
      if (foundUser) {
        const clone = { ...foundUser };
        delete clone.password;
        res.send(clone);
      } else {
        res.status(404).send({'404': 'user not found'});
      }
    } else {
      res.status(404).send({'404': 'user functionality not enabled'});
    }
  } else {
    res.status(404).send({'404': 'error'});
  }
});
// create account
app.post(base + '/auth/account', function(req, res){
  if (req.body && req.body.user && req.body.password) {
    const i = config.findIndex(i => i.path === 'auth/account');
    const foundUser = config[i].body.find(u => u.user === req.body.user);
    if (!foundUser) {
      req.body.password = passwordHash.generate(req.body.password);
      createCrud(i, req.body, req, res);
    } else {
      res.status(404).send({'404': 'user exists'});
    }
  } else {
    res.status(404).send({'404': 'error'});
  }
});
app.delete(base + '/auth/account/:id', function(req, res){
  res.send({'error': 'deleting not allowed'});
});

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

// FILE UPLOADS
app.get(base + '/uploads', function(req, res){
  try {
    fs.readdir('./uploads', (err, files) => {
      res.send(files.filter(i => i !== '.gitkeep'));
    });
  } catch(err) {
    console.error(err)
    res.status(500).send({'500': 'error'});
  }
});
app.post(base + '/uploads/:id', function(req, res){
  upload(req, res, function(err, body) {
    if (err) {
      console.log(err);
      return res.status(400).send({ error: 'Could not upload file' });
    } else {
      res.send({'200': 'ok'});
    }
  });
});
app.delete(base + '/uploads/:id', function(req, res){
  try {
    fs.unlinkSync('./uploads/' + req.params.id);
    res.send({'200': 'ok'});
  } catch(err) {
    console.error(err);
    res.status(500).send({'500': 'error'});
  }
});

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
  const headers = {
    'Content-Type': 'application/json'
  }
  if (req.headers['authorization']) {
    headers['authorization'] = req.headers['authorization'];
  }
  const promises = [];
  proxy.forEach(i => {
    if (req.method.toLowerCase() === 'get') {
      promises.push(axios[req.method.toLowerCase()](`${i}${req.url}`, {httpsAgent: agent, headers: headers} ));
    } else {
      promises.push(axios[req.method.toLowerCase()](`${i}${req.url}`, req.body, {httpsAgent: agent, headers: headers} ));
    }
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
