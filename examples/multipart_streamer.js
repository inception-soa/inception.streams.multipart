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
