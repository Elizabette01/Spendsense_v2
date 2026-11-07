export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;

export function normalizePassword(password: string): string {
  return password.normalize("NFKC");
}

export function countCharacters(value: string): number {
  return [...value].length;
}

export function isValidPasswordLength(password: string): boolean {
  const length = countCharacters(normalizePassword(password));
  return length >= PASSWORD_MIN_LENGTH && length <= PASSWORD_MAX_LENGTH;
}