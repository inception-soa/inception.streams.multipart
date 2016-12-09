'use strict';
/**
 * @file A streaming multipart message byte parser
 *
 * The _transform() method of this multipart message byte parser is very heavily
 * inspired by the node-formidable npm package. The core algorithm is pretty
 * much the same except for fact that the MultipartByteParser is implemented as
 * a Node.js Transform stream and there are few minor changes with regards to
 * maintaining state between calls to the _transform() method.
 *
 * @author Anand Suresh <anandsuresh@gmail.com>
 * @copyright Copyright (C) 2017 Anand Suresh
 * @copyright Copyright 2011 Felix Geisendörfer
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
  os: require('os'),
  util: require('util')
};
const inception = {
  debug: require('inception.debug')('inception:streams:multipart:byteparser'),
  primitives: require('inception.primitives')
};
const MultipartError = require('./multipart_error');
const MultipartByteParserState = require('./multipart_byte_parser_state');
const _ = require('lodash');


/**
 * Characters of interest for parsing
 * @type {Object}
 */
const CHARS = {
  A: 'a'.charCodeAt(0),
  Z: 'z'.charCodeAt(0),
  CR: '\r'.charCodeAt(0),
  LF: '\n'.charCodeAt(0),
  COLON: ':'.charCodeAt(0),
  SPACE: ' '.charCodeAt(0),
  HYPHEN: '-'.charCodeAt(0),

  lower: (byte) => byte | 0x20
};


/**
 * A streaming multipart message byte parser
 *
 * @param {Object} opts Configuration options for the parser
 * @param {String} opts.boundary The multipart message boundary
 * @constructor
 */
function MultipartByteParser(opts) {
  if (!(this instanceof MultipartByteParser)) {
    return new MultipartByteParser(opts);
  }

  if (!(Buffer.isBuffer(opts.boundary))) {
    opts.boundary = MultipartByteParser._constructBoundary(opts.boundary);
  }
  opts.boundaryChars = MultipartByteParser._getBoundaryChars(opts.boundary);

  inception.debug('new:', opts);
  MultipartByteParser.super_.call(this, opts);

  this._state = new MultipartByteParserState(opts.boundary.length);
  this.on('finish', () => {
    if (this._state.state !== MultipartByteParserState.STATES.END) {
      this._state.setErrored();
      this.emit('error', MultipartError.ParseError({
        msg: 'Unexpected end of multipart message!',
        state: this._state
      }));
    } else {
      this.emit('end');
    }
  });
}
node.util.inherits(MultipartByteParser, inception.primitives.stream.Transform);


/**
 * The multipart message boundary
 * @name MultipartByteParser#boundary
 * @type {String}
 */
Object.defineProperty(MultipartByteParser.prototype, 'boundary', {
  get: function () {
    return this._properties.boundary;
  }
});


/**
 * A map of characters that comprise the multipart message boundary
 * @name MultipartByteParser#boundaryChars
 * @type {Object}
 */
Object.defineProperty(MultipartByteParser.prototype, 'boundaryChars', {
  get: function () {
    return this._properties.boundaryChars;
  }
});


/**
 * Overridden transform function for the Transform stream
 *
 * @param {Buffer} chunk The data to parse
 * @param {String} encoding The encoding of the buffer
 * @param {Function} next Function to execute after consuming the buffer
 * @override
 */
