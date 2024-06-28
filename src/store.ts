import { JSONArray, JSONObject, JSONPrimitive } from "./json-types";
import "reflect-metadata";
import {
  getKeysFromPath,
  getPathFromKeys,
  getStoreValueWithObjectsAsStores,
  getValueFromChildrenKeys,
  writeToObject,
} from "./nestUtils";
import {
  getPermission,
  isReadable,
  isWritable,
  Permission,
  permissionMetadataKey,
} from "./permission";

export { Permission };

export type StoreResult = Store | JSONPrimitive | undefined;

export type StoreValue =
  | JSONObject
  | JSONArray
  | StoreResult
  | (() => StoreResult);

function ensureIsStoreResultCompatible(value: unknown): StoreResult {
  if (
    !(
      value === null ||
      value === undefined ||
      typeof value === "boolean" ||
      typeof value === "number" ||
      typeof value === "string" ||
      typeof value === "object" ||
      typeof value === "function"
    )
  )
    throw new Error(`Type ${typeof value} is not JSON-compatible`);

  if (typeof value === "object") {
    if (!(value instanceof Store))
      throw new Error("only store implementations are allowed");

    // Not compatible with loops
    // for (const [key, val] of Object.entries(value)) {
    //   ensureIsStoreResultCompatible(val);
    // }
  }

  return value;
}
function ensureIsStoreValueCompatible(value: unknown): StoreValue {
  if (typeof value === "function") {
    return ensureIsStoreResultCompatible(value());
  } else if (typeof value === "object" && Array.isArray(value)) {
    return value;
  } else return ensureIsStoreResultCompatible(value);
}

export interface IStore {
  defaultPolicy: Permission;
  allowedToRead(key: string): boolean;
  allowedToWrite(key: string): boolean;
  read(path: string): StoreResult;
  write(path: string, value: StoreValue): StoreValue;
  writeEntries(entries: JSONObject): void;
  entries(): JSONObject;
}

export function Restrict(permission?: Permission) {
  return Reflect.metadata(permissionMetadataKey, permission);
}

export class Store implements IStore {
  defaultPolicy: Permission = "rw";

  get(key: string): StoreValue {
    const value = this[key as keyof typeof this];
    return ensureIsStoreValueCompatible(value);
  }

  set(key: string, value: StoreValue): void {
    (this as any)[key] = value;
  }

  allowedToRead(key: string): boolean {
    const permission = getPermission(this, key);
    return isReadable(permission);
  }

  allowedToWrite(key: string): boolean {
    const permission = getPermission(this, key);
    return isWritable(permission);
  }

  read(path: string): StoreResult {
    const [parentKey, ...childrenKeys] = getKeysFromPath(path);

    if (!this.allowedToRead(parentKey))
      throw Error(`Not allowed to read "${parentKey}" (full path "${path}")`);

    if (childrenKeys.length > 0) {
      const childrenPath = getPathFromKeys(childrenKeys);

      const value = this.read(parentKey);

      if (value instanceof Store) return value.read(childrenPath);
      else return getValueFromChildrenKeys(value, childrenKeys);
    } else {
      const value = this.get(path);

      const resolvedValue = typeof value === "function" ? value() : value;

      return ensureIsStoreResultCompatible(resolvedValue);
    }
  }

  write(path: string, value: StoreValue): StoreValue {
    const [parentKey, ...childrenKeys] = getKeysFromPath(path);

    if (childrenKeys.length > 0) {
      if (!(this.allowedToWrite(parentKey) || this.allowedToRead(parentKey)))
        throw Error(
          `Not allowed to write or read key "${parentKey}" (full path "${path}", deep nesting write require at least read or write access on parents)"`,
        );

      const childrenPath = getPathFromKeys(childrenKeys);

      const childValue = this.get(parentKey);

      if (childValue instanceof Store) childValue.write(childrenPath, value);
      else {
        this.set(
          parentKey,
          writeToObject(
            childValue,
            childrenKeys,
            getStoreValueWithObjectsAsStores(value),
          ),
        );
      }
    } else {
      if (!this.allowedToWrite(path))
        throw Error(`Not allowed to write "${parentKey}"`);

      this.set(path, getStoreValueWithObjectsAsStores(value));
    }
    return value;
  }

  writeEntries(entries: JSONObject): void {
    Object.entries(entries).forEach(([key, value]) => this.write(key, value));
  }

  entries(): JSONObject {
    return Object.entries(this).reduce((entriesObject, [key, value]) => {
      return this.allowedToRead(key)
        ? {
            ...entriesObject,
            [key]: value,
          }
        : entriesObject;
    }, {});
  }
}
