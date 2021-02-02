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

  addListener = this.on;
  off = this.removeListener;

  private eventListeners: { [eventName: string]: ((...args) => any)[] } = {};

  // When reconnecting to a websocket we want to rebuild the subscriptions.
  private connectedSubscriptions: {
    [eventName: string]: {
      [key: string]: () => {} // callback function
    }
  } = {};

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
  }


  send(message: any): void {
    if (this.webSocket && this.websocketReady) {
      if (typeof message !== 'string') {
        message = JSON.stringify(message);
      }
      this.webSocket.send(message);
    } else {
      throw new Error('Polkascan websocket is not yet initialized');
    }
  }


  createWebSocket(isReconnect = false): void {
    try {
      const webSocket = new WebSocket(this.wsEndpoint, PolkascanChannelName);

      webSocket.onopen = () => {
        this.webSocket = webSocket;
        this.emit('open');

        // TODO rebuild subscriptions on reconnect
        // TODO cached requests created while offline.

        const init = JSON.stringify({
          type: GQLMSG.CONNECTION_INIT
        });
        webSocket.send(init);
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
            break;
          default:
            break;
        }
      };

      webSocket.onerror = (error) => {
        if (this.webSocket) {
          setTimeout(() => {
            // WebSocket disconnected after error, retry connecting;
            this.createWebSocket(true);
          });
        }
        this.webSocket = undefined;
        if (this.websocketReady) {
          this.websocketReady = false;
          this.emit('readyChange', false);
        }
        this.emit('error', error);
      };

      webSocket.onclose = (close) => {
        if (this.webSocket) {
          this.webSocket = undefined;
          if (this.websocketReady) {
            this.websocketReady = false;
            this.emit('readyChange', false);
          }
        }
        this.emit('close', close);
      };
    } catch (e) {
      // TODO Reconnect?
      console.error(e);
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


  // Add listener that triggers only once and then removes itself.
  once(eventName: PolkascanWebsocketEventNames, listener: (...args) => any): void {
    const onceListener = (...args) => {
      listener(...args);
      this.off(eventName, onceListener);
    };
    this.on(eventName, onceListener);
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
