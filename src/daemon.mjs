import { cpus } from "os";
import childProcess from "child_process";
import cluster from "cluster";
import fs from "fs";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

export default class Daemon {
  static EXIT_CODE_OK = 0;
  static EXIT_CODE_CATCH_ALL = 1;
  static EXIT_CODE_CANNOT_EXECUTE = 126;
  static EXIT_CODE_CONTROL_C = 130;
  static EXIT_CODE_UNHANDLED_REJECTION = 131;
  static EXIT_CODE_UNHANDLED_EXCEPTION = 132;
  static EXIT_CODE_TERMINATED = 255;
  static NODE_ENV = process.env.NODE_ENV || "development";
  static STD_OUT_PATH = process.env.STD_OUT_PATH || "out.log";
  static STD_ERR_PATH = process.env.STD_ERROR_PATH || "err.log";
  static PIDFILE_PATH = process.env.PIDFILE_PATH || "pidfile.pid";
  static numCPUs = Daemon.NODE_ENV === "development" ? 1 : cpus().length;

  pid = null;

  serveFunction = null;

  start = (argv) => {
    if (process.pid === this.pid) {
      this.startSequence();
    } else {
      if (!this.processExists()) {
        this.startDaemon(argv.debug);
      } else {
        if (cluster.isMaster) {
          console.error("Daemon already started, unable to start. Please use restart.");
          process.exit(Daemon.EXIT_CODE_CANNOT_EXECUTE);
        }

        if (cluster.isWorker) {
          this.startSequence();
        }
      }
    }
  };

  restart = () => {
    if (!this.processExists()) {
      console.error("Daemon not started, unable to restart.");
      process.exit(Daemon.EXIT_CODE_CANNOT_EXECUTE);
    } else {
      fs.writeFileSync(Daemon.PIDFILE_PATH, this.pid ? `${this.pid}` : "");
      process.kill(this.pid, process.platform.startsWith("win") ? "SIGINT" : "SIGHUP");
      process.exit(Daemon.EXIT_CODE_OK);
    }
  };

  stop = (yargs) => {
    if (!this.processExists()) {
      console.error("Daemon not started, unable to stop.");
      process.exit(Daemon.EXIT_CODE_CANNOT_EXECUTE);
    } else {
      fs.writeFileSync(Daemon.PIDFILE_PATH, this.pid ? `${this.pid}` : "");

      if (yargs.force) {
        process.kill(this.pid, "SIGTERM");
      } else {
        process.kill(this.pid, "SIGINT");
      }

      process.exit(Daemon.EXIT_CODE_OK);
    }
  };

  constructor(serveFunction) {
    this.serveFunction = serveFunction;

    if (fs.existsSync(Daemon.PIDFILE_PATH)) {
      const data = fs.readFileSync(Daemon.PIDFILE_PATH, "utf-8");

      if (data) {
        this.pid = parseInt(data);
        this.pid = Number.isNaN(this.pid) ? null : this.pid;
      }
    }
  }

  processExists() {
    try {
      return process.kill(this.pid, 0);
    } catch (err) {
      return err.code === "EPERM";
    }
  }

  startDaemon(debug = false) {
    console.info("Daemon starting.");

    const argv = [].concat(process.argv);

    argv.shift(); // Remove "node" argument

    const path = argv.shift();
    let outFileDescriptor = fs.openSync(Daemon.STD_OUT_PATH, "a");
    let errFileDescriptor = fs.openSync(Daemon.STD_ERR_PATH, "a");
    const forkOptions = {
      detached: true,
      stdio: ["ignore", outFileDescriptor, errFileDescriptor, "ipc"]
    };
    debug && (forkOptions.execArgv = ["--inspect"]);
    const child = childProcess.fork(path, argv, forkOptions);

    fs.writeFileSync(Daemon.PIDFILE_PATH, child.pid.toString());
    child.unref(); // Even detached, unref is required
    console.info("Daemon started.");
    process.exit(Daemon.EXIT_CODE_OK);
  }

