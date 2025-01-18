# Daemon

### Description

Daemon is a small utility made for creating *nix like daemons for nodejs. It will be used from the npm scripts with the
same verbs as the standard daemon verbs: (start, restart, stop) as well as spawning multiple processes via cluster
where the number of virtual cpus allows for it. This is done in order to take benefit from systems with more than one cpu
since nodejs runs on a single thread / process.

## Usage:

##### index.mjs

```javascript
import Daemon from "./daemon.mjs";

const startServer = () => {
    // return a promise when you're done starting your server.
    return Promise.resolve("");
}

const daemon = new Daemon(startServer);

daemon.processArgs();
```

##### package.json

```json
{
    "main": "index.mjs",
    "scripts": {
        "help": "node ./ help",
        "start": "node ./ start",
        "start-inspect": "node --inspect ./ start",
        "restart": "node ./ restart",
        "stop": "node ./ stop"
    }
}
```

After this you can start / stop / restart your newly created daemon / service from your preferred terminal:

```shell script
$:> npm start
$:> npm restart
$:> npm stop
```

The daemon will use (if provided) the following system environment vars, otherwise the default values provided below
will be used.

```javascript
NODE_ENV = process.env.NODE_ENV || "development";
STD_OUT_PATH = process.env.STD_OUT_PATH || "out.log";
STD_ERR_PATH = process.env.STD_ERROR_PATH || "err.log";
PIDFILE_PATH = process.env.PIDFILE_PATH || "pidfile.pid";
```

In development the daemon will spawn only one single process meanwhile in any other environment it will use double the
number of virtual CPUs advertised by your operating system
