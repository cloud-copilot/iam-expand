import { iamActionExists, iamActionsForService, iamServiceExists } from '@cloud-copilot/iam-data'
import { parseIamActionParts, unescapeUnicodeCharacters, wildcardMatches } from './util.js'

/**
 * Check if the action supplied matches any known IAM actions.
 *
 * @param action the "service:action" string to check if it matches any known IAM actions. Can include wildcards.
 * @return true if the action matches at least one known IAM action, false otherwise.
 */
export async function matchesAnyAction(action: string): Promise<boolean> {
  const parts = parseIamActionParts(action)
  if (!parts) {
    return false
  }
  const { service, actionName } = parts

  const serviceExists = await iamServiceExists(service)
  if (!serviceExists) {
    return false
  }

  if (actionName.includes('*') || actionName.includes('?')) {
    const allActions = await iamActionsForService(service)
    return allActions.some((knownAction) => actionMatchesPattern(knownAction, actionName))
  }

  return iamActionExists(service, actionName)
}

/**
 * Checks to see if the action matches the provided pattern IAM action pattern.
 *
 * @param action the action to check, should not contain wildcards
 * @param pattern the pattern to match against, may contain wildcards
 */
export function actionMatchesPattern(action: string, pattern: string): boolean {
  return wildcardMatches(unescapeUnicodeCharacters(pattern), unescapeUnicodeCharacters(action))
}
