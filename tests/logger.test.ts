import {expect} from 'chai'
import sinon from 'sinon'
import {CprLogger, createLogger} from "../src";
import {transports} from 'winston'

class TestTransport extends transports.Console {
    log(info: any, next: () => void): any {
        return
    }
}

describe('Default Logger', function () {
    let sandbox: sinon.SinonSandbox;
    let logger: CprLogger;
    describe('Logged Object', function () {
        let testTransport: any;
        let stubbedLog: any;

        beforeEach(function () {
            sandbox = sinon.createSandbox();
            logger = createLogger();
            testTransport = new TestTransport();
            stubbedLog = sandbox.stub(testTransport, 'log');
            logger = createLogger({transports: [testTransport], useDefaultConsoleTransport: false});
        });

        afterEach(function () {
            sandbox.restore();
        });

        it('should spread the info of meta object into the logged object', function () {
            logger.info('some message', {someKey: 'someValue', anotherKey: 2});
            let calledArgs = stubbedLog.getCall(0).args;
            let loggedObject = calledArgs[0];
            expect(loggedObject.someKey).to.be.eq('someValue');
            expect(loggedObject.anotherKey).to.be.eq(2);
        });

        it('should override the `Symbol(message) of the logged object to the right string representing the logged object', function () {
            logger.info('test', {someKey: 'someValue'})
            let calledArgs = stubbedLog.getCall(0).args;
            let loggedObject = calledArgs[0];
            expect(loggedObject[Symbol.for('message')]).to.be.eq(`{"someKey":"someValue","level":"info","message":"test","timestamp":"${loggedObject.timestamp}"}`)
        });

        it('should use the message key in meta if no message parameter was filled', function () {
            logger.info({message: 'test'});
            let calledArgs = stubbedLog.getCall(0).args;
            let loggedObject = calledArgs[0];
            expect(loggedObject.message).to.be.eq('test')
            expect(loggedObject[Symbol.for('message')]).to.include(`"message":"test"`)
        });

        it('should use both the message inside the parameter passed and the meta object, as it does in winston', function () {
            logger.info('test', {message: 'test2'});
            let calledArgs = stubbedLog.getCall(0).args;
            let loggedObject = calledArgs[0];
            expect(loggedObject.message).to.be.eq('testtest2')
            expect(loggedObject[Symbol.for('message')]).to.include(`"message":"testtest2"`)
        });

        it('should use the message string passed', function () {
            logger.info('test');
            let calledArgs = stubbedLog.getCall(0).args;
            let loggedObject = calledArgs[0];
            expect(loggedObject.message).to.be.eq('test')
            expect(loggedObject[Symbol.for('message')]).to.include(`"message":"test"`)
        });

        it('should spread the meta object into the logged object when no message parameter is filled', function () {
            logger.info({someKey: 'some Value'});
            let calledArgs = stubbedLog.getCall(0).args;
            let loggedObject = calledArgs[0];
            expect(loggedObject.someKey).to.be.eq('some Value')
        });

        it('should add `serviceName` key to the log if specified when creating the logger', function () {
            const logger = createLogger({
                transports: [testTransport],
                useDefaultConsoleTransport: false,
                serviceName: 'test'
            });
            logger.info({someKey: 'some Value'});
            let calledArgs = stubbedLog.getCall(0).args;
            let loggedObject = calledArgs[0];
            expect(loggedObject.someKey).to.be.eq('some Value');
            expect(loggedObject.serviceName).to.be.eq('test')
        });

        it('should not override any `serviceName` key if already present on the log', function () {
            const logger = createLogger({
                transports: [testTransport],
                useDefaultConsoleTransport: false,
                serviceName: 'test'
            });
            logger.info({someKey: 'some Value', serviceName: 'other'});
            let calledArgs = stubbedLog.getCall(0).args;
            let loggedObject = calledArgs[0];
            expect(loggedObject.serviceName).to.be.eq('other')
        });
        it('should allow changing levels of the logger', function () {
            const logger = createLogger({level: 'debug'});
            logger.level = "silly"
            expect(logger.level).to.be.eq('silly')
        });
    });
});

