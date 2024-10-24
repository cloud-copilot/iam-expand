export const allAsterisksPattern = /^\*+$/i

export function convertStringToPattern(actionString: string): RegExp {
  const pattern = "^" + actionString.replace(/\?/g, '.').replace(/\*/g, '.*?') + "$"
  return new RegExp(pattern, 'i')
}

/**
 * Unecapes unicode characters in a string
 *
 * @param str The string to unescape
 * @returns The string with any escaped unicode characters replaced with their actual characters
 */
export function unescapeUnicodeCharacters(str: string): string {
  return str.replace(/\\u([\dA-Fa-f]{4,6})/gi, (match, code) => {
    return String.fromCharCode(parseInt(code, 16));
  });
}
