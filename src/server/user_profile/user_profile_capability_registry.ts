/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

interface AnyObject {
  [key: string]: any;
}

export interface Capabilities {
  [capability: string]: boolean;
}

export type CapabilityDecorator = (
  server: AnyObject,
  request: AnyObject,
  capabilities: Capabilities
) => Promise<Capabilities>;

const decorators: CapabilityDecorator[] = [];

export function registerUserProfileCapabilityDecorator(decorator: CapabilityDecorator) {
  decorators.push(decorator);
}

export async function buildUserCapabilities(
  server: AnyObject,
  request: AnyObject
): Promise<Capabilities> {
  const decoratedCapabilities = await executeDecorators(server, request, {});

  return decoratedCapabilities;
}

async function executeDecorators(
  server: AnyObject,
  request: AnyObject,
  capabilities: Capabilities
): Promise<Capabilities> {
  return await asyncForEach(decorators, server, request, capabilities);
}

async function asyncForEach(
  array: CapabilityDecorator[],
  server: AnyObject,
  request: AnyObject,
  initialCapabilities: Capabilities
) {
  let capabilities = initialCapabilities;

  for (const callback of array) {
    capabilities = await callback(server, request, capabilities);
  }

  return capabilities;
}
