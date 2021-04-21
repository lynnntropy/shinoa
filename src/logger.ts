import * as pino from "pino";
import environment from "./environment";

const logger = pino({
  level: environment.LOG_LEVEL as pino.Level,
  prettyPrint: {
    colorize: true,
    translateTime: "yyyy-mm-dd HH:MM",
    ignore: "pid,hostname",
  },
});

export default logger;
