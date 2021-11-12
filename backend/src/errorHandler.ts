import { Logger } from "pino";

import logger from "./logger";

class ErrorHandler {
    private readonly logger: Logger;

    constructor({ logger }: { logger: Logger }) {
        this.logger = logger;
    }

    public async handleExceptionError(error: Error) {
        this.logger.error(`Uncaught exception: ${error.message}`);
        // TODO: add monitoring
        process.exit(1);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public async handleRejectionError(reason: any) {
        this.logger.error(reason, "Unhandled rejection: ");
        // TODO: add monitoring
        process.exit(1);
    }
}

const errorHandler = new ErrorHandler({ logger });

export default errorHandler;
