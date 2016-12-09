'use strict';
/**
 * @file Multipart mixed test fixture (from Riak)
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

const boundary = 'YinLMzyUR9feB17okMytgKsylvh';


/**
 * Export the fixture
 * @type {Object}
 */
module.exports = {
  name: 'multipart/mixed',
  contentType: `multipart/mixed; boundary=${boundary}`,
  boundary: boundary,
  multipart: new Buffer(`--${boundary}\r
Content-Type: application/json; charset=UTF-8\r
link: </buckets/test>; rel="up"\r
etag: 4v5xOg4bVwUYZdMkqf0d6I\r
last-modified: Wed, 10 Mar 2010 18:00:04 GMT\r
\r
{"bar":"baz"}\r
--${boundary}\r
Content-Type: application/json; charset=UTF-8\r
link: </buckets/test>; rel="up"\r
etag: 6nr5tDTmhxnwuAFJDd2s6G\r
last-modified: Wed, 10 Mar 2010 17:58:08 GMT\r
\r
{"bar":"baz"}\r
--${boundary}\r
Content-Type: application/json; charset=UTF-8\r
link: </buckets/test>; rel="up"\r
etag: 6zRSZFUJlHXZ15o9CG0BYl\r
last-modified: Wed, 10 Mar 2010 17:55:03 GMT\r
\r
{"foo":"bar"}\r
--${boundary}--\r\n`),
  parts: [
    {
      type: 'object',
      contentType: 'application/json; charset=utf-8',
      headers: {
        'Content-Type': 'application/json; charset=UTF-8',
        'link': '</buckets/test>; rel="up"',
        'etag': '4v5xOg4bVwUYZdMkqf0d6I',
        'last-modified': 'Wed, 10 Mar 2010 18:00:04 GMT'
      },
      value: { 'bar': 'baz' }
    },
    {
      type: 'object',
      contentType: 'application/json; charset=utf-8',
      headers: {
        'Content-Type': 'application/json; charset=UTF-8',
        'link': '</buckets/test>; rel="up"',
        'etag': '6nr5tDTmhxnwuAFJDd2s6G',
        'last-modified': 'Wed, 10 Mar 2010 17:58:08 GMT'
      },
      value: { 'bar': 'baz' }
    },
    {
      type: 'object',
      contentType: 'application/json; charset=utf-8',
      headers: {
        'Content-Type': 'application/json; charset=UTF-8',
        'link': '</buckets/test>; rel="up"',
        'etag': '6zRSZFUJlHXZ15o9CG0BYl',
        'last-modified': 'Wed, 10 Mar 2010 17:55:03 GMT'
      },
      value: { 'foo': 'bar' }
    }
  ]
};
