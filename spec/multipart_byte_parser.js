'use strict';
/**
 * @file Unit tests for the multipart byte parser
 *
 * @author Anand Suresh <anandsuresh@gmail.com>
 * @copyright Copyright (C) 2017 Anand Suresh
 * @license Apache-2.0
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const chai = require('chai');
const expect = chai.expect;
const MultipartByteParser = require('../lib/multipart_byte_parser');


describe('MultipartByteParser', function () {
  describe('new', function () {
    it('should be callable', function () {
      expect(MultipartByteParser).to.be.a('function');
    });

    it('should not be instantiable without arguments', function () {
      expect(() => MultipartByteParser()).to.throw(Error);
      expect(() => MultipartByteParser({})).to.throw(Error);
    });

    it('should be instantiable with required arguments', function () {
      expect(() => MultipartByteParser({
        boundary: '--boundary'
      })).to.not.throw(Error);
    });
  });


  describe('stream', function () {
    const boundary = MultipartByteParser._constructBoundary('boundary');
    const message = new Buffer(
      '--boundary\r\n' +
      'Content-Type: application/json\r\n' +
      '\r\n' +
      JSON.stringify({ foo: 'bar' }) +
      '\r\n' +
      '--boundary\r\n' +
      'Content-Type: application/json\r\n' +
      '\r\n' +
      JSON.stringify({ bar: 'baz' }) +
      '\r\n' +
      '--boundary--' +
      '\r\n' +
      '--boundary--');
    let parser;


    function verifyEvents(expected, callback) {
      let actual = 0;

      return function () {
        if (++actual === expected) {
          callback();
        }
      };
    }


    beforeEach(function () {
      parser = new MultipartByteParser({ boundary: boundary });
    });

    afterEach(function () {
      parser = null;
    });

    it('should emit `partBegin` at the start of each part', function (done) {
      parser
        .on('error', done)
        .on('partBegin', verifyEvents(2, done))
        .end(message);
    });

    it('should emit `headerName` for each header', function (done) {
      parser
        .on('error', done)
        .on('headerName', function (buf, start, end) {
          expect(buf.toString('utf8', start, end)).to.equal('Content-Type');
        })
        .on('headerName', verifyEvents(2, done))
        .end(message);
    });

    it('should emit `headerValue` for each header', function (done) {
      parser
        .on('error', done)
        .on('headerValue', function (buf, start, end) {
          expect(buf.toString('utf8', start, end)).to.equal('application/json');
        })
        .on('headerValue', verifyEvents(2, done))
        .end(message);
    });

    it('should emit `headerEnd` for each header', function (done) {
      parser
        .on('error', done)
        .on('headerValue', function (buf, start, end) {
          expect(buf.toString('utf8', start, end)).to.equal('application/json');
        })
        .on('headerValue', verifyEvents(2, done))
        .end(message);
    });

    it('should emit `headersEnd` for each part', function (done) {
      parser
        .on('error', done)
        .on('headersEnd', verifyEvents(2, done))
        .end(message);
    });

    it('should emit `partData` for each part', function (done) {
      parser
        .on('error', done)
        .on('partData', function (buf, start, end) {
          expect(buf.toString('utf8', start, end)).to.be.oneOf([
            JSON.stringify({ foo: 'bar' }),
            JSON.stringify({ bar: 'baz' })
          ]);
        })
        .on('partData', verifyEvents(2, done))
        .end(message);
    });

    it('should emit `partEnd` for each part', function (done) {
      parser
        .on('error', done)
        .on('partEnd', verifyEvents(2, done))
        .end(message);
    });

    it('should emit `end` when done parsing', function (done) {
      parser
        .on('error', done)
        .on('end', done)
        .end(message);
    });

    it('should emit `error` when an error is encountered', function (done) {
      parser
        .on('error', (err) => {
          expect(err).to.be.an.instanceof(Error);
          done();
        })
        .end('--boundary');
    });
  });


  describe('._constructBoundary', function () {
    it('should return a buffer with the boundary', function () {
      let boundary = MultipartByteParser._constructBoundary('boundary');
      expect(boundary).to.be.an.instanceof(Buffer);
      expect(boundary.length).to.equal(12);
    });
  });


  describe('._getBoundaryChars', function () {
    it('should return an object with all boundary characters', function () {
      let boundaryChars = MultipartByteParser._getBoundaryChars('boundary');
      expect(boundaryChars).to.be.a('object');
      expect(boundaryChars).to.contain.all.keys('boundary'.split(''));
    });
  });
});
