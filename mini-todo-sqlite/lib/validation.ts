export function isValidTitle(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function isValidCompleted(value: unknown): value is boolean {
  return typeof value === "boolean";
}
