/*
 * PolkADAPT
 *
 * Copyright 2020-2021 Polkascan Foundation (NL)
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

export class PolkascanApi {
  apiEndpoint: string;

  constructor(apiEndpoint: string) {
    this.apiEndpoint = apiEndpoint;
  }

  async getAccount(address: string): Promise<any> {
    const response = await fetch(`${this.apiEndpoint}account/${address}`);
    return (await response.json()).data;
  }

  async getMemberVotes(address: string): Promise<any> {
    return new Promise<any>((resolve, reject) => {
      const url = `${this.apiEndpoint}extrinsic?filter[address]=${address}&page[size]=25`;

      const request = new XMLHttpRequest();
      request.open('GET', url);
      request.send();

      request.onreadystatechange = (e) => {
        if (request.readyState === XMLHttpRequest.DONE) {
          if (request.status === 200) {
            try {
              resolve(JSON.parse(request.responseText).data);
            } catch (e) {
              reject(e);
            }
          } else {
            reject('An error occurred fetching member votes from polkascan.');
          }
        }
      };
    });
  }
}
