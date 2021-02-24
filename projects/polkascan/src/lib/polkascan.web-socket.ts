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

export class PolkascanWebSocket {
  wsEndpoint: string;
  chain: string;
  webSocket: WebSocket;
  websocketReady = false;
  websocketReconnectTimeout: number;

  addListener = this.on;
  off = this.removeListener;

  private nonce = 0;

  private eventListeners: { [eventName: string]: ((...args) => any)[] } = {};

  // When reconnecting to a websocket we want to rebuild the subscriptions.
  private connectedSubscriptions: Map<number, any> = new Map(); // Payload to be send to the websocket.

  constructor(wsEndpoint: string, chain: string) {
    this.wsEndpoint = wsEndpoint;
    this.chain = chain;
  }


  connect(): void {
    // Create the webSocket.
    if (!this.webSocket) {
      this.createWebSocket();
    }
  }


  disconnect(): void {
    // Disconnect the webSocket.
    if (this.webSocket) {
      this.webSocket.close();
    }
    if (this.websocketReconnectTimeout) {
      clearTimeout(this.websocketReconnectTimeout);
      this.websocketReconnectTimeout = null;
    }
    this.connectedSubscriptions = new Map();
  }


  generateNonce(): number {
    this.nonce = this.nonce + 1;
    return this.nonce;
  }


  query(query: string, id?: number): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!query.startsWith('query')) {
        throw new Error(`Invalid query string, should start with 'query'.`);
      }

      id = id || this.generateNonce();

      if (this.connectedSubscriptions.has(id)) {
        throw new Error(`There is an active subscription running on id ${id}.`);
      }

      const payload = {
        type: GQLMSG.DATA,
        id,
        payload: {
          query,
          operationName: null,
        }
      };

      const listenerFn = (response: any): void => {
        if (response.id === id) {
          this.off('data', listenerFn);
          this.connectedSubscriptions.delete(id);

          if (response.type === GQLMSG.ERROR) {
            reject(response.message);
          } else {
            resolve(response);
          }
        }
      };

      this.send(JSON.stringify(payload)); // Can reject the promise if it fails.

      this.connectedSubscriptions.set(id, payload);
      this.on('data', listenerFn);
    });
  }


  createSubscription(query: string, callback: (...attr) => any, id?: number): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!query.startsWith('subscribe')) {
        throw new Error(`Invalid query string, should start with 'subscribe'.`);
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
            this.off('data', listenerFn);
            this.connectedSubscriptions.delete(id);
            reject(response.message);
          } else {
            callback(response);
          }
        }
      };

      const clearListenerFn = async () => {
        this.off('data', listenerFn);
        this.connectedSubscriptions.delete(id);
        try {
          this.send(JSON.stringify({
            type: GQLMSG.STOP,
            id
          }));
        } catch (e) {
          // Ignore.
        }
      };

      this.send(JSON.stringify(payload)); // Can reject the promise if it fails.

      this.connectedSubscriptions.set(id, payload);
      this.on('data', listenerFn);

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
    try {
      webSocket = new WebSocket(this.wsEndpoint, PolkascanChannelName);
      this.webSocket = webSocket;
    } catch (e) {
      if (!this.websocketReconnectTimeout) {
        this.websocketReconnectTimeout = setTimeout(() => {
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
        const data = JSON.parse(message.data);

        switch (data.type) {
          case GQLMSG.DATA:
            this.emit('data', data);
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
          // TODO case CONNECTION_ERROR, readychange emit error
          // TODO case ERROR, readychange emit error
          default:
            break;
        }
      };

      webSocket.onerror = (error) => {
        if (this.webSocket) {
          if (!this.websocketReconnectTimeout) {
            this.websocketReconnectTimeout = setTimeout(() => {
              // WebSocket disconnected after error, retry connecting;
              this.createWebSocket(true);
              this.websocketReconnectTimeout = null;
            }, 300);
          }
        }
        this.webSocket = null;
        if (this.websocketReady) {
          this.websocketReady = false;
          this.emit('readyChange', false);
        }
        this.emit('error', error);
        this.emit('close', close); // In specific cases the onClose will not be fired, so emit 'close' anyway.
      };

      webSocket.onclose = (close) => {
        if (this.webSocket) {
          this.webSocket = null;
          if (this.websocketReady) {
            this.websocketReady = false;
            this.emit('readyChange', false);
          }
        }
        this.emit('close', close);
      };
    } catch (e) {
      console.error(e);
      if (!this.websocketReconnectTimeout) {
        this.websocketReconnectTimeout = setTimeout(() => {
          // WebSocket disconnected after error, retry connecting;
          this.createWebSocket(true);
          this.websocketReconnectTimeout = null;
        }, 300);
      }
    }
  }


  // Add listener function.
  on(messageType: PolkascanWebsocketEventNames, listener: (...args) => any): void {
    if (!this.eventListeners.hasOwnProperty(messageType)) {
      this.eventListeners[messageType] = [];
    }
    this.eventListeners[messageType].push(listener);
  }


  // Remove listener for a specific event.
  removeListener(eventName: string, listener: (...args) => any): void {
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
  emit(eventName: string, ...args): boolean {
    if (this.eventListeners[eventName] && this.eventListeners[eventName].length) {
      this.eventListeners[eventName].forEach((listener) => listener(...args));
      return true;
    }
    return false;
  }


  // Get a list of all event names with active listeners.
  eventNames(): string[] {
    const eventNames = [];
    Object.keys(this.eventListeners).forEach((key) => {
      if (this.eventListeners[key] && this.eventListeners[key].length) {
        eventNames.push(key);
      }
    });
    return eventNames;
  }


  // Return all listeners registered on an event.
  listeners(eventName: string): ((...args) => any)[] {
    if (this.eventListeners[eventName] && this.eventListeners[eventName].length) {
      return this.eventListeners[eventName];
    } else {
      return [];
    }
  }
}
