const unicodeEscapePattern = /\\u([\dA-Fa-f]{4})/gi

/**
 * Checks whether a string contains only one or more asterisk characters.
 *
 * @param value The string to inspect.
 * @returns True when the string contains at least one character and every character is `*`.
 */
export function isAllAsterisks(value: string): boolean {
  if (value.length === 0) {
    return false
  }

  for (let index = 0; index < value.length; index++) {
    if (value.charCodeAt(index) !== 42) {
      return false
    }
  }

  return true
}

/**
 * The service and action name portions of an IAM action string.
 */
export interface IamActionParts {
  /**
   * The service prefix before the separator colon.
   */
  service: string

  /**
   * The action name or wildcard pattern after the separator colon.
   */
  actionName: string
}

/**
 * Tests whether a candidate string matches an IAM wildcard pattern without allocating
 * intermediate strings or regular expressions.
 *
 * @param pattern The IAM wildcard pattern to test, where `*` matches zero or more characters and `?` matches one character.
 * @param candidate The candidate string to check against the pattern.
 * @returns True if the candidate matches the whole pattern, otherwise false.
 */
export function wildcardMatches(pattern: string, candidate: string): boolean {
  let patternIndex = 0
  let candidateIndex = 0
  let starIndex = -1
  let candidateRetryIndex = 0

  while (candidateIndex < candidate.length) {
    if (patternIndex < pattern.length && pattern.charCodeAt(patternIndex) === 42) {
      starIndex = patternIndex
      patternIndex++
      candidateRetryIndex = candidateIndex
      continue
    }

    if (
      patternIndex < pattern.length &&
      (pattern.charCodeAt(patternIndex) === 63 ||
        characterCodesEqualIgnoringAsciiCase(
          pattern.charCodeAt(patternIndex),
          candidate.charCodeAt(candidateIndex)
        ))
    ) {
      patternIndex++
      candidateIndex++
      continue
    }

    if (starIndex !== -1) {
      patternIndex = starIndex + 1
      candidateRetryIndex++
      candidateIndex = candidateRetryIndex
      continue
    }

    return false
  }

  while (patternIndex < pattern.length && pattern.charCodeAt(patternIndex) === 42) {
    patternIndex++
  }

  return patternIndex === pattern.length
}

/**
 * Compares two UTF-16 code units with ASCII case-insensitive semantics.
 *
 * @param leftCode The left code unit to compare.
 * @param rightCode The right code unit to compare.
 * @returns True if the code units are equal exactly or as ASCII letters with different case.
 */
function characterCodesEqualIgnoringAsciiCase(leftCode: number, rightCode: number): boolean {
  if (leftCode === rightCode) {
    return true
  }

  return toLowerAsciiCode(leftCode) === toLowerAsciiCode(rightCode)
}

/**
 * Converts an uppercase ASCII letter code to lowercase without allocating strings.
 *
 * @param code The UTF-16 code unit to convert.
 * @returns The lowercase ASCII code unit, or the original code unit for all other characters.
 */
function toLowerAsciiCode(code: number): number {
  if (code >= 65 && code <= 90) {
    return code + 32
  }

  return code
}

/**
 * Parses an IAM action string into service and action portions without splitting the string.
 *
 * @param actionString The IAM action string to parse.
 * @returns Parsed action parts, or undefined when the string does not contain exactly one colon.
 */
export function parseIamActionParts(actionString: string): IamActionParts | undefined {
  const separatorIndex = actionString.indexOf(':')
  if (separatorIndex === -1 || separatorIndex !== actionString.lastIndexOf(':')) {
    return undefined
  }

  return {
    service: actionString.slice(0, separatorIndex),
    actionName: actionString.slice(separatorIndex + 1)
  }
}

/**
 * Unescapes unicode characters in a string
 *
 * @param str The string to unescape
 * @returns The string with any escaped unicode characters replaced with their actual characters
 */
export function unescapeUnicodeCharacters(str: string): string {
  if (str.indexOf('\\') === -1) {
    return str
  }

  return str.replace(unicodeEscapePattern, (match, code) => {
    return String.fromCharCode(parseInt(code, 16))
  })
}
