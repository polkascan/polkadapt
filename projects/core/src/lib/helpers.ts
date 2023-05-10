interface IObject {
  [key: string]: any;
}

export const isObject = (item: any): boolean => typeof item === 'object' && !Array.isArray(item);

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
