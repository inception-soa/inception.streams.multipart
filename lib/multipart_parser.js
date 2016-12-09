'use strict';
/**
 * @file A multipart message parser
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
  http: require('http'),
  path: require('path'),
  util: require('util')
};
const inception = {
  debug: require('inception.debug')('inception:streams:multipart:parser'),
  primitives: require('inception.primitives')
};
const MultipartByteParser = require('./multipart_byte_parser');
const MultipartError = require('./multipart_error');
const Part = require('./part');
const _ = require('lodash');


/**
 * Regular expressions for parsing multipart header values
 * @type {Object}
 */
const REGEXP = {
  MULTIPART_TYPE: /^multipart\//,
  BOUNDARY: /boundary=(?:"([^"]+)"|([^;]+))/i,
  NAME: /\bname=("([^"]*)"|([^()<>@,;:\\"/[\]?={}\s\t/]+))/i,
  FILENAME: /\bfilename=("(.*?)"|([^()<>@,;:\\"/[\]?={}\s\t/]+))($|;\s)/i,
  CONTENT_ID: /^<(\S*)>$/
};


/**
 * Ensures that the specified value is defined
 *
 * @param {*} val The value to check
 * @return {Boolean}
 */
const IS_DEFINED = (val) => (val !== undefined && val !== null);


/**
 * A multipart message parser
 *
 * @param {Object} [opts] Configuration options for the multipart message parser
 * @param {Number} [opts.maxParts=10] The maximum no. of parts in the message
 * @param {Number} [opts.maxPartSize=10mB] The maximum size of a single part
 * @param {Number} [opts.maxTotalSize=100mB] The maximum size of all parts
 * @param {String} [opts.boundary] The multipart boundary, if known
 * @param {String} [opts.contentType] The HTTP content-type header, if known
 * @param {Function} [opts.partHandler] Overrides the default part handler
 * @constructor
 */
function MultipartParser(opts) {
  if (!(this instanceof MultipartParser)) {
    return new MultipartParser(opts);
  }

  opts = opts || {};
  opts.maxParts = opts.maxParts || 10;
  opts.maxPartSize = opts.maxPartSize || 10 * 1024 * 1024;
  opts.maxTotalSize = opts.maxTotalSize || 100 * 1024 * 1024;
  opts.parts = [];

  if (IS_DEFINED(opts.contentType) && !IS_DEFINED(opts.boundary)) {
    opts.boundary = MultipartParser._getBoundary(opts.contentType);
  }

  if (IS_DEFINED(opts.partHandler)) {
    if (_.isFunction(opts.partHandler)) {
      this.handlePart = opts.partHandler;
    }

    delete opts.partHandler;
  }

  inception.debug('new:', opts);
  MultipartParser.super_.call(this, opts);

  this._byteParser = opts.boundary ? this._initMultipartByteParser() : null;
  this._curPartState = null;
  this._totalSize = 0;
  this._ended = false;
  this._error = false;

  // Try to auto-recognize HTTP IncomingMessage objects being piped in
  this.on('pipe', (src) => {
    if (IS_DEFINED(this.boundary)) {
      return;
    }

    if (src instanceof node.http.IncomingMessage) {
      // FIXME This is ugly as fuck! What the hell is wrong with you? Granted
      // there are worse things than accessing a known private property on the
      // base class, there is still no redemption for ones that walk this path!
      const ct = this._properties.contentType = src.headers['content-type'];
      this._properties.boundary = MultipartParser._getBoundary(ct);
    }

    if (!IS_DEFINED(this.boundary)) {
      throw MultipartError.BadContentType('Unable to determine content-type!');
    }

    this._byteParser = this._initMultipartByteParser();
  });
}
node.util.inherits(MultipartParser, inception.primitives.stream.Writable);


/**
 * The content-type for the multipart message
 * @name MultipartParser#_curPart
 * @type {String}
 */
Object.defineProperty(MultipartParser.prototype, '_curPart', {
  get: function () {
    const curPartIndex = this._properties.parts.length - 1;
    if (curPartIndex < 0) {
      return null;
    }

    return this._properties.parts[curPartIndex];
  }
});


/**
 * The content-type for the multipart message
 * @name MultipartParser#contentType
 * @type {String}
 */
Object.defineProperty(MultipartParser.prototype, 'contentType', {
  enumerable: true,
  get: function () {
    return this._properties.contentType;
  }
});


/**
 * The boundary for the multipart message
 * @name MultipartParser#boundary
 * @type {String}
 */
Object.defineProperty(MultipartParser.prototype, 'boundary', {
  enumerable: true,
  get: function () {
    return this._properties.boundary;
  }
});


/**
 * The maximum number of parts allowed in the multipart message
 * @name MultipartParser#maxParts
 * @type {Number}
 */
Object.defineProperty(MultipartParser.prototype, 'maxParts', {
  enumerable: true,
  get: function () {
    return this._properties.maxParts;
  }
});


/**
 * The maximum allowed size for each part in the multipart message
 * @name MultipartParser#maxPartSize
 * @type {Number}
 */
Object.defineProperty(MultipartParser.prototype, 'maxPartSize', {
  enumerable: true,
  get: function () {
    return this._properties.maxPartSize;
  }
});


/**
 * The maximum size of all parts allowed in the multipart message
 * @name MultipartParser#maxTotalSize
 * @type {Number}
 */
Object.defineProperty(MultipartParser.prototype, 'maxTotalSize', {
  enumerable: true,
  get: function () {
    return this._properties.maxTotalSize;
  }
});


/**
 * A list of parts composing the multipart message
 * @name MultipartParser#parts
 * @type {Array}
 */
Object.defineProperty(MultipartParser.prototype, 'parts', {
  enumerable: true,
  get: function () {
    return this._properties.parts;
  }
});


/**
 * Initializes the multipart byte-parser
 * @return {MultipartByteParser}
 */
MultipartParser.prototype._initMultipartByteParser = function () {
  const wrapInErrorChecker = (fn) => {
    return (chunk) => {
      if (!this._error) {
        fn.call(this, chunk);
      }
    };
  };

  return new MultipartByteParser({ boundary: this.boundary })
    .on('drain', () => this.uncork())
    .on('partBegin', wrapInErrorChecker(this._onPartBegin))
    .on('headerName', wrapInErrorChecker(this._onHeaderName))
    .on('headerValue', wrapInErrorChecker(this._onHeaderValue))
    .on('headersEnd', wrapInErrorChecker(this._onHeadersEnd))
    .on('partData', wrapInErrorChecker(this._onPartData))
    .on('partEnd', wrapInErrorChecker(this._onPartEnd));
};


/**
 * Emits an error and tears down the byte-parser
 *
 * @param {MultipartError} err The error that occurred
 */
MultipartParser.prototype._emitError = function (err) {
  this._error = true;
  this.emit('error', err);
  this._byteParser = null;
  if (this.corked) {
    this.uncork();
  }
};


/**
 * Handles the beginning of a new part
 */
MultipartParser.prototype._onPartBegin = function () {
  if (this.parts.length >= this.maxParts - 1) {
    return this._emitError(MultipartError.TooManyParts());
  }

  this._curPartState = {
    name: null,
    filename: null,
    contentId: null,
    contentType: null,
    transferEncoding: 'binary',
    headers: {}
  };
};


/**
 * Handles the parsing of a new header name
 *
 * @param {Buffer} chunk The current chunk that contains the name of a header
 */
MultipartParser.prototype._onHeaderName = function (chunk) {
  this._curPartState._headerName = chunk.toString('utf8');
};


/**
 * Handles the parsing of a new header value
 *
 * @param {Buffer} chunk The current chunk that contains the value of the header
 */
MultipartParser.prototype._onHeaderValue = function (chunk) {
  const headerName = this._curPartState._headerName.toLowerCase();
  const headerValue = chunk.toString('utf8');

  switch (headerName) {
    case 'content-disposition':
      this._curPartState.name = MultipartParser._getFieldName(headerValue);
      this._curPartState.filename = MultipartParser._getFilename(headerValue);
      break;

    case 'content-id':
      this._curPartState.contentId = MultipartParser._getContentId(headerValue);
      break;

    case 'content-type':
      this._curPartState.contentType = headerValue.toLowerCase();
      break;

    case 'content-transfer-encoding':
      this._curPartState.transferEncoding = headerValue.toLowerCase();
      break;
  }

  this._curPartState.headers[this._curPartState._headerName] = headerValue;
  this._curPartState._headerName = '';
};


/**
 * Handles the parsing of the end of the headers for a part
 */
MultipartParser.prototype._onHeadersEnd = function () {
  const part = new Part(this._curPartState)
    .on('error', () => this.uncork())
    .on('drain', () => this.uncork());

  this._curPartState.partSize = 0;
  this._curPartState.tmp = '';

  this.parts.push(part);
  this.handlePart(part);
};


/**
 * Handles the parsing of data for a part
 *
 * @param {Buffer} chunk The chunk of data for the part
 */
MultipartParser.prototype._onPartData = function (chunk) {
  if ((this._curPartState.partSize += chunk.length) > this.maxPartSize) {
    return this._emitError(MultipartError.PartTooLarge({
      part: this._curPart,
      chunk: chunk
    }));
  }

  if ((this._totalSize += chunk.length) > this.maxTotalSize) {
    return this._emitError(MultipartError.MessageTooLarge({
      part: this._curPart,
      chunk: chunk
    }));
  }

  let buf = null;
  let offset = null;
  const encoding = this._curPart.transferEncoding;
  switch (encoding) {
    case 'binary':
    case '7bit':
    case '8bit':
      buf = chunk;
      break;

    case 'base64':
      this._curPartState.tmp += chunk.toString('ascii');
      offset = (this._curPartState.tmp.length >> 2) << 2;
      buf = new Buffer(this._curPartState.tmp.substr(0, offset), encoding);
      this._curPartState.tmp = this._curPartState.tmp.substr(offset);
      break;

    default:
      return this._emitError(MultipartError.UnsupportedEncoding(this._curPart));
  }

  inception.debug(`part ${this.parts.length}: writing ${buf.length} bytes`);
  if (!this._curPart.write(buf)) {
    this.cork();
  }
};


/**
 * Handles the parsing of the end of a part
 */
MultipartParser.prototype._onPartEnd = function () {
  let buf;
  const encoding = this._curPart.transferEncoding;
  switch (encoding) {
    case 'binary':
    case '7bit':
    case '8bit':
      break;

    case 'base64':
      buf = new Buffer(this._curPartState.tmp, encoding);
      break;

    default:
      return this._emitError(MultipartError.UnsupportedEncoding(this._curPart));
  }

  inception.debug(`part ${this.parts.length}: ending stream`);
  this._curPart.end(buf);
};


MultipartParser.prototype.handlePart = function (part) {
  if (part.type === Part.TYPES.STREAM) {
    inception.debug(`part ${this.parts.length}: %j`, part);
    this.emit('part', part);
    return;
  }

  const partChunks = [];
  part
    .on('error', (err) => this._emitError(err))
    .on('data', (chunk) => partChunks.push(chunk))
    .on('end', () => {
      const partData = Buffer.concat(partChunks).toString();

      switch (part.type) {
        case Part.TYPES.OBJECT:
          try {
            part._properties.value = JSON.parse(partData);
          } catch (e) {
            part._properties.value = {};
          }
          break;

        case Part.TYPES.FIELD:
          part._properties.value = partData;
          break;

        default:
          inception.debug(`unknown part ${this.parts.length}: %j`, part);
          return;
      }

      inception.debug(`part ${this.parts.length}: %j`, part);
      this.emit('part', part);
    });
};


/**
 * Extracts the content-type of the message
 *
 * @param {String} headerValue The content type header value
 * @return {String|null}
 */
MultipartParser._getContentType = function (headerValue) {
  return REGEXP.MULTIPART_TYPE.test(headerValue) ? headerValue : null;
};


/**
 * Extracts the field name from the content-disposition header
 *
 * @param {String} headerValue The content-disposition header value
 * @return {String|null}
 */
MultipartParser._getFieldName = function (headerValue) {
  if (!IS_DEFINED(headerValue)) {
    return null;
  }

  let matches = headerValue.match(REGEXP.NAME);
  return matches ? matches[2] || matches[1] : null;
};


/**
 * Extracts the filename from the content-disposition header
 *
 * @param {String} headerValue The content-disposition header value
 * @return {String|null}
 */
MultipartParser._getFilename = function (headerValue) {
  if (!IS_DEFINED(headerValue)) {
    return null;
  }

  const matches = headerValue.match(REGEXP.FILENAME);
  if (!matches) {
    return null;
  }

  // Windows paths need special attention
  let filename = (matches[3] || matches[2] || '').replace(/\\/g, '/');
  return filename.substr(filename.lastIndexOf('/') + 1)
    .replace(/%22/g, '"')
    .replace(/&#([\d]{4});/g, (m, c) => String.fromCharCode(c));
};


/**
 * Extracts the content-id
 *
 * @param {String} headerValue The content-id header value
 * @return {String|null}
 */
MultipartParser._getContentId = function (headerValue) {
  if (!IS_DEFINED(headerValue)) {
    return null;
  }

  let matches = headerValue.match(REGEXP.CONTENT_ID);
  return matches ? matches[2] || matches[1] : null;
};


/**
 * Extracts the multipart message boundary
 *
 * @param {String} headerValue The content type header value
 * @return {String|null}
 */
MultipartParser._getBoundary = function (headerValue) {
  if (!IS_DEFINED(headerValue)) {
    return null;
  }

  let boundary = headerValue.match(REGEXP.BOUNDARY);
  return boundary ? (boundary[2] || boundary[1]) : null;
};


/**
 * Writes stream data
 *
 * @param {Buffer} chunk The chunk of data to be written
 * @param {String} encoding The encoding of the chunk
 * @param {Function} callback Function to execute upon writing the chunk
 * @override
 */
MultipartParser.prototype._write = function (chunk, encoding, callback) {
  if (this._error) {
    return callback();
  }

  inception.debug(`received ${chunk.length}-byte ${encoding}`);
  if (!this._byteParser.write(chunk, encoding, callback)) {
    this.cork();
  }
};


/**
 * Export the class
 * @type {MultipartParser}
 */
module.exports = MultipartParser;
