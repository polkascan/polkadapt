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


export const GQLMSG = {
  CONNECTION_ACK: 'connection_ack',
  CONNECTION_ERROR: 'connection_error',
  CONNECTION_INIT: 'connection_init',
  CONNECTION_TERMINATE: 'connection_terminate',
  COMPLETE: 'complete',
  DATA: 'data',
  ERROR: 'error',
  START: 'start',
  STOP: 'stop'
};

export type PolkascanWebsocketEventNames = 'open' | 'error' | 'readyChange' | 'data' | 'close';

const PolkascanChannelName = 'graphql-ws';
const reconnectTimeout = 500;

export class PolkascanWebSocket {
  wsEndpoint: string;
  chain: string;
  webSocket: WebSocket | null = null;
  websocketReady = false;
  websocketReconnectTimeout: number | null = null;
  adapterRegistered = false;

  addListener = this.on;
  off = this.removeListener;

  private nonce = 0;

  private eventListeners: { [eventName: string]: ((...args: any[]) => any)[] } = {};

  // When reconnecting to a websocket we want to rebuild the subscriptions.
  private connectedSubscriptions: Map<number, any> = new Map(); // Payload to be send to the websocket.

  constructor(wsEndpoint: string, chain: string) {
    this.wsEndpoint = wsEndpoint;
    this.chain = chain;
  }


  connect(): void {
    // Create the webSocket.
    this.adapterRegistered = true;
    this.cancelReconnectAttempt();
    this.createWebSocket();
  }


  disconnect(): void {
    // Disconnect the webSocket.
    this.adapterRegistered = false;

    if (this.webSocket) {
      this.webSocket.close(1000); // Normal closure.
    }

    this.cancelReconnectAttempt();
    this.connectedSubscriptions = new Map();
  }


  reconnect(): void {
    if (this.webSocket) {
      this.webSocket.close(1000); // Normal closure.
    }
  }


  generateNonce(): number {
    this.nonce = this.nonce + 1;
    return this.nonce;
  }


