export const isBlockHash = (hash: unknown): hash is string => isString(hash) && hash.startsWith('0x');


export const isPositiveNumber = (val: unknown): val is number => Number.isInteger(val) && (val as number) >= 0;


export const isString = (val: unknown): val is string => typeof val === 'string' || val instanceof String;


export const isNumber = (val: unknown): val is number => typeof val === 'number' && !isNaN(val);


export const isDefined = <T>(val: T | undefined | null): val is T => val !== null && val !== undefined;


export const isObject = (val: unknown): val is object => Object.prototype.toString.call(val) === '[object Object]';


export const isFunction = (val: unknown): val is () => void => typeof val === 'function';


export const isArray = (val: unknown): val is unknown[] => Array.isArray(val);

export const isDate = (date: unknown): date is Date =>
  isDefined(date) && Object.prototype.toString.call(date) === '[object Date]' && !isNaN(date as number);
