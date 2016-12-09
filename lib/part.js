'use strict';
/**
 * @file A single part of a multipart message
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


/**
 * Ensures that the specified value is defined
 *
 * @param {*} val The value to check
 * @return {Boolean}
 */
const IS_DEFINED = (val) => (val !== undefined && val !== null);


/**
 * A single part of a multipart message
 *
 * @param {Object} [opts] Configuration options for the part
 * @param {String} [opts.type] The type of the part
 * @param {*} [opts.value] The value for the part
 * @param {String} [opts.name] The name of the part, if any
 * @param {String} [opts.filename] The filename of the part, if any
 * @param {String} [opts.transferEncoding] The encoding for the part
 * @param {String} [opts.contentType] The content-type of the part
 * @param {String} [opts.contentId] The content-id of the part, if any
 * @param {Object} [opts.headers] The headers for the part
 */
function Part(opts) {
  opts = opts || {};

  if (!IS_DEFINED(opts.type)) {
    if (IS_DEFINED(opts.contentType) &&
        opts.contentType.indexOf('/json') >= 0) {
      opts.type = Part.TYPES.OBJECT;
    } else if (IS_DEFINED(opts.name) && !IS_DEFINED(opts.filename)) {
      opts.type = Part.TYPES.FIELD;
    } else {
      opts.type = Part.TYPES.STREAM;
    }
  }

  Part.super_.call(this, {
    type: opts.type,
    value: opts.value || null,
    name: opts.name || null,
    filename: opts.filename || null,
    transferEncoding: opts.transferEncoding || null,
    contentType: opts.contentType || null,
    contentId: opts.contentId || null,
    headers: opts.headers || {},
    allowHalfOpen: true
  });
}
node.util.inherits(Part, inception.primitives.stream.PassThrough);


/**
 * The types of parts
 * @typedef {String} PartType
 */
Part.TYPES = {
  FIELD: 'field',
  OBJECT: 'object',
  STREAM: 'stream'
};


/**
 * The type of the part
 * @name Part#type
 * @type {PartType}
 */
Object.defineProperty(Part.prototype, 'type', {
  get: function () {
    return this._properties.type;
  }
});


/**
 * The value for the part
 * @name Part#value
 * @type {Object}
 */
Object.defineProperty(Part.prototype, 'value', {
  get: function () {
    return this._properties.value;
  }
});


/**
 * The name of the field as specified in the content-disposition
 * @name Part#name
 * @type {String}
 */
Object.defineProperty(Part.prototype, 'name', {
  get: function () {
    return this._properties.name;
  }
});


/**
 * The filename for the part (if available)
 * @name Part#filename
 * @type {String}
 */
Object.defineProperty(Part.prototype, 'filename', {
  get: function () {
    return this._properties.filename;
  }
});


/**
 * The encoding for the part
 * @name Part#transferEncoding
 * @type {String}
 */
Object.defineProperty(Part.prototype, 'transferEncoding', {
  get: function () {
    return this._properties.transferEncoding;
  }
});


/**
 * The content-type or MIME type for the part
 * @name Part#contentType
 * @type {String}
 */
Object.defineProperty(Part.prototype, 'contentType', {
  get: function () {
    return this._properties.contentType;
  }
});


/**
 * The content-id  for the part
 * @name Part#id
 * @type {String}
 */
Object.defineProperty(Part.prototype, 'contentId', {
  get: function () {
    return this._properties.contentId;
  }
});


/**
 * The headers for the part
 * @name Part#headers
 * @type {Object}
 */
Object.defineProperty(Part.prototype, 'headers', {
  get: function () {
    return this._properties.headers;
  }
});


/**
 * Export the class
 * @type {Part}
 */
module.exports = Part;
