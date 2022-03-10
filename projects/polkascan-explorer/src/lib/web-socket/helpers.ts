/*
 * PolkADAPT
 *
 * Copyright 2020-2022 Polkascan Foundation (NL)
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


export const isBlockHash = (hash: unknown): boolean => isString(hash) && (hash as string).startsWith('0x');


export const isPositiveNumber = (nr: unknown): boolean => Number.isInteger(nr) && (nr as number) >= 0;


export const isString = (val: unknown): boolean => typeof val === 'string' || val instanceof String;


export const isNumber = (val: unknown): boolean => typeof val === 'number' && !isNaN(val);


export const isDefined = (val: unknown): boolean => val !== null && val !== undefined;


export const isObject = (val: unknown): boolean => Object.prototype.toString.call(val) === '[object Object]';


export const isFunction = (val: unknown): boolean => typeof val === 'function';


export const isArray = (val: unknown): boolean => Array.isArray(val);


const generateQuery = (
  name: string,
  fields?: string[],
  filters?: string[],
  isSubscription?: boolean,
  isList?: boolean,
  pageSize?: number,
  pageKey?: string
) => {
  const type = isSubscription === true ? 'subscription' : 'query';
  let query: string;
  const config: string[] = [];


  if (filters && isArray(filters) && filters.length > 0) {
    config.push(`filters: { ${filters.join(', ')} }`);
  }

  if (pageSize && Number.isInteger(pageSize) && pageSize >= 1) {
    config.push(`pageSize: ${pageSize}`);
  }

  if (typeof pageKey === 'string') {
    config.push(`pageKey: "${pageKey}"`);
  }

  if (isList === true) {
    let pageInfo = '';
    if (pageSize) {
      pageInfo = ', pageInfo { pageSize, pageNext, pagePrev }';
    }
    query = `${type} {
      ${name}${config.length > 0 ? `( ${config.join(', ')} )` : ''} {
        objects {
          ${Array.isArray(fields) && fields.length > 0 ? fields.join(', ') : ''}
        }${pageInfo}
      }
    }`;

  } else {
    query = `${type} {
      ${name}${config.length > 0 ? `( ${config.join(', ')} )` : ''} {
        ${Array.isArray(fields) && fields.length > 0 ? fields.join(', ') : ''}
      }
    }`;
  }

  return query;
};


export const generateObjectQuery = (name: string,
                                    fields?: string[],
                                    filters?: string[]) => generateQuery(name, fields, filters);


export const generateObjectsListQuery = (name: string,
                                         fields?: string[],
                                         filters?: string[],
                                         pageSize?: number,
                                         pageKey?: string) => generateQuery(name, fields, filters, false, true, pageSize, pageKey);


export const generateSubscription = (name: string,
                                     fields?: string[],
                                     filters?: string[]) => generateQuery(name, fields, filters, true);
