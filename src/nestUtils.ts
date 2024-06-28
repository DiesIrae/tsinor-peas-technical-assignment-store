import { JSONObject } from "./json-types";
import { Store, StoreValue } from "./store";

const pathSeparator = ":";

export function getKeysFromPath(path: string) {
  return path.split(pathSeparator);
}

export function getPathFromKeys(keys: string[]) {
  return keys.join(pathSeparator);
}

export function getValueFromChildrenKeys(object: any, pathKeys: string[]): any {
  const [parentKey, ...childrenKeys] = pathKeys;

  if (!object) return;

  const value = object[parentKey];
  if (childrenKeys.length === 0) return value;
  else return getValueFromChildrenKeys(value, childrenKeys);
}
export function writeToObject(object: any, pathKeys: string[], value: any) {
  const [parentKey, ...childrenKeys] = pathKeys;

  if (!object) object = new Store();
  const finalValue =
    childrenKeys.length === 0
      ? value
      : writeToObject(object[parentKey], childrenKeys, value);

  object[parentKey] = finalValue;
  return object;
}

function isPlainObject(object: StoreValue): object is JSONObject | Store {
  return (
    typeof object === "object" && object !== null && !Array.isArray(object)
  );
}

function getObjectAsStore(object: StoreValue) {
  if (isPlainObject(object) && !(object instanceof Store)) {
    const store = new Store();
    store.writeEntries(object);
    return store;
  } else return object;
}

export function getStoreValueWithObjectsAsStores(object: StoreValue) {
  const objectAsStore = getObjectAsStore(object);

  if (isPlainObject(objectAsStore))
    Object.entries(objectAsStore).forEach(([key, value]) => {
      objectAsStore.set(key, getStoreValueWithObjectsAsStores(value));
    });

  return objectAsStore;
}
