import axios, {AxiosError} from 'axios'
import {createLogger as winstonCreateLogger, format, LogCallback, Logger, transports} from 'winston';
import Transport from 'winston-transport';
import * as stream from "stream";

type LogLevels = 'error' | 'warn' | 'info' | 'debug' | 'verbose' | 'silly'
type LogEntry = { level: LogLevels, [key: string]: any }

interface LeveledLogMethod {
    (message: string, callback: LogCallback): Logger;

    (message: string, meta: object, callback: LogCallback): Logger;

    (message: string, meta: object): Logger;

    (message: string): Logger;

    (infoObject: object): Logger;
}

interface LogMethod {
    (level: LogLevels, message: string, callback: LogCallback): Logger;

    (level: LogLevels, message: string, meta: object, callback: LogCallback): Logger;

    (level: LogLevels, message: string, meta: object): Logger;

    (level: LogLevels, message: string): Logger;

    (level: LogLevels, meta: object): Logger;

    (entry: LogEntry): Logger;
}

/**
 * Narrower interface for a `Winston` logger.
 */
interface CprLogger extends stream.Transform {
    log: LogMethod;
    error: LeveledLogMethod;
    warn: LeveledLogMethod;
    info: LeveledLogMethod;
    debug: LeveledLogMethod;
    verbose: LeveledLogMethod;
    silly: LeveledLogMethod;

    add(transport: Transport): CprLogger;

    remove(transport: Transport): CprLogger;

    clear(): CprLogger;

    close(): CprLogger;
}

interface LoggerOptions {
    transports?: Transport[],
    useDefaultConsoleTransport?: boolean,
    silent?: boolean,
    level?: LogLevels,

    onError?(err: Error): void
}

/**
 * Returns a console transport with the default settings.
 *
 * Outputs any logs above debug level.
 * Outputs the logs with colorized levels.
 */
function defaultConsoleTransport() {
    return new transports.Console({
        format: format.combine(
            format.colorize(),
            format.printf((info => {
                let {timestamp, level, message, ...meta} = info;
                if (typeof message === 'object') {
                    return `${timestamp} [${level}]: ${Object.keys(message).length ? JSON.stringify(message, null, 2) : ''}`;
                }
                return `${timestamp} [${level}]: ${message ? 'message - ' + message : ''} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`;
            }))
        )
    });
}

/**
 * Returns the transports the logger to use according to the logger options passed.
 */
function getLoggerTransports(options?: LoggerOptions) {
    let loggerTransports: Transport[] = [];
    if (options && options.transports) {
        loggerTransports = [...options.transports];
    }
    if (options && options.useDefaultConsoleTransport === false) {
        return loggerTransports;
    }
    loggerTransports.push(defaultConsoleTransport());
    return loggerTransports;
}

/**
 * Format function to apply to a logger/transport.
 *
 * Makes sure that the info object we will log doesn't have message key that is of an object type.
 * If it does, it means that we are not passing any 'message' key to the initial function,
 * be it logger.info/logger.log/etc...
 * Thus we will want some logic that will make sure that the default key wont show up in that specific log.
 * For this reason, if the `message` key is of type object, we will spread its content inside
 * of info object, and delete the key so that it wont show up in the log.
 */
const messageDisassembler = format((info) => {
    if (typeof info.message === 'object') {
        info = {...info, ...info.message as object};
        delete info.message;
    }
    return info;
});

/**
 * Sets the value of `Symbol.for('message')` index in the info object
 * to the json of the values in the info object.
 * This is done to make sure that transports that use that value (the info[Symbol.for('message')])
 * as their default value that they log (like the transports.Console transport),
 * will log the most up to date message.
 */
const messageSymbolInfoUpdater = format(info => {
    // @ts-ignore
    info[Symbol.for('message')] = JSON.stringify(info);
    return info;
});

/**
 * Returns the default formats that are used to make sure that the logs
 * are being logged the way they should, without any side affects, no matter
 * what transport we use and how our log function call looks like.
 */
function getLoggerFormats() {
    return format.combine(
        format.timestamp(),
        messageDisassembler(),
        messageSymbolInfoUpdater(),
    );
}

/**
 * Sets the error handler function for the logger.
 * @param logger: a reference to the logger we set the error handler
 * @param options: logger options that helps us decide how to behave based on the user demands
 */
function setErrorHandling(logger: Logger, options?: LoggerOptions) {
    if (options && options.onError) {
        logger.on("error", function (err) {
            // @ts-ignore
            options.onError(err);
        });
    } else {
        logger.on("error", function (err) {
            console.log(err);
        });
    }
}

/**
 * Creates the logger instance with all the default and user configuration.
 *
 * @param options: configuration passed by the user.
 */
function createLogger(options?: LoggerOptions): CprLogger {
    let logger = winstonCreateLogger({
        silent: (options && options.silent) ? options.silent : false,
        level: (options && options.level) ? options.level : undefined,
        transports: getLoggerTransports(options),
        format: getLoggerFormats(),
        exitOnError: false,
    });

    setErrorHandling(logger, options);

    return logger as unknown as CprLogger;
}

/**
 * Options to pass to our custom made http constructor
 */
interface HttpTransportOpts {
    host: string
    port: number
    path: string
    ssl?: boolean
}

/**
 * This class was created due to the fact that the default HTTP transport
 * does not handle a case when a full url is passed to it, which is sometimes
 * the case when trying to access different micro-services on openshift.
 */
class HttpTransport extends Transport {

    readonly url: string;

    /**
     * Receives the options passed and returns the url constructed from them
     * @param opts: holds the needed data to construct the url
     */
    private assembleUrl(opts: HttpTransportOpts) {
        let httpPrefix = opts.ssl ? 'https://' : 'http://';
        let path = opts.path[0] === '/' ? opts.path : '/' + opts.path;
        return httpPrefix + opts.host + ':' + opts.port + path;
    }

    /**
     * Can pass to the constructor either a full url as a string,
     * or an `CprHttpOpts` object
     * @param opts
     */
    constructor(opts: HttpTransportOpts | string) {
        super();
        this.url = typeof opts === 'object' ? this.assembleUrl(opts) : opts;
    }

    /**
     * Extracts the needed data from an axios error object
     * @param err: axios error object
     */
    private getAxiosErrorData(err: AxiosError) {
        let errData: {[key: string]: any} = {};
        if (err.response) {
            errData['status'] = err.response.status;
            errData['data'] = err.response.data;
        }
        return {
            ...errData,
            method: err.request.method,
            path: err.request.res.responseUrl,
        };
    }

    /**
     * Preforms a POST HTTP request to the needed url
     * @param data: data to send with the POST request
     */
    private request(data: LogEntry) {
        return axios.post(this.url, data)
    }

    /**
     * Called when we want to perform a log.
     * Winston loggers know when to call this method to perform the logging
     *
     * @param info: the data we want to log
     * @param next: next
     */
    log(info: LogEntry, next: () => void): any {
        this.request(info)
            .then(() => {
                this.emit('logged', info);
            })
            .catch(error => {
                let errData: object;
                if (error.isAxiosError) {
                    errData = this.getAxiosErrorData(error)
                } else {
                    errData = {msg: error.msg}
                }
                this.emit('error', errData);
            });
        next();
    }
}

export {
    createLogger,
    defaultConsoleTransport,
    CprLogger,
    LoggerOptions,
    LogLevels,
    LogEntry,
    LeveledLogMethod,
    LogMethod,
    HttpTransport,
    HttpTransportOpts
}
