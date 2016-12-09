'use strict';
/**
 * @file A multipart message streamer
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
  path: require('path'),
  util: require('util')
};
const inception = {
  debug: require('inception.debug')('inception:streams:multipart:streamer'),
  primitives: require('inception.primitives')
};
const Part = require('./part');
const MultipartError = require('./multipart_error');
const uuid = require('uuid');
const _ = require('lodash');


/**
 * A reducer used to generate headers for the individual parts
 *
 * @param {String} reduced The reduced value accumulated over iterations
 * @param {String} value The value of the header
 * @param {String} key The name of the header
 * @return {String}
 */
const REDUCER = (reduced, value, key) => `${reduced}${key}: ${value}\r\n`;


/**
 * Ensures that the specified value is defined
 *
 * @param {*} val The value to check
 * @return {Boolean}
 */
const IS_DEFINED = (val) => (val !== undefined && val !== null);


/**
 * A multipart message streamer
 *
 * @param {Object} [opts] Configuration options for the multipart message streamer
 * @param {String} [opts.boundary] The boundary to use for the message
 * @constructor
 */
function MultipartStreamer(opts) {
  if (!(this instanceof MultipartStreamer)) {
    return new MultipartStreamer(opts);
  }

  opts = opts || {};
  opts.boundary = opts.boundary || uuid.v4();
  opts.parts = [];
  inception.debug('new: ', opts);
  MultipartStreamer.super_.call(this, opts);

  this._error = false;
  this._ready = false;
  this._stream = new inception.primitives.stream.PassThrough()
    .on('error', (err) => this._emitError(err))
    .on('readable', () => this._readParts())
    .on('end', () => this.push(null));
}
node.util.inherits(MultipartStreamer, inception.primitives.stream.Readable);


/**
 * The parts that compose the multipart message
 * @name MultipartStreamer#parts
 * @type {Object}
 */
Object.defineProperty(MultipartStreamer.prototype, 'parts', {
  enumerable: true,
  get: function () {
    return this._properties.parts;
  }
});


/**
 * The multipart message boundary used in the stream
 * @name MultipartStreamer#boundary
 * @type {String}
 */
Object.defineProperty(MultipartStreamer.prototype, 'boundary', {
  enumerable: true,
  get: function () {
    return this._properties.boundary;
  }
});


/**
 * Sets up the parts for streaming
 */
MultipartStreamer.prototype._setup = function () {
  const stream = this._stream;

  this._ready = true;

  (function handlePart(index) {
    if (index === this.parts.length) {
      return stream.end(`--${this.boundary}--\r\n`, 'binary');
    }

    const part = this.parts[index];

    const contentDisposition = ['form-data'];
    if (IS_DEFINED(part.name)) {
      contentDisposition.push(`name="${part.name}"`);
    }
    if (IS_DEFINED(part.filename)) {
      contentDisposition.push(`filename="${part.filename}"`);
    }
    if (contentDisposition.length > 1) {
      part.headers['Content-Disposition'] = contentDisposition.join('; ');
    }

    if (IS_DEFINED(part.id)) {
      part.headers['Content-ID'] = `<${part.id}>`;
    }

    if (IS_DEFINED(part.contentType)) {
      part.headers['Content-Type'] = part.contentType;
    }

    if (IS_DEFINED(part.transferEncoding)) {
      part.headers['Content-Transfer-Encoding'] = part.transferEncoding;
    }

    const serializedHeaders = _.reduce(part.headers, REDUCER, '');
    const headers = `--${this.boundary}\r\n${serializedHeaders}\r\n`;
    inception.debug(`streaming part ${index} (${part.type}):\n${headers}`);
    stream.write(headers, 'binary', (err) => {
      if (err) {
        return this._emitError(err);
      }

      part
        .once('error', (err) => this._emitError(err))
        .once('end', () => {
          if (!this._error) {
            stream.write('\r\n', 'binary', (err) => {
              if (err) {
                return this._emitError(err);
              }

              inception.debug(`end of part ${index} (${part.type})`);
              handlePart.call(this, ++index);
            });
          }
        })
        .pipe(stream, { end: false });
    });
  }.call(this, 0));
};


/**
 * Pushes part data to the readable interface
 */
MultipartStreamer.prototype._readParts = function () {
  let chunk;
  while ((chunk = this._stream.read()) !== null) {
    inception.debug(`pushing ${chunk.length} bytes`);
    if (!this.push(chunk)) {
      break;
    }
  }
};