  query(query: string, timeoutAmount = 5000, id?: number): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!query.startsWith('query')) {
        throw new Error(`Invalid query string, should start with 'query'.`);
      }

      id = id || this.generateNonce();

      if (this.connectedSubscriptions.has(id)) {
        throw new Error(`There is an active subscription running on id ${id}.`);
      }

      let timeout: number;

      const payload = {
        type: GQLMSG.START,
        id,
        payload: {
          query,
          operationName: null,
        }
      };

      const listenerFn = (data: any): void => {
        if (data.id === id) {
          if (timeout) {
            clearTimeout(timeout);
          }

          this.off('data', listenerFn);
          this.off('error', errorListenerFn);
          this.connectedSubscriptions.delete(id as number);

          if (data.payload && data.payload.data) {
            resolve(data.payload.data);
          } else {
            reject('No data received.');
          }
        }
      };

      const errorListenerFn = (errorData: any): void => {
        if (errorData.id === id) {
          if (timeout) {
            clearTimeout(timeout);
          }

          this.off('data', listenerFn);
          this.off('error', errorListenerFn);
          this.connectedSubscriptions.delete(id as number);

          reject(errorData.payload && errorData.payload.message);
        }
      };

      if (Number.isInteger(timeoutAmount) && timeoutAmount > 0) {
        timeout = window.setTimeout(() => {
          this.off('data', listenerFn);
          this.off('error', errorListenerFn);
          this.connectedSubscriptions.delete(id as number);
          reject('Query timed out: ' + query);
        }, timeoutAmount);
      }

      this.send(JSON.stringify(payload)); // Can reject the promise if it fails.

      this.connectedSubscriptions.set(id, payload);
      this.on('data', listenerFn);
      this.on('error', errorListenerFn);
    });
  }


  createSubscription(query: string, callback: (...attr: any[]) => any, id?: number): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!query.startsWith('subscription')) {
        throw new Error(`Invalid query string, should start with 'subscription'.`);
      }

      id = id || this.generateNonce();

      if (this.connectedSubscriptions.has(id)) {
        throw new Error(`There is an active subscription running on id ${id}.`);
      }

      const payload = {
        type: GQLMSG.START,
        id,
        payload: {
          query,
          operationName: null,
        }
      };

      const listenerFn = (response: any): void => {
        if (response.id === id) {
          if (response.type === GQLMSG.ERROR) {
            clearListenerFn();
            throw new Error(response.payload && response.payload.message ||
              '[PolkascanAdapter] Subscription returned an error without a payload.');
          } else if (response.type === GQLMSG.DATA) {
            try {
              callback(response.payload.data);
            } catch (e) {
              console.error('[PolkascanAdapter] Subscription callback encountered an error or no data has been received.', e);
            }
          }
        }
      };

      const clearListenerFn = async () => {
        this.off('data', listenerFn);
        this.off('error', listenerFn);
        this.connectedSubscriptions.delete(id as number);
        try {
          this.send(JSON.stringify({
            type: GQLMSG.STOP,
            id
          }));
        } catch (e) {
          console.error('[PolkascanAdapter] Stop subscription encountered an error.', e);
          // Ignore.
        }
      };

      this.send(JSON.stringify(payload)); // Can reject the promise if it fails.

      this.connectedSubscriptions.set(id, payload);
      this.on('data', listenerFn);
      this.on('error', listenerFn);

      resolve(clearListenerFn);
    });
  }


  send(message: any): void {
    if (!this.webSocket) {
      throw new Error('There is no websocket connection.');
    }
    if (!this.websocketReady) {
      throw new Error('Websocket is connected but not (yet) initialized.');
    }

    if (typeof message !== 'string') {
      message = JSON.stringify(message);
    }

    this.webSocket.send(message);
  }


  createWebSocket(isReconnect = false): void {
    if (!this.adapterRegistered) {
      // When the adapter is not registered in Polkadapt (anymore).
      return;
    }

    let webSocket: WebSocket;

    try {
      webSocket = new WebSocket(this.wsEndpoint, PolkascanChannelName);
      this.webSocket = webSocket;
    } catch (e) {
      if (!this.websocketReconnectTimeout) {
        this.websocketReconnectTimeout = window.setTimeout(() => {
          // WebSocket could not be created, retry;
          this.createWebSocket();
          this.websocketReconnectTimeout = null;
        }, reconnectTimeout);
      }
      console.error('[PolkascanAdapter] Websocket creation failed.', e);
      this.emit('error', e);

      return;
    }

    webSocket.onopen = () => {
      if (this.webSocket === webSocket) {
        this.emit('open');

        const init = JSON.stringify({
          type: GQLMSG.CONNECTION_INIT
        });
        webSocket.send(init);
      }
    };

    webSocket.onmessage = (message: MessageEvent) => {
      if (this.webSocket === webSocket) {
        const data = JSON.parse(message.data);

        switch (data.type) {
          case GQLMSG.DATA:
            this.emit('data', data);
            break;
          case GQLMSG.ERROR:
            this.emit('error', data);
            break;
          case GQLMSG.CONNECTION_ACK:
            this.websocketReady = true;
            this.emit('readyChange', true);

            if (isReconnect) {
              this.connectedSubscriptions.forEach((payload: any) => {
                this.send(JSON.stringify(payload));
              });
            }
            break;
          default:
            break;
        }
      }
    };

    webSocket.onerror = (error) => {
      if (this.webSocket === webSocket) {
        if (!this.websocketReconnectTimeout) {
          this.websocketReconnectTimeout = window.setTimeout(() => {
            // WebSocket disconnected after error, retry connecting;
            this.createWebSocket(true);
            this.websocketReconnectTimeout = null;
          }, reconnectTimeout);
        }

        if (this.adapterRegistered) {
          console.error('[PolkascanAdapter] Websocket encountered an error.', error);
          this.emit('error', error);
        }
      }
    };

    webSocket.onclose = (close) => {
      if (this.webSocket === webSocket) {
        this.webSocket = null;
        if (this.websocketReady) {
          this.websocketReady = false;
          this.emit('readyChange', false);
        }
        this.emit('close', close);
      }
    };
  }


  // Add listener function.
  on(messageType: PolkascanWebsocketEventNames, listener: (...args: any[]) => any): void {
    if (!this.eventListeners.hasOwnProperty(messageType)) {
      this.eventListeners[messageType] = [];
    }
    this.eventListeners[messageType].push(listener);
  }


  // Remove listener for a specific event.
  removeListener(eventName: string, listener: (...args: any[]) => any): void {
    if (this.eventListeners[eventName] !== undefined) {
      let index = -1;
      this.eventListeners[eventName].forEach((regFn, i) => {
        if (regFn === listener) {
          index = i;
        }
      });
      if (index !== -1) {
        this.eventListeners[eventName].splice(index, 1);
      }
    }
  }


  // Remove all listeners for a specific event.
  removeAllListeners(eventName: string): void {
    delete this.eventListeners[eventName];
  }


  // Trigger handler function on event.
  emit(eventName: string, ...args: any[]): boolean {
    if (this.eventListeners[eventName] && this.eventListeners[eventName].length) {
      this.eventListeners[eventName].forEach((listener) => listener(...args));
      return true;
    }
    return false;
  }


  // Get a list of all event names with active listeners.
  eventNames(): string[] {
    const eventNames: string[] = [];
    Object.keys(this.eventListeners).forEach((key) => {
      if (this.eventListeners[key] && this.eventListeners[key].length) {
        eventNames.push(key);
      }
    });
    return eventNames;
  }


  // Return all listeners registered on an event.
  listeners(eventName: string): ((...args: any[]) => any)[] {
    if (this.eventListeners[eventName] && this.eventListeners[eventName].length) {
      return this.eventListeners[eventName];
    } else {
      return [];
    }
  }


  private cancelReconnectAttempt(): void {
    if (this.websocketReconnectTimeout) {
      clearTimeout(this.websocketReconnectTimeout);
      this.websocketReconnectTimeout = null;
    }
  }
}
