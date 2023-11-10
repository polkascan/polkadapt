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

export const isHash = (hash: unknown): hash is string => isString(hash) && hash.startsWith('0x');


export const isPositiveNumber = (val: unknown): val is number => Number.isInteger(val) && (val as number) >= 0;


export const isString = (val: unknown): val is string => typeof val === 'string' || val instanceof String;


export const isNumber = (val: unknown): val is number => typeof val === 'number' && !isNaN(val);


export const isDefined = <T>(val: T | undefined | null): val is T => val !== null && val !== undefined;


export const isObject = (val: unknown): val is object => Object.prototype.toString.call(val) === '[object Object]';


export const isFunction = (val: unknown): val is () => void => typeof val === 'function';


export const isArray = (val: unknown): val is unknown[] => Array.isArray(val);


export const isDate = (date: unknown): date is Date =>
  isDefined(date) && Object.prototype.toString.call(date) === '[object Date]' && !isNaN(date as number);


export const isBoolean = (val: unknown): val is boolean => val === true || val === false
