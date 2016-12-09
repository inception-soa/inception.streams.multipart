'use strict';
/**
 * @file Multipart form-data test fixture
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


const boundary = '791fbcad-c880-4135-ac40-deaa4e7978fe';


/**
 * Export the fixture
 * @type {Object}
 */
module.exports = {
  name: 'multipart/form-data',
  contentType: `multipart/form-data; boundary=${boundary}`,
  boundary: boundary,
  multipart: new Buffer(`--${boundary}\r
Content-Disposition: form-data; filename="multipart_stream.js"\r
Content-Type: application/javascript\r
Content-Transfer-Encoding: binary\r
\r
'use strict';
/**
 * @file Example usage of the multipart streamer
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

const MultipartStreamer = require('../lib/multipart_streamer');

new MultipartStreamer()
  .addFilePart({ value: __filename, contentType: 'application/javascript' })
  .addFieldPart({ name: 'ofLifeTheUniverseAndEverything', value: 42 })
  .addObjectPart({ value: { foo: 'bar' }, headers: { 'content-length': 13 } })
  .on('error', (err) => console.error(err)) // eslint-disable-line no-console
  .pipe(process.stdout);
\r
--${boundary}\r
Content-Disposition: form-data; name="ofLifeTheUniverseAndEverything"\r
\r
42\r
--${boundary}\r
Content-Type: application/json; charset=UTF-8\r
Content-Length: 13\r
\r
{"foo":"bar"}\r
--${boundary}--\r\n`),
  parts: [
    {
      type: 'stream',
      filename: 'multipart_stream.js',
      contentType: 'application/javascript',
      transferEncoding: 'binary',
      headers: {
        'Content-Disposition': 'form-data; filename="multipart_stream.js"',
        'Content-Type': 'application/javascript',
        'Content-Transfer-Encoding': 'binary'
      },
      value: `'use strict';
/**
 * @file Example usage of the multipart streamer
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

const MultipartStreamer = require('../lib/multipart_streamer');

new MultipartStreamer()
  .addFilePart({ value: __filename, contentType: 'application/javascript' })
  .addFieldPart({ name: 'ofLifeTheUniverseAndEverything', value: 42 })
  .addObjectPart({ value: { foo: 'bar' }, headers: { 'content-length': 13 } })
  .on('error', (err) => console.error(err)) // eslint-disable-line no-console
  .pipe(process.stdout);
`
    },
    {
      type: 'field',
      name: 'ofLifeTheUniverseAndEverything',
      value: '42'
    },
    {
      type: 'object',
      headers: {
        'Content-Type': 'application/json; charset=UTF-8',
        'Content-Length': '13'
      },
      value: { foo: 'bar' }
    }
  ]
};
