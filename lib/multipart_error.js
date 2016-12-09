'use strict';
/**
 * @file Defines multipart errors
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

const inception = {
  primitives: require('inception.primitives')
};


/**
 * Export the class
 * @type {MultipartError}
 */
module.exports = inception.primitives.Error.subclass('MultipartError', {
  'BadContentType': 'The content-type value is invalid for multipart messages!',
  'ParseError': 'Multipart message has invalid format!',
  'UnsupportedEncoding': 'The encoding is not supported!',
  'TooManyParts': 'Message exceeds maximum number of parts allowed!',
  'PartTooLarge': 'Part exceeds the maximum size allowed!',
  'MessageTooLarge': 'Message exceeds maximum size allowed!'
});