MultipartByteParser.prototype._transform = function (chunk, encoding, next) {
  const STATES = MultipartByteParserState.STATES;
  const FLAGS = MultipartByteParserState.FLAGS;
  const BOUNDARY = this.boundary;
  const BOUNDARY_LENGTH = this.boundary.length;
  const BOUNDARY_CHARS = this.boundaryChars;
  const BUFFER_LENGTH = chunk.length;

  const state = this._state;
  const emit = (event, buffer, start, end, resetMarker) => {
    if (!buffer) {
      inception.debug('%s', event);
      this.emit(event);
    } else if (start !== null && start < end) {
      this.emit(event, buffer.slice(start, end));

      if (resetMarker === true) {
        state.mark(event, 0);
      } else {
        state.clear(event);
      }
    }
  };
  const done = (metadata) => {
    let err = null;
    if (metadata) {
      state.setErrored();
      err = MultipartError.ParseError(metadata);
    }
    next(err);
  };

  // Early exit if the stream has errored out
  if (state.hasErrored) {
    return done();
  }

  inception.debug(`received ${chunk.length}-byte ${encoding}`, state);

  let curByte = null;
  let lowByte = null;
  let curPos = null;
  let prevIndex = null;

  for (curPos = 0; curPos < BUFFER_LENGTH; curPos++) {
    curByte = chunk[curPos];

    switch (state.state) {
      case STATES.INITIALIZED:
        state.index = 0;
        state.updateState(STATES.BOUNDARY);

      // Deliberate fall-through to process the current character
      // eslint-disable-next-line no-fallthrough
      case STATES.BOUNDARY:
        if (state.index === BOUNDARY_LENGTH - 2) {
          if (curByte === CHARS.HYPHEN) {
            state.setFlags(FLAGS.FINAL_BOUNDARY);
            state.index++;
            break;
          } else if (curByte === CHARS.CR) {
            state.index++;
            break;
          }

          return done({
            msg: 'Multipart message boundary not followed by -- or <CR><LF>!',
            byte: curByte,
            state: state
          });
        } else if (state.index === BOUNDARY_LENGTH - 1) {
          if (state.isFinalBoundary && curByte === CHARS.HYPHEN) {
            state.resetFlags();
            state.updateState(STATES.END);
          } else if (!state.isFinalBoundary && curByte === CHARS.LF) {
            emit('partBegin');
            state.updateState(STATES.HEADER_NAME_START);
          } else {
            return done({
              msg: 'Multipart message boundary not followed by -- or <CR><LF>!',
              byte: curByte,
              state: state
            });
          }

          break;
        }

      // This is intentionally setup this way as opposed to writing a single
      // if-else condition. The idea is to force checks on the byte twice to
      // account for the boundary start for the first part which will not have
      // a leading <CR><LF>.
        if (curByte !== BOUNDARY[state.index + 2]) {
          state.index = -2;
        }

        if (curByte === BOUNDARY[state.index + 2]) {
          state.index++;
        }

        break;

      case STATES.HEADER_NAME_START:
        state.index = 0;
        state.mark('headerName', curPos);
        state.updateState(STATES.HEADER_NAME);

      // Deliberate fall-through to process the current character
      // eslint-disable-next-line no-fallthrough
      case STATES.HEADER_NAME:
        lowByte = CHARS.lower(curByte);
        if (_.inRange(lowByte, CHARS.A, CHARS.Z) || curByte === CHARS.HYPHEN) {
          state.index++;
          break;
        } else if (curByte === CHARS.COLON) {
          if (state.index !== 0) {
            emit('headerName', chunk, state.getMarker('headerName'), curPos);
            state.updateState(STATES.HEADER_VALUE_START);
            break;
          }

          return done({
            msg: 'Empty header name!',
            byte: curByte,
            state: state
          });
        } else if (curByte === CHARS.CR) {
          state.clear('headerName');
          state.updateState(STATES.HEADERS_END);
          break;
        }

        return done({
          msg: 'Invalid character found parsing header field name!',
          byte: curByte,
          state: state
        });

      case STATES.HEADER_VALUE_START:
        if (curByte === CHARS.SPACE) {
          break;
        }

        state.mark('headerValue', curPos);
        state.updateState(STATES.HEADER_VALUE);

      // Deliberate fall-through to process the current character
      // eslint-disable-next-line no-fallthrough
      case STATES.HEADER_VALUE:
        if (curByte === CHARS.CR) {
          emit('headerValue', chunk, state.getMarker('headerValue'), curPos);
          state.updateState(STATES.HEADER_VALUE_END);
        }
        break;

      case STATES.HEADER_VALUE_END:
        if (curByte !== CHARS.LF) {
          return done({
            msg: 'Header value not followed by <CR><LF>!',
            byte: curByte,
            state: state
          });
        }

        state.updateState(STATES.HEADER_NAME_START);
        break;

      case STATES.HEADERS_END:
        if (curByte !== CHARS.LF) {
          return done({
            msg: 'Headers not followed by <CR><LF>!',
            byte: curByte,
            state: state
          });
        }

        emit('headersEnd');
        state.updateState(STATES.PART_DATA_START);
        break;

      case STATES.PART_DATA_START:
        state.mark('partData', curPos);
        state.updateState(STATES.PART_DATA);

      // Deliberate fall-through to process the current character
      // eslint-disable-next-line no-fallthrough
      case STATES.PART_DATA:
        prevIndex = state.index;

      // Quickly scan the remainder of the buffer for a possible boundary
        if (state.index === 0) {
          curPos += (BOUNDARY_LENGTH - 1);
          while (curPos < BUFFER_LENGTH && !(chunk[curPos] in BOUNDARY_CHARS)) {
            curPos +=
            BOUNDARY_LENGTH;
          }
          curPos -= (BOUNDARY_LENGTH - 1);
          curByte = chunk[curPos];
        }

        if (state.index < BOUNDARY_LENGTH) {
          if (curByte === BOUNDARY[state.index]) {
            if (state.index === 0) {
              emit('partData', chunk, state.getMarker('partData'), curPos);
            }

            state.index++;
          } else {
            state.index = 0;
          }
        } else if (state.index === BOUNDARY_LENGTH) {
          state.index++;

          if (curByte === CHARS.CR) {
            state.setFlags(FLAGS.PART_BOUNDARY);
          } else if (curByte === CHARS.HYPHEN) {
            state.setFlags(FLAGS.FINAL_BOUNDARY);
          } else {
            state.index = 0;
          }
        } else if (state.index - 1 === BOUNDARY_LENGTH) {
          if (state.isPartBoundary) {
            state.index = 0;
            if (curByte === CHARS.LF) {
              state.unsetFlags(FLAGS.PART_BOUNDARY);
              emit('partEnd');
              emit('partBegin');
              state.updateState(STATES.HEADER_NAME_START);
              break;
            }
          } else if (state.isFinalBoundary) {
            if (curByte === CHARS.HYPHEN) {
              emit('partEnd');
              state.updateState(STATES.END);
              state.resetFlags();
            } else {
              state.index = 0;
            }
          } else {
            state.index = 0;
          }
        }

        if (state.index > 0) {
          state.lookbehind[state.index - 1] = curByte;
        } else if (prevIndex > 0) {
          emit('partData', state.lookbehind, 0, prevIndex);
          prevIndex = 0;
          state.mark('partData', curPos);

        // Reconsider the current character as it could be a boundary start
          curPos--;
        }

        break;

      case STATES.END:
        return done();

      default:
        return done({
          msg: `Unknown parser state '${state.state}'!`,
          byte: curByte,
          state: state
        });
    }
  }

  emit('headerName', chunk, state.getMarker('headerName'), curPos, true);
  emit('headerValue', chunk, state.getMarker('headerValue'), curPos, true);
  if (state.state !== STATES.PART_DATA || state.index === 0) {
    emit('partData', chunk, state.getMarker('partData'), curPos, true);
  }

  this._state = state;
  done();
};


/**
 * Constructs the full multipart message boundary
 *
 * @param {String} boundary The boundary as reported in the content-type
 * @return {Buffer}
 */
MultipartByteParser._constructBoundary = function (boundary) {
  let boundaryBuffer = new Buffer(boundary.length + 4);
  boundaryBuffer.write('\r\n--');
  boundaryBuffer.write(boundary, 4);
  return boundaryBuffer;
};


/**
 * Returns a map of boundary characters
 *
 * @param {Buffer} boundary The multipart message boundary
 * @return {Object}
 */
MultipartByteParser._getBoundaryChars = function (boundary) {
  let boundaryChars = {};
  for (let i = 0; i < boundary.length; i++) {
    boundaryChars[boundary[i]] = true;
  }

  return boundaryChars;
};


/**
 * Export the class
 * @type {MultipartByteParser}
 */
module.exports = MultipartByteParser;
