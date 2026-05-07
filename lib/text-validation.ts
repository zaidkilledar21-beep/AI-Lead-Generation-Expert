export function isAsciiWhitespace(char: string) {
  return char === " " || char === "\t" || char === "\n" || char === "\r" || char === "\f";
}

export function hasAsciiWhitespace(value: string) {
  for (const char of value) {
    if (isAsciiWhitespace(char)) return true;
  }
  return false;
}

export function isValidEmailAddress(value: string) {
  if (value.length > 254 || hasAsciiWhitespace(value)) return false;

  const atIndex = value.indexOf("@");
  if (atIndex <= 0 || atIndex !== value.lastIndexOf("@") || atIndex === value.length - 1) {
    return false;
  }

  const localPart = value.slice(0, atIndex);
  const domain = value.slice(atIndex + 1);
  if (localPart.length > 64 || domain.length > 253) return false;
  if (!domain.includes(".") || domain.startsWith(".") || domain.endsWith(".")) return false;

  return domain.split(".").every((label) => label.length > 0 && label.length <= 63);
}
