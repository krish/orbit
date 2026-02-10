import {ILogFormatter, LogData, pinoLambdaDestination} from 'pino-lambda';
import pino from 'pino';

class CodelabsLogFormatter implements ILogFormatter {
  format(data: LogData): string {
    return `[auth-service]:[${data.level}] ${JSON.stringify(data)}`;
  }
}
const destination = pinoLambdaDestination({
  formatter: new CodelabsLogFormatter(),
});
export const logger = pino({level: process.env.LOG_LEVEL || 'info'}, destination);
