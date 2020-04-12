import {expect} from 'chai'
import sinon from 'sinon'
import {HttpTransport, HttpTransportOpts} from "../src";


describe(`Cpr's HTTP Transport`, function () {
    let sandbox: sinon.SinonSandbox;
    describe('URL assemble', function () {
        beforeEach(function () {
            sandbox = sinon.createSandbox();
        });

        afterEach(function () {
            sandbox.restore();
        });

        it('should set url to the url that is passed into the constructor', function () {
            let wholeURL = "http://maximv:4000/api/v1/error";
            let transport = new HttpTransport(wholeURL);
            expect(transport.url).to.be.eq('http://maximv:4000/api/v1/error')
        });

        it('should assemble the url with the options passed into the constructor', function () {
            let transportOpts: HttpTransportOpts = {
                path: '/api/v1/error',
                port: 4000,
                host: 'maximv',
                ssl: true
            };
            let transport = new HttpTransport(transportOpts);
            expect(transport.url).to.be.eq('https://maximv:4000/api/v1/error');
            transportOpts = {
                path: 'api/v1/error',
                port: 4000,
                host: 'maximv',
                ssl: true
            };
            transport = new HttpTransport(transportOpts);
            expect(transport.url).to.be.eq('https://maximv:4000/api/v1/error');
        });
    });
});

