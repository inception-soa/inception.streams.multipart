'use strict';
/**
 * @file Manages parser state over the course of the message parsing
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
  util: require('util')
};
const inception = {
  primitives: require('inception.primitives')
};
const _ = require('lodash');


/**
 * Manages parser state over the course of the message parsing
 *
 * @param {Number} boundaryLength The length of the multipart message boundary
 * @constructor
 */
function MultipartByteParserState(boundaryLength) {
  if (!(this instanceof MultipartByteParserState)) {
    return new MultipartByteParserState(boundaryLength);
  }

  if (!_.isSafeInteger(boundaryLength)) {
    throw TypeError(`'${boundaryLength}' is an invalid boundary length!`);
  }

  MultipartByteParserState.super_.call(this, {
    state: STATES.INITIALIZED,
    error: false,
    flags: 0,
    index: 0,
    lookbehind: new Buffer(boundaryLength + 8),
    markers: {}
  });
}
node.util.inherits(MultipartByteParserState, inception.primitives.Object);


/**
 * Flags to manage parsing state
 * @enum {Number}
 * @readonly
 */
const FLAGS = MultipartByteParserState.FLAGS = {
  PART_BOUNDARY: 1,
  FINAL_BOUNDARY: 2
};


/**
 * A list of states describing the parser state machine
 * @enum {String}
 * @readonly
 */
const STATES = MultipartByteParserState.STATES = {
  INITIALIZED: 'initialized',
  BOUNDARY: 'boundary',
  HEADER_NAME_START: 'headerNameStart',
  HEADER_NAME: 'headerName',
  HEADER_VALUE_START: 'headerValueStart',
  HEADER_VALUE: 'headerValue',
  HEADER_VALUE_END: 'headerValueEnd',
  HEADERS_END: 'headersEnd',
  PART_DATA_START: 'partDataStart',
  PART_DATA: 'partData',
  END: 'end'
};


/**
 * The current state of the parser state machine
 * @name MultipartByteParserState#state
 * @type {String}
 */
Object.defineProperty(MultipartByteParserState.prototype, 'state', {
  get: function () {
    return this._properties.state;
  }
});


/**
 * The current index value, used by the byte-parser to
 * @name MultipartByteParserState#index
 * @type {Number}
 */
Object.defineProperty(MultipartByteParserState.prototype, 'index', {
  get: function () {
    return this._properties.index;
  },
  set: function (value) {
    this._properties.index = value;
  }
});


/**
 * Whether or not the parser has encountered an error during parsing
 * @name MultipartByteParserState#hasErrored
 * @type {Boolean}
 */
Object.defineProperty(MultipartByteParserState.prototype, 'hasErrored', {
  get: function () {
    return this._properties.error;
  }
});


/**
 * Whether or not a part boundary was encountered
 * @name MultipartByteParserState#isPartBoundary
 * @type {Boolean}
 */
Object.defineProperty(MultipartByteParserState.prototype, 'isPartBoundary', {
  get: function () {
    return !!(this._properties.flags & FLAGS.PART_BOUNDARY);
  }
});


/**
 * Whether or not the final boundary was encountered
 * @name MultipartByteParserState#isFinalBoundary
 * @type {Boolean}
 */
Object.defineProperty(MultipartByteParserState.prototype, 'isFinalBoundary', {
  get: function () {
    return !!(this._properties.flags & FLAGS.FINAL_BOUNDARY);
  }
});


/**
 * Spare buffer to perform look-behind when parsing part data for boundaries
 * @name MultipartByteParserState#lookbehind
 * @type {String}
 */
Object.defineProperty(MultipartByteParserState.prototype, 'lookbehind', {
  get: function () {
    return this._properties.lookbehind;
  }
});


/**
 * Records the specified position under the specified marker
 *
 * @param {String} marker A unique identifier for the marker
 * @param {Number} pos The position to record
 */
MultipartByteParserState.prototype.mark = function (marker, pos) {
  this._properties.markers[marker] = pos;
};


/**
 * Clears any previously recorded position for the specified marker
 *
 * @param {String} marker A unique identifier for the marker
 */
MultipartByteParserState.prototype.clear = function (marker) {
  delete this._properties.markers[marker];
};


/**
 * Returns the recorded position, if any, for the specified marker
 *
 * @param {String} marker A unique identifier for the marker
 * @return {Number|undefined}
 */
MultipartByteParserState.prototype.getMarker = function (marker) {
  if (!(marker in this._properties.markers)) {
    return null;
  }

  return this._properties.markers[marker];
};


/**
 * Sets the error flag, indicating that the parser has encountered an error
 */
MultipartByteParserState.prototype.setErrored = function () {
  this._properties.error = true;
};


/**
 * Updates the state of the parser state machine
 *
 * @param {String} state The new state of the parser state machine
 */
MultipartByteParserState.prototype.updateState = function (state) {
  this._properties.state = state;
};


/**
 * Sets the specified flag bits
 *
 * @param {Number} flags The flag(s) to set
 */
MultipartByteParserState.prototype.setFlags = function (flags) {
  this._properties.flags |= flags;
};


/**
 * Unsets the specified flag bits
 *
 * @param {Number} flags The flag(s) to unset
 */
MultipartByteParserState.prototype.unsetFlags = function (flags) {
  this._properties.flags &= ~flags;
};


/**
 * Resets all flag bits to 0
 */
MultipartByteParserState.prototype.resetFlags = function () {
  this._properties.flags = 0;
};


/**
 * Returns the state as a string; useful for debugging
 * @return {String}
 */
MultipartByteParserState.prototype.toString = function () {
  return node.util.format('state: %s, error: %s, flags: %d, index: %d: %j',
    this._properties.state,
    this._properties.error,
    this._properties.flags,
    this._properties.index,
    this._properties.markers);
};


/**
 * Export the class
 * @type {MultipartByteParserState}
 */
module.exports = MultipartByteParserState;
