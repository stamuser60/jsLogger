# JS Logger

### Purpose
Defines a standard for logging.

Should make logging easier and safer:
- Output is in json format by default (can be overridden)
- Timestamp is added by default (current time) (can be overridden)
- Console output is colorized and formatted by default (can be disabled)

## Winston Based
The module enables the creation of an altered version of a winston logger.
Some of the functionality has been saved and some has been removed for the purpose of 
not making life complicated and maintaining a unified way of logging.

#### Transports
All functionality for transports is preserved as it is in Winston.

#### Levels
Functionality for levels is predefined and cannot be changed for the purpose
of defining a standard of logging.

## Basic Usage
```javascript
const logger = createLogger()
logger.log('info', 'test message')
logger.log({level: 'info', message: 'test message'})
logger.log({level: 'info', someOtherKey: 'value'})
logger.log('info', {someOtherKey: 'value'})
logger.log('info', 'test message', {key: 'value'})
```

- By default, all logs are logged in json format unless the format is changed in the transport
- All of the uses above are supported
- Has a default console transport, can be disabled

```javascript
const logger = createLogger();
logger.info('test message')
logger.info({someKey: 'value'})
--------
logger.debug
logger.error
logger.silly
logger.verbose
```

- Functionality for `.info` is the same as `.log` except we dont need to specify the level
- All levels above are available with the same syntax, only difference is the level of the log

### Example: Setting up logger for logs service

```javascript
import {createLogger, HttpTransport} from "@stamscope/jslogger";
const loggerOptions = {
    transports: [
        new HttpTransport('http://some-other-host:3000/api/v1/test'),
        new HttpTransport({
            host: 'localhost',
            port: 3000,
            path: '/api/v1/test',
            ssl: true
        })
    ]
};
const logger = createLogger(loggerOptions);
logger.error('Something has failed')
```
The logger above will send logs to the following places:
- To the console (by default)
- to `http://some-other-host:3000/api/v1/test` (defined in the first transport)
- to `https://localhost:3000/api/v1/test` (defined in the second transport)
