'use strict';
/**
 * @file Helper functions for the tests
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
  path: require('path')
};
const _ = require('lodash');


/**
 * Export the interface
 * @type {Helpers}
 */
const Helpers = exports = module.exports;


/**
 * The list of all fixtures
 * @type {Object}
 */
Helpers.FIXTURES = (function loadFixtures() {
  const fixtures = {};
  const pathFixtures = node.path.resolve(__dirname, 'fixtures');

  _.forEach(node.fs.readdirSync(pathFixtures), (fixture) => {
    const fixtureName = node.path.basename(fixture, node.path.extname(fixture));
    fixtures[fixtureName] = require(node.path.resolve(pathFixtures, fixture));
  });

  return fixtures;
}());
