import * as pino from "pino";
const logger = pino({
  prettyPrint: {
    colorize: true,
    translateTime: "yyyy-mm-dd HH:MM",
    ignore: "pid,hostname",
  },
});

export default logger;
