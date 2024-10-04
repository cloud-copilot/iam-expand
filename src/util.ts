export const allAsterisksPattern = /^\*+$/i

export function convertStringToPattern(actionString: string): RegExp {
  const pattern = "^" + actionString.replace(/\?/g, '.').replace(/\*/g, '.*?') + "$"
  return new RegExp(pattern, 'i')
}