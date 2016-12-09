'use strict';
/**
 * @file Unit tests for the multipart streamer
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

const node = {
  fs: require('fs'),
  stream: require('stream')
};
const chai = require('chai');
const expect = chai.expect;
const Helpers = require('./helpers');
const Streamer = require('../lib/multipart_streamer');
const _ = require('lodash');


describe('MultipartStreamer', function () {
  describe('new', function () {
    it('should be callable', function () {
      expect(Streamer).to.be.a('function');
    });

    it('should be instantiable without arguments', function () {
      expect(() => Streamer()).to.not.throw();
      expect(() => Streamer(null)).to.not.throw();
      expect(() => Streamer({})).to.not.throw();
      expect(() => Streamer({ boundary: '' })).to.not.throw();

      expect(() => new Streamer()).to.not.throw();
      expect(() => new Streamer(null)).to.not.throw();
      expect(() => new Streamer({})).to.not.throw();
      expect(() => new Streamer({ boundary: '' })).to.not.throw();
    });

    it('should use the specified boundary or generate one', function () {
      expect(Streamer().boundary).to.not.be.empty;
      expect(Streamer({ boundary: 'abcd' }).boundary).to.equal('abcd');

      expect(new Streamer().boundary).to.not.be.empty;
      expect(new Streamer({ boundary: 'abcd' }).boundary).to.equal('abcd');
    });
  });


  describe('#addFieldPart', function () {
    let streamer;

    beforeEach(function () {
      streamer = new Streamer();
    });


    it('should throw an error if required arguments are missing', function () {
      expect(() => streamer.addFieldPart()).to.throw();
      expect(() => streamer.addFieldPart(null)).to.throw();
      expect(() => streamer.addFieldPart({})).to.throw();
      expect(() => streamer.addFieldPart({ name: 'name' })).to.throw();
    });

    it('should add a new form-field to the stream parts', function () {
      expect(streamer.parts).to.be.empty;
      streamer.addFieldPart({ value: 'value', name: 'name' });
      expect(streamer.parts).to.have.lengthOf(1);

      expect(streamer.parts[0].type).to.equal('field');
      expect(streamer.parts[0].value).to.equal('value');
      expect(streamer.parts[0].name).to.equal('name');
    });
  });


  describe('#addObjectPart', function () {
    let streamer;

    beforeEach(function () {
      streamer = new Streamer();
    });


    it('should throw an error if required arguments are missing', function () {
      expect(() => streamer.addObjectPart()).to.throw();
      expect(() => streamer.addObjectPart(null)).to.throw();
      expect(() => streamer.addObjectPart({})).to.throw();
      expect(() => streamer.addObjectPart({ name: 'name' })).to.throw();
    });

    it('should add a new JSON object to the stream parts', function () {
      expect(streamer.parts).to.be.empty;
      streamer.addObjectPart({
        value: { foo: 'bar' }
      });
      expect(streamer.parts).to.have.lengthOf(1);

      expect(streamer.parts[0].type).to.equal('object');
      expect(streamer.parts[0].value).to.deep.equal({ foo: 'bar' });
      expect(streamer.parts[0].contentType).to.contain('application/json');
    });
  });


  describe('#addFilePart', function () {
    let streamer;

    beforeEach(function () {
      streamer = new Streamer();
    });


    it('should throw an error if required arguments are missing', function () {
      expect(() => streamer.addFilePart()).to.throw();
      expect(() => streamer.addFilePart(null)).to.throw();
      expect(() => streamer.addFilePart({})).to.throw();
      expect(() => streamer.addFilePart({ name: 'name' })).to.throw();
    });

    it('should add a new file to the stream parts', function () {
      expect(streamer.parts).to.be.empty;
      streamer.addFilePart({
        value: __filename,
        contentType: 'application/javascript'
      });
      expect(streamer.parts).to.have.lengthOf(1);

      expect(streamer.parts[0].type).to.equal('stream');
      expect(streamer.parts[0].value).to.be.null;
      expect(streamer.parts[0].contentType).to.equal('application/javascript');
    });
  });


  describe('#addStreamPart', function () {
    let streamer;

    beforeEach(function () {
      streamer = new Streamer();
    });


    it('should throw an error if required arguments are missing', function () {
      expect(() => streamer.addStreamPart()).to.throw();
      expect(() => streamer.addStreamPart(null)).to.throw();
      expect(() => streamer.addStreamPart({})).to.throw();
      expect(() => streamer.addStreamPart({ name: 'name' })).to.throw();
      expect(() => streamer.addStreamPart({ value: 'value' })).to.throw();
    });

    it('should add a new stream to the stream parts', function () {
      expect(streamer.parts).to.be.empty;
      streamer.addStreamPart({
        value: node.fs.createReadStream(__filename),
        contentType: 'application/javascript'
      });
      expect(streamer.parts).to.have.lengthOf(1);

      expect(streamer.parts[0].type).to.equal('stream');
      expect(streamer.parts[0].value).to.be.null;
      expect(streamer.parts[0].contentType).to.equal('application/javascript');
    });
  });


  describe('streaming', function () {
    _.forEach(Helpers.FIXTURES, (fixture) => {
      it(`should correctly parse ${fixture.name} content`, function (done) {
        let stream = null;
        const chunks = [];
        const streamer = new Streamer({
          boundary: fixture.boundary
        });

        expect(streamer.boundary).to.equal(fixture.boundary);

        _.forEach(fixture.parts, (part) => {
          switch (part.type) {
            case 'field':
              streamer.addFieldPart(part);
              break;

            case 'object':
              streamer.addObjectPart(part);
              break;

            case 'stream':
              stream = new node.stream.PassThrough();
              streamer.addStreamPart(_.extend({}, part, {
                value: stream,
                headers: null
              }));
              stream.end(part.value);
              break;

            default:
              throw TypeError(`Unknown part type '${part.type}'!`);
          }
        });

        streamer
          .on('error', done)
          .on('data', (chunk) => chunks.push(chunk))
          .on('end', () => {
            let actual = Buffer.concat(chunks);
            let expected = fixture.multipart;
            let index = 0;

            expect(actual.length).to.equal(expected.length);
            while (actual[index] === expected[index] && index < actual.length) {
              index++;
            }

            done(index === actual.length ? null : Error(`Buffer mismatch at ${index}!`));
          });
      });
    });
  });
});
