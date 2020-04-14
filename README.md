<p align="center">
    <img src="https://github.com/kyjus25/jumbaliar/blob/master/mockdata-frontend/src/favicon.png?raw=true" width="100" height="100">
</p>

<h1>JumbaLiar</h1>
JumbaLiar is a frontend and backend that allows the user to quickly generate mockdata using dynamically generated express endpoints.

## Prerequisites
• PM2 (`npm install pm2 -g` if you do not already have it.)<br>
• Angular CLI (`npm install @angular/cli -g` if you do not already have it.)
• Docker Compose (if using docker)

## Install
`cd` into the _root_ of the repository and type `npm install`.<br>
The install script will install both of the frontend and backend dependencies into their respective folders.

## Docker
In the root directory, run `npm run start-docker`.<br>
This will start both the frontend and backend servers. The frontend will be built using AOT and may take some time to finish. Please be patient.<br>

• Backend `http://localhost`<br>
• Frontend `http://localhost:8086`

## Start
In the root directory, run `npm start`.<br>
This will start both the frontend and backend servers. The frontend will be built using AOT and may take some time to finish. Please be patient.<br>

NOTE: If the frontend or backend are not currently running, the `pm2 stop server.js` and `pm2 delete server.js` commands will fail in the console. This is to be expected and can be ignored. The startup process will continue.<br>

## Ports

• Backend `http://localhost`<br>
• Frontend `http://localhost:8086`

## Special Thanks

• [bbisping](https://github.com/bbisping) for his awesome redesign of the frontend to make it the JumbaLiar it is today.

## Notes

#### "FULL" Method

When specifying a CRUD method, you can set the method to "FULL". This will set up full CRUD on the endpoint and generate unique audited information when a POST and PUT are made to the endpoint. <br>
• GET (getAll) `/services/<endpoint>` (no body) <br>
• POST (create) `/services/<endpoint>/<id>` (body) <br>
• GET (read) `/services/<endpoint>/<id>` (no body) <br>
• PUT (update) `/services/<endpoint>/<id>` (body) <br>
• DELETE (delete) `/services/<endpoint>/<id>` (no body)

#### Interpolation

When adding values to the return objects/arrays, you can interpolate the values you'd like to return using the following syntax:<br>
`{{<endpoint>[index].[key]}}`

The index is optional. If not specified, it will return an array. For instance, if you had another endpoint called "organization" and you wanted to get the first index's "id", you could interpolate `{{organization[0].id}}`. If you wanted to return the whole organization object, you can interpolate `{{organization[0]}}`
