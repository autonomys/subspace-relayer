import * as pino from "pino";

const logger = pino({
    prettyPrint: {
        colorize: true,
        translateTime: 'yyyy-mm-dd HH:MM:ss',
        ignore: 'hostname,pid',
    }
});

logger.level = process.env.DEBUG ? 'debug' : 'info';

export default logger;
