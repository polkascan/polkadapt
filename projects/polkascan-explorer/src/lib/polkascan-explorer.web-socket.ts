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


/* eslint-disable @typescript-eslint/naming-convention */
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
/* eslint-enable @typescript-eslint/naming-convention */

type WebsocketEventNames = 'open' | 'socketError' | 'dataError' | 'readyChange' | 'data' | 'close';

const channelName = 'graphql-ws';
const reconnectTimeout = 3000;
const connectionTimeout = 10000;

export class PolkascanExplorerWebSocket {
  wsEndpoint: string;
  chain: string;
  webSocket: WebSocket | null = null;
  websocketReady = false;
  activeReconnectTimeout: number | null = null;
  connectingWebsockets = new Map<WebSocket, number>();
  adapterRegistered = false;

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
    const isReconnecting = !!this.activeReconnectTimeout;

    if (this.webSocket) {
      this.connectingWebsockets.forEach((t, w) => {
        clearTimeout(t);
        if (w !== this.webSocket) {
          w.close(1000);
        }
      });
      this.connectingWebsockets.clear();
      this.webSocket.close(1000); // Normal closure.

      if (!isReconnecting) {
        // WebSocket disconnected after error, it is already retrying to connect;
        this.createWebSocket(true);
      }
    } else {
      if (!isReconnecting) {
        // This can happen when internet connection went down.
        this.connect();
      }
    }
  }


  generateNonce(): number {
    this.nonce = this.nonce + 1;
    return this.nonce;
  }


  query(query: string, timeoutAmount?: number, id?: number): Promise<unknown> {
    return new Promise((resolve, reject) => {
      if (!query.startsWith('query')) {
        throw new Error(`[PolkascanExplorerAdapter] Invalid query string, should start with 'query'.`);
      }

      id = id || this.generateNonce();

      if (this.connectedSubscriptions.has(id)) {
        throw new Error(`[PolkascanExplorerAdapter] There is an active subscription running on id ${id}.`);
      }

      const payload = {
        type: GQLMSG.START,
        id,
        payload: {
          query,
          operationName: null,
        }
      };

      const listenerFn = (data: { id: number; payload: { data: any } }): void => {
        if (data.id === id) {
          this.off('data', listenerFn);
          this.off('dataError', errorListenerFn);
          this.connectedSubscriptions.delete(id);

          if (data.payload && data.payload.data) {
            resolve(data.payload.data);
          } else {
            reject('[PolkascanExplorerAdapter] No data received.');
          }
        }
      };

      const errorListenerFn = (errorData: { id: number; query: any; payload: { message: string } }): void => {
        if (errorData.id === id) {
          errorData.query = query;
          this.off('data', listenerFn);
          this.off('dataError', errorListenerFn);
          this.connectedSubscriptions.delete(id);

          reject(`[PolkascanExplorerAdapter] ${errorData.payload && errorData.payload.message}`);
        }
      };

      const clearListenerFn = () => {
        this.off('data', listenerFn);
        this.off('dataError', errorListenerFn);
        this.connectedSubscriptions.delete(id as number);
      };

      this.send(JSON.stringify(payload), Number.isInteger(timeoutAmount) ? timeoutAmount as number : connectionTimeout).then(
        () => {
          // Websocket message has been successfully transmitted.
        },
        () => {
          // Websocket message has failed because it took to long.
          clearListenerFn();
          reject('Query timed out: ' + query);
        });

      this.connectedSubscriptions.set(id, payload);
      this.on('data', listenerFn);
      this.on('dataError', errorListenerFn);
    });
  }


  createSubscription(query: string, callback: (...attr: any[]) => any, id?: number): Promise<() => void> {
    return new Promise((resolve, reject) => {
      if (!query.startsWith('subscription')) {
        throw new Error(`[PolkascanExplorerAdapter] Invalid query string, should start with 'subscription'.`);
      }

      id = id || this.generateNonce();

      if (this.connectedSubscriptions.has(id)) {
        throw new Error(`[PolkascanExplorerAdapter] There is an active subscription running on id ${id}.`);
      }

      const payload = {
        type: GQLMSG.START,
        id,
        payload: {
          query,
          operationName: null,
        }
      };

      const listenerFn = (response: {
        id: number;
        payload: { message: string; data: any };
        type: string;
        query: string;
      }): void => {
        if (response.id === id) {
          if (response.type === GQLMSG.ERROR) {
            response.query = query;
            clearListenerFn();
            reject(response.payload && response.payload.message ||
              '[PolkascanExplorerAdapter] Subscription returned an error without a payload.');
          } else if (response.type === GQLMSG.DATA) {
            callback(response.payload.data);
          }
        }
      };

      const clearListenerFn = () => {
        this.off('data', listenerFn);
        this.off('dataError', listenerFn);
        this.connectedSubscriptions.delete(id as number);

        this.send(JSON.stringify({  // TODO TEST THIS
          type: GQLMSG.STOP,
          id
        }), reconnectTimeout).then(
          () => {
            // Websocket message has been successfully transmitted.
          },
          (e) => {
            console.error('[PolkascanExplorerAdapter] Stop subscription encountered an error.', e);
          });

      };

      this.send(JSON.stringify(payload), connectionTimeout).then(
        () => {
          // Websocket message has been successfully transmitted.
          resolve(clearListenerFn);
        },
        () => {
          // Websocket message has failed because it took to long.
          clearListenerFn();
          reject('Subscription query timed out: ' + query);
        }
      );

      this.connectedSubscriptions.set(id, payload);
      this.on('data', listenerFn);
      this.on('dataError', listenerFn);
    });
  }


  async send(message: any, timeoutAmount: number): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (!this.webSocket) {
        throw new Error('[PolkascanExplorerAdapter] There is no websocket connection.');
      }

      if (typeof message !== 'string') {
        message = JSON.stringify(message);
      }

      if (this.websocketReady) {
        this.webSocket.send(message as string);
        resolve();
        return;
      }

      const readyTimeout = window.setTimeout(() => {
        removeListeners();
        console.error('[PolkascanExplorerAdapter] Websocket connection timed out.');
        reject();
      }, timeoutAmount);

      const readyCallback = (ready: boolean) => {
        if (ready) {
          if (readyTimeout) {
            clearTimeout(readyTimeout);
          }
          removeListeners();

          if (this.webSocket) {
            this.webSocket.send(message as string);
            resolve();
          }
        }
      };

      const closeCallback = () => {
        if (readyTimeout) {
          clearTimeout(readyTimeout);
        }
        removeListeners();
        reject('[PolkascanExplorerAdapter] Websocket connection closed.');
      };

      const removeListeners = () => {
        // Remove listeners after error or readyChange.
        this.off('readyChange', readyCallback);
        this.off('close', closeCallback);
      };

      // Subscribe to the websockets readyChange or error.
      this.on('readyChange', readyCallback);
      this.on('close', closeCallback);
    });
  }


  createWebSocket(isReconnect = false): void {
    if (!this.adapterRegistered) {
      // When the adapter is not registered in Polkadapt (anymore).
      return;
    }

    const art = this.activeReconnectTimeout;
    // Cancel out a scheduled websocket creation, create it now!
    if (art) {
      clearTimeout(art);
      this.activeReconnectTimeout = null;
    }

    let webSocket: WebSocket;

    try {
      webSocket = new WebSocket(this.wsEndpoint, channelName);
      this.webSocket = webSocket;
    } catch (e) {
      if (!this.activeReconnectTimeout) {
        this.activeReconnectTimeout = window.setTimeout(() => {
          // WebSocket could not be created, retry;
          this.createWebSocket(isReconnect);
          this.activeReconnectTimeout = null;
        }, reconnectTimeout);
      }
      console.error('[PolkascanExplorerAdapter] Websocket creation failed.');
      this.emit('socketError', e);

      return;
    }

    // Create a websocket connection timeout and store it.
    const timeout = setTimeout(() => {
      // It took too long to connect the websocket. Close it.
      webSocket.close(1000);
    }, connectionTimeout) as unknown as number;
    this.connectingWebsockets.set(webSocket, timeout);

    webSocket.onopen = () => {
      this.connectingWebsockets.forEach((t, w) => {
        clearTimeout(t);
        if (w !== this.webSocket) {
          w.close(1000);
        }
      });
      this.connectingWebsockets.clear();

      if (this.webSocket === webSocket) {
        this.emit('open');

        const init = JSON.stringify({
          type: GQLMSG.CONNECTION_INIT
        });
        webSocket.send(init);
      }
    };

    webSocket.onmessage = (message: MessageEvent<string>) => {
      if (this.webSocket === webSocket) {
        const data = JSON.parse(message.data) as { id: number; payload: { message: string; data: any }; type: string };

        switch (data.type) {
          case GQLMSG.DATA:
            this.emit('data', data);
            break;
          case GQLMSG.ERROR:
            console.error('[PolkascanExplorerAdapter] dataError:', data.payload?.message || '(No message)');
            this.emit('dataError', data);
            break;
          case GQLMSG.CONNECTION_ACK:
            this.websocketReady = true;
            this.emit('readyChange', true);

            if (isReconnect) {
              this.connectedSubscriptions.forEach((payload: any) => {
                void this.send(JSON.stringify(payload), connectionTimeout);  // TODO CHECK IF THIS WORKS
              });
            }
            break;
          default:
            break;
        }
      }
    };

    webSocket.onerror = (error) => {
      const runningTimeout = this.connectingWebsockets.get(webSocket);
      if (runningTimeout) {
        clearTimeout(runningTimeout);
        this.connectingWebsockets.delete(webSocket);
      }

      if (this.webSocket === webSocket) {
        if (!this.activeReconnectTimeout) {
          this.activeReconnectTimeout = window.setTimeout(() => {
            // WebSocket disconnected after error, retry connecting;
            this.createWebSocket(true);
            this.activeReconnectTimeout = null;
          }, reconnectTimeout);
        }

        if (this.adapterRegistered) {
          console.error('[PolkascanExplorerAdapter] Websocket encountered an error.');
          this.emit('socketError', error);
        }
      }
    };

    webSocket.onclose = (close) => {
      const runningTimeout = this.connectingWebsockets.get(webSocket);
      if (runningTimeout) {
        clearTimeout(runningTimeout);
        this.connectingWebsockets.delete(webSocket);
      }

      if (this.webSocket === webSocket) {
        this.webSocket = null;
        if (this.websocketReady) {
          this.websocketReady = false;
          this.emit('readyChange', false);
        }
        if (runningTimeout) {
          // The socket is closed while it was still trying to create a connection.
          this.emit('socketError');
        } else {
          this.emit('close', close);
        }
      }
    };
  }


  addListener(messageType: WebsocketEventNames, listener: (...args: any[]) => any): void {
    if (!Array.isArray(this.eventListeners[messageType])) {
      this.eventListeners[messageType] = [];
    }
    this.eventListeners[messageType].push(listener);
  }


  // Add listener function.
  on(messageType: WebsocketEventNames, listener: (...args: any[]) => any): void {
    this.addListener(messageType, listener);
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


  // Remove listener for a specific event.
  off(eventName: string, listener: (...args: any[]) => any): void {
    this.removeListener(eventName, listener);
  }


  // Remove all listeners for a specific event.
  removeAllListeners(eventName: string): void {
    delete this.eventListeners[eventName];
  }


  // Trigger handler function on event.
  emit(eventName: string, ...args: unknown[]): boolean {
    if (this.eventListeners[eventName] && this.eventListeners[eventName].length > 0) {
      // Store the functions in a new array because it will change while in the listener functions are triggered.
      const listeners = this.eventListeners[eventName].slice();

      listeners.forEach((fn) => {
        fn(...args);
      });
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
    if (this.activeReconnectTimeout) {
      clearTimeout(this.activeReconnectTimeout);
      this.activeReconnectTimeout = null;
    }
  }
}
