'use strict';
/**
 * @file Unit tests for the multipart parser
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
const Helpers = require('./helpers');
const MultipartError = require('../lib/multipart_error');
const Parser = require('../lib/multipart_parser');
const _ = require('lodash');


describe('MultipartParser', function () {
  describe('new', function () {
    it('should be callable', function () {
      expect(Parser).to.be.a('function');
    });

    it('should not be instantiable without arguments', function () {
      expect(() => new Parser()).to.not.throw();
      expect(() => new Parser(null)).to.not.throw();
      expect(() => new Parser({})).to.not.throw();

      expect(() => new Parser()).to.not.throw();
      expect(() => new Parser(null)).to.not.throw();
      expect(() => new Parser({})).to.not.throw();
    });

    it('should be instantiable with required arguments', function () {
      const TESTS = {
        boundary: 'boundary',
        contentType: 'multipart/form-data; boundary=boundary'
      };

      _.forEach(TESTS, (value, key) => {
        expect(() => new Parser({
          [key]: value
        })).not.to.throw();
      });


      let multipartParser = new Parser({
        contentType: TESTS.contentType
      });

      expect(multipartParser.contentType).to.equal(TESTS.contentType);
      expect(multipartParser.boundary).to.equal(TESTS.boundary);

      expect(multipartParser.maxParts).to.equal(10);
      expect(multipartParser.maxPartSize).to.equal(10 * 1024 * 1024);
      expect(multipartParser.maxTotalSize).to.equal(100 * 1024 * 1024);

      expect(multipartParser.parts).to.be.empty;
      expect(multipartParser.objects).to.be.empty;
      expect(multipartParser.fields).to.be.empty;
      expect(multipartParser.files).to.be.empty;
      expect(multipartParser.unknowns).to.be.empty;
    });
  });


  describe('parsing', function () {
    it('should emit `error` when parts exceed set limits', function (done) {
      const fixture = Helpers.FIXTURES['multipart_form-data'];
      const parser = new Parser({
        contentType: fixture.contentType,
        maxParts: 2
      });

      expect(parser.contentType).to.equal(fixture.contentType);
      expect(parser.boundary).to.equal(fixture.boundary);

      parser
        .on('error', (err) => {
          expect(err).to.be.an.instanceof(MultipartError);
          expect(err.isTooManyParts).to.be.true;
          done();
        })
        .end(fixture.multipart);
    });

    it('should emit `error` when part size exceeds limits', function (done) {
      const fixture = Helpers.FIXTURES['multipart_form-data'];
      const parser = new Parser({
        contentType: fixture.contentType,
        maxPartSize: 2
      });

      expect(parser.contentType).to.equal(fixture.contentType);
      expect(parser.boundary).to.equal(fixture.boundary);

      parser
        .on('error', (err) => {
          expect(err).to.be.an.instanceof(MultipartError);
          expect(err.isPartTooLarge).to.be.true;
          done();
        })
        .end(fixture.multipart);
    });

    it('should emit `error` when total size exceeds limits', function (done) {
      const fixture = Helpers.FIXTURES['multipart_form-data'];
      const parser = new Parser({
        contentType: fixture.contentType,
        maxTotalSize: 10
      });

      expect(parser.contentType).to.equal(fixture.contentType);
      expect(parser.boundary).to.equal(fixture.boundary);

      parser
        .on('error', (err) => {
          expect(err).to.be.an.instanceof(MultipartError);
          expect(err.isMessageTooLarge).to.be.true;
          done();
        })
        .end(fixture.multipart);
    });

    _.forEach(Helpers.FIXTURES, (fixture) => {
      it(`should correctly parse ${fixture.name} content`, function (done) {
        let partIndex = 0;
        const parser = new Parser({
          contentType: fixture.contentType
        });

        expect(parser.contentType).to.equal(fixture.contentType);
        expect(parser.boundary).to.equal(fixture.boundary);

        parser
          .on('error', done)
          .on('part', (part) => {
            const chunks = [];
            const expectedPart = fixture.parts[partIndex++];

            switch (part.type) {
              case 'field':
              case 'object':
                _.forEach(expectedPart, (value, key) => {
                  expect(part[key]).to.deep.equal(value);
                });
                break;

              case 'stream':
                part
                .on('data', (chunk) => chunks.push(chunk))
                .on('end', () => {
                  part._properties.value = Buffer.concat(chunks).toString();

                  _.forEach(expectedPart, (value, key) => {
                    expect(part[key]).to.deep.equal(value);
                  });
                });
                break;

              default:
                throw TypeError(`Unknown part type '${part.type}'!`);
            }
          })
          .on('finish', done)
          .end(fixture.multipart);
      });
    });
  });


  describe('._getContentType', function () {
    const getContentType = Parser._getContentType;

    it('should return null for non-multipart content-types', function () {
      _.forEach([
        null,
        undefined,
        'application/json',
        'multipart',
        'multipartform-data',
        'multipartmulti',
        'multipartrelated'
      ], (value) => {
        expect(getContentType(value)).to.be.null;
      });
    });

    it('should only return a value for multipart content-types', function () {
      _.forEach([
        'multipart/',
        'multipart/form-data',
        'multipart/multi',
        'multipart/related'
      ], (value) => {
        expect(getContentType(value)).to.equal(value);
      });
    });
  });


  describe('._getFieldName', function () {
    const getFieldName = Parser._getFieldName;

    it('should return null for malformed content-disposition', function () {
      _.forEach([
        null,
        undefined,
        'name',
        'form-data;',
        'form-data; name='
      ], (value) => {
        expect(getFieldName(value)).to.be.null;
      });
    });

    it('should only return a value for valid names', function () {
      _.forEach({
        'form-data; name=notQuoted': 'notQuoted',
        'form-data; name="doubleQuoted"': 'doubleQuoted',
        'form-data; name=\'singleQuoted\'': '\'singleQuoted\''
      }, (expected, value) => {
        expect(getFieldName(value)).to.equal(expected);
      });
    });
  });


  describe('._getFileName', function () {
    const getFileName = Parser._getFilename;

    it('should return null for malformed content-disposition', function () {
      _.forEach([
        null,
        undefined,
        'filename',
        'form-data;',
        'form-data; filename='
      ], (value) => {
        expect(getFileName(value)).to.be.null;
      });
    });

    it('should only return a value for valid filenames', function () {
      _.forEach({
        'form-data; filename=hosts': 'hosts',
        'form-data; filename="hosts"': 'hosts',
        'form-data; filename=\'hosts\'': '\'hosts\'',
        'form-data; filename="/etc/hosts"': 'hosts',
        'form-data; filename="\\etc\\hosts"': 'hosts'
      }, (expected, value) => {
        expect(getFileName(value)).to.equal(expected);
      });
    });
  });


  describe('._getContentId', function () {
    const getContentId = Parser._getContentId;

    it('should return null for malformed content-id', function () {
      _.forEach([
        null,
        undefined,
        'content-id',
        '<content-id',
        'content-id>'
      ], (value) => {
        expect(getContentId(value)).to.be.null;
      });
    });

    it('should only return a value for valid content-IDs', function () {
      _.forEach({
        '<content-id>': 'content-id'
      }, (expected, value) => {
        expect(getContentId(value)).to.equal(expected);
      });
    });
  });


  describe('._getBoundary', function () {
    const getBoundary = Parser._getBoundary;

    it('should return null for malformed content-type', function () {
      _.forEach([
        null,
        undefined,
        'boundary',
        'boundary=',
        'boundary=;',
        'multipart/form-data; boundary',
        'multipart/form-data; boundary=',
        'multipart/form-data; boundary=;'
      ], (value) => {
        expect(getBoundary(value)).to.be.null;
      });
    });

    it('should only return a value for valid boundaries', function () {
      _.forEach({
        'multipart/form-data; boundary=boundary': 'boundary',
        'multipart/form-data; boundary=boundary;': 'boundary',
        'multipart/form-data; boundary=boundary; type="text/plain"': 'boundary'
      }, (expected, value) => {
        expect(getBoundary(value)).to.equal(expected);
      });
    });
  });
});