/**
 * Overridden implementation of the ._read() method of the Readable stream class
 * @override
 */
MultipartStreamer.prototype._read = function () {
  return this._ready ? this._readParts() : this._setup();
};


/**
 * Emits an error event
 *
 * @param {Error} err The error that occurred
 * @return {Boolean}
 */
MultipartStreamer.prototype._emitError = function (err) {
  this._error = true;
  inception.debug(`error: ${err.message}`);
  return this.emit('error', MultipartError.Unexpected(err));
};


/**
 * Adds a form-field part to the multipart message
 *
 * @param {Object} args The definition for the part
 * @param {String} args.value The value of the field
 * @param {String} args.name The name of the field
 * @return {MultipartStreamer}
 */
MultipartStreamer.prototype.addFieldPart = function (args) {
  if (!(IS_DEFINED(args) && IS_DEFINED(args.name) && IS_DEFINED(args.value))) {
    throw new TypeError('A name and value for the field is required!');
  }

  const part = new Part({
    type: Part.TYPES.FIELD,
    value: args.value,
    name: args.name
  });
  part.end(args.value.toString());

  this.parts.push(part);
  return this;
};

/**
 * Adds a JSON object part to the multipart message
 *
 * @param {Object} args The definition for the part
 * @param {String} args.value The JSON object for the part
 * @param {String} [args.name] The name of the part
 * @param {Object} [args.filename] The filename for the part
 * @param {String} [args.contentId] The content-id for the part
 * @param {Object} [args.headers] The headers for the part
 * @return {MultipartStreamer}
 */
MultipartStreamer.prototype.addObjectPart = function (args) {
  if (!IS_DEFINED(args) ||
      !_.isObjectLike(args.value) ||
      _.isEmpty(args.value)) {
    throw new TypeError('A valid JSON object is required!');
  }

  const part = new Part({
    type: Part.TYPES.OBJECT,
    value: args.value,
    contentType: 'application/json; charset=UTF-8',
    name: args.name,
    filename: args.filename,
    contentId: args.contentId,
    headers: args.headers
  });
  part.end(JSON.stringify(args.value));

  this.parts.push(part);
  return this;
};


/**
 * Adds a stream part to the multipart message
 *
 * @param {Object} args The definition for the part
 * @param {String} args.value The stream for the part
 * @param {Object} args.contentType The content-type for the part
 * @param {Object} [args.transferEncoding] The encoding for the part
 * @param {String} [args.name] The name of the part
 * @param {Object} [args.filename] The filename for the part
 * @param {String} [args.contentId] The content-id for the part
 * @param {Object} [args.headers] The headers for the part
 * @return {MultipartStreamer}
 */
MultipartStreamer.prototype.addStreamPart = function (args) {
  if (!(IS_DEFINED(args) &&
      IS_DEFINED(args.value) &&
      IS_DEFINED(args.contentType))) {
    throw new TypeError('A stream and corresponding content-type is required!');
  }

  const part = new Part({
    type: Part.TYPES.STREAM,
    contentType: args.contentType,
    transferEncoding: args.transferEncoding,
    name: args.name,
    filename: args.filename,
    contentId: args.contentId,
    headers: args.headers
  });
  args.value
    .on('error', (err) => part.emit('error', err))
    .pipe(part);

  this.parts.push(part);
  return this;
};


/**
 * Adds a file part to the multipart message
 *
 * @param {Object} args The definition for the part
 * @param {String} args.value The path to the file
 * @param {Object} [args.contentType='application/octet-stream'] The content-type for the part
 * @param {Object} [args.transferEncoding] The encoding for the part
 * @param {String} [args.name] The name of the part
 * @param {Object} [args.filename] The filename for the part
 * @param {String} [args.contentId] The content-id for the part
 * @param {Object} [args.headers] The headers for the part
 * @return {MultipartStreamer}
 */
MultipartStreamer.prototype.addFilePart = function (args) {
  if (!(IS_DEFINED(args) && IS_DEFINED(args.value))) {
    throw new TypeError('A path to the file is required!');
  }

  args.filename = args.filename || node.path.basename(args.value);
  args.value = node.fs.createReadStream(args.value);
  args.contentType = args.contentType || 'application/octet-stream';

  return this.addStreamPart(args);
};


/**
 * Export the class
 * @type {MultipartStreamer}
 */
module.exports = MultipartStreamer;
