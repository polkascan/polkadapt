/*
 * PolkADAPT
 *
 * Copyright 2020-2023 Polkascan Foundation (NL)
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

interface IObject {
  [key: string]: any;
}

export const isObject = (item: any): item is object => typeof item === 'object' && !Array.isArray(item) && item !== null;

export const deepMerge = (...objects: IObject[]) =>
  objects.reduce((result, current) => {
    Object.keys(current).forEach((key) => {
      if (['__proto__', 'constructor', 'prototype'].includes(key)) {
        return;
      }

      if (Array.isArray(result[key]) && Array.isArray(current[key])) {
        result[key] = current[key] as IObject;
      } else if (isObject(result[key]) && isObject(current[key])) {
        result[key] = deepMerge(result[key] as IObject, current[key] as IObject);
      } else {
        result[key] = current[key] as IObject;
      }
    });

    return result;
  }, {});
