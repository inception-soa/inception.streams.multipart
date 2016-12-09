'use strict';
/**
 * @file Unit tests for the parser state
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
const MultipartByteParserState = require('../lib/multipart_byte_parser_state');
const FLAGS = MultipartByteParserState.FLAGS;
const STATES = MultipartByteParserState.STATES;


describe('MultipartByteParserState', function () {
  let parserState;
  beforeEach(function () {
    parserState = new MultipartByteParserState(8);
  });


  describe('new', function () {
    it('should be callable', function () {
      expect(MultipartByteParserState).to.be.a('function');
    });

    it('should not be instantiable without arguments', function () {
      expect(() => MultipartByteParserState()).to.throw();
      expect(() => MultipartByteParserState(null)).to.throw();
      expect(() => MultipartByteParserState('string')).to.throw();
      expect(() => MultipartByteParserState([])).to.throw();
      expect(() => MultipartByteParserState({})).to.throw();
      expect(() => MultipartByteParserState(true)).to.throw();
      expect(() => MultipartByteParserState(false)).to.throw();
    });

    it('should be instantiable with required arguments', function () {
      expect(() => MultipartByteParserState(8)).to.not.throw();

      const parserState = MultipartByteParserState(8);
      expect(parserState.state).to.equal(STATES.INITIALIZED);
      expect(parserState.hasErrored).to.be.false;
      expect(parserState.isPartBoundary).to.be.false;
      expect(parserState.isFinalBoundary).to.be.false;
      expect(parserState.lookbehind).to.be.an.instanceof(Buffer);

      expect(parserState._properties).to.be.an('object');
      expect(parserState._properties.flags).to.equal(0);
      expect(parserState._properties.index).to.equal(0);
      expect(parserState._properties.lookbehind).to.be.an.instanceof(Buffer);
      expect(parserState._properties.markers).to.be.an('object');
      expect(parserState._properties.markers).to.be.empty;
    });
  });


  describe('#mark', function () {
    it('should set a marker at the specified position', function () {
      expect(parserState._properties.markers).to.be.empty;
      parserState.mark('mark', 10);
      expect(parserState._properties.markers).to.not.be.empty;
      expect(parserState._properties.markers).to.deep.equal({ 'mark': 10 });
    });
  });


  describe('#clear', function () {
    it('should clear a marker', function () {
      parserState.mark('mark', 10);
      expect(parserState._properties.markers).to.not.be.empty;
      expect(parserState._properties.markers).to.deep.equal({ 'mark': 10 });

      parserState.clear('mark');
      expect(parserState._properties.markers).to.be.empty;
    });
  });


  describe('#getMarker', function () {
    it('should return a position for the marker', function () {
      parserState.mark('mark', 10);
      expect(parserState.getMarker('mark')).to.equal(10);
    });

    it('should return null for unknown markers', function () {
      expect(parserState.getMarker('mark')).to.be.null;
    });
  });


  describe('#setErrored', function () {
    it('should set the error flag in the state', function () {
      expect(parserState.hasErrored).to.be.false;
      parserState.setErrored();
      expect(parserState.hasErrored).to.be.true;
    });
  });


  describe('#updateState', function () {
    it('should update the state of the parser state machine', function () {
      expect(parserState.state).to.equal(STATES.INITIALIZED);
      parserState.updateState(STATES.END);
      expect(parserState.state).to.equal(STATES.END);
    });
  });


  describe('#setFlags', function () {
    it('should set the flags in the state', function () {
      const FLAGS = MultipartByteParserState.FLAGS;

      expect(parserState.isPartBoundary).to.be.false;
      expect(parserState.isFinalBoundary).to.be.false;

      parserState.setFlags(FLAGS.PART_BOUNDARY);
      expect(parserState.isPartBoundary).to.be.true;
      expect(parserState.isFinalBoundary).to.be.false;

      parserState.setFlags(FLAGS.FINAL_BOUNDARY);
      expect(parserState.isPartBoundary).to.be.true;
      expect(parserState.isFinalBoundary).to.be.true;
    });
  });


  describe('#unsetFlags', function () {
    it('should unset the flags in the state', function () {
      parserState.setFlags(FLAGS.PART_BOUNDARY | FLAGS.FINAL_BOUNDARY);
      expect(parserState.isPartBoundary).to.be.true;
      expect(parserState.isFinalBoundary).to.be.true;

      parserState.unsetFlags(FLAGS.PART_BOUNDARY);
      expect(parserState.isPartBoundary).to.be.false;
      expect(parserState.isFinalBoundary).to.be.true;

      parserState.unsetFlags(FLAGS.FINAL_BOUNDARY);
      expect(parserState.isPartBoundary).to.be.false;
      expect(parserState.isFinalBoundary).to.be.false;
    });
  });


  describe('#resetFlags', function () {
    it('should reset the flags in the state', function () {
      parserState.setFlags(FLAGS.PART_BOUNDARY | FLAGS.FINAL_BOUNDARY);
      expect(parserState.isPartBoundary).to.be.true;
      expect(parserState.isFinalBoundary).to.be.true;

      parserState.resetFlags(FLAGS.PART_BOUNDARY);
      expect(parserState.isPartBoundary).to.be.false;
      expect(parserState.isFinalBoundary).to.be.false;
    });
  });
});
