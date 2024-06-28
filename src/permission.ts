export type Permission = "r" | "w" | "rw" | "none";

export function isReadable(permission: Permission): boolean {
  return ["r", "rw"].includes(permission);
}

export function isWritable(permission: Permission): boolean {
  return ["w", "rw"].includes(permission);
}

export const permissionMetadataKey = Symbol("permission");

export function getPermission(target: any, propertyKey: string): Permission {
  const permissionMetadata: Permission | undefined = Reflect.getMetadata(
    permissionMetadataKey,
    target,
    propertyKey,
  );

  return permissionMetadata ?? target.defaultPolicy;
}