  startSequence() {
    if (cluster.isMaster) {
      console.info("Cluster master sequence starting.");

      for (let i = 0; i < Daemon.numCPUs; i++) {
        cluster.fork();
      }

      let exitCount = 0;
      let gracefulExitCount = 0;

      cluster.on("exit", (worker, code, signal) => {
        console.info(`Cluster worker with PID ${worker.process.pid} exited with code ${code} and signal ${signal}.`);

        if (worker.exitedAfterDisconnect) {
          console.info("Cluster worker exited after disconnect.");

          if (++gracefulExitCount === Daemon.numCPUs) {
            console.info("All cluster workers exited gracefully.");
          }

          return;
        }

        if (exitCount++ > 10) {
          console.error("Cluster worker exited too many times, unable to fork any further.");
          return;
        }

        if (code === Daemon.EXIT_CODE_UNHANDLED_REJECTION) {
          console.error(`Cluster worker exited with code ${Daemon.EXIT_CODE_UNHANDLED_REJECTION} (unhandled rejection), unable to fork any further.`);
          return;
        }

        if (code === Daemon.EXIT_CODE_UNHANDLED_EXCEPTION) {
          console.error(`Cluster worker exited with code ${Daemon.EXIT_CODE_UNHANDLED_EXCEPTION} (unhandled exception), unable to fork any further.`);
          return;
        }

        cluster.fork();
        console.info("Cluster worker forked again.");
      });

      process.on("SIGHUP", () => {
        console.info("Process received SIGHUP, restarting cluster cluster workers.");

        if (Daemon.NODE_ENV !== "development") {
          cluster.disconnect(() => {
            process.exit();
            this.startDaemon();
          });
        } else {
          cluster.disconnect();

          const clusterWorkers = Object.values(cluster.workers);

          for (const worker of clusterWorkers) {
            worker.process.kill("SIGKILL");
            console.info(`Cluster worker (PID ${worker.process.pid}) killed with SIGTERM.`);
          }

          this.startDaemon();
        }
      });

      process.on("SIGINT", () => {
        console.info("Process received SIGINT, disconnecting cluster workers.");
        console.info("Active connection may or may not be stopped. Use --force to ensure.");
        cluster.disconnect();
        process.exit();
      });

      process.on("SIGTERM", () => {
        console.info("Process received SIGTERM, disconnecting cluster workers.");
        cluster.disconnect();

        const clusterWorkers = Object.values(cluster.workers);

        for (const worker of clusterWorkers) {
          worker.process.kill("SIGKILL");
          console.info(`Cluster worker (PID ${worker.process.pid}) killed with SIGTERM.`);
        }

        console.info("Process terminated.");
        process.exit(Daemon.EXIT_CODE_TERMINATED);
      });
    }

    if (cluster.isWorker) {
      console.info("Cluster worker sequence starting.");
      this.serveFunction()
        .then(() => {
          console.info(`Server started on cluster worker (PID ${cluster.worker.process.pid}).`);
        })
        .catch((err) => {
          console.error(`Server start failed on cluster worker (PID ${cluster.worker.process.pid}).`, err);
        });
    }
  };

  processArgs() {
    return yargs(hideBin(process.argv))
      .usage("Application daemon\n\nUsage: $0 [command]")
      .help("help").alias("help", "h")
      .version("version", "1.0.0").alias("version", "V")
      .count("verbose").alias("v", "verbose")
      .demandCommand(1)
      .command("start", "Start daemon", (yargs) => {
        return yargs.options("debug", {
          alias: "d",
          default: false,
          describe: "Start node in inspect mode",
          type: "boolean"
        });
      }, this.start)
      .command("restart", "Restart daemon", () => {
      }, this.restart)
      .command("stop", "Stop daemon", (yargs) => {
        return yargs.options("force", {
          alias: "f",
          default: false,
          describe: "Force stop",
          type: "boolean"
        });
      }, this.stop)
      .argv;
  }
}
