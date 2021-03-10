/*
 * PolkADAPT
 *
 * Copyright 2020 Stichting Polkascan (Polkascan Foundation)
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


export const isBlockHash = (hash: any): boolean => {
  return (typeof hash === 'string' || (hash as any) instanceof String) && hash.startsWith('0x');
};


export const isBlockNumber = (nr: any): boolean => {
  return Number.isInteger(nr) && nr >= 0;
};


export const isEventIdx = (nr: any): boolean => {
  return Number.isInteger(nr) && nr >= 0;
};


const generateQuery = (
  name: string,
  fields?: string[],
  filters?: string[],
  isList?: boolean,
  pageSize?: number,
  pageKey?: string) => {

  let query: string;
  const config: string[] = [];

  if (filters.length > 0) {
    config.push(`filters: { ${filters.join(', ')} }`);
  }

  if (Number.isInteger(pageSize) && pageSize > 0) {
    config.push(`pageSize: ${pageSize}`);
  }

  if (typeof pageKey === 'string') {
    config.push(`pageKey: ${pageKey}`);
  }

  if (isList === true) {
    query = `query { ${
      name
    }${
      config.length > 0 ? `( ${config.join(', ')} )` : ''
    } { objects { ${
      Array.isArray(fields) && fields.length > 0
        ? fields.join(', ')
        : ''
    } }, pageInfo { pageSize, pageNext, pagePrev } } }`;

  } else {
    query = `query { ${
      name
    }${
      config.length > 0 ? `( ${config.join(', ')} )` : ''
    } { ${
      Array.isArray(fields) && fields.length > 0
        ? fields.join(', ')
        : ''
    } }`;
  }

  return query;
};

export const generateObjectQuery = (name: string,
                                    fields?: string[],
                                    filters?: string[]) => {
  return generateQuery(name, fields, filters);
};

export const generateObjectsListQuery = (name: string,
                                         fields?: string[],
                                         filters?: string[],
                                         pageSize?: number,
                                         pageKey?: string) => {
  return generateQuery(name, fields, filters, true, pageSize, pageKey);
};
