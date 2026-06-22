import { iamActionsForService, iamServiceKeys } from '@cloud-copilot/iam-data'
import { isAllAsterisks, parseIamActionParts, wildcardMatches } from './util.js'

export interface InvertIamActionsOptions {}

export async function invertIamActions(
  actionStringOrStrings: string | string[],
  overrideOptions?: Partial<InvertIamActionsOptions>
): Promise<string[]> {
  if (!actionStringOrStrings) {
    throw new Error('at least one action must be provided to invert')
  }

  let allActionsFound = false
  const servicesToExclude = new Set<string>()
  const excludePatterns: Record<string, string[]> = {}

  const actionsToInvert = Array.isArray(actionStringOrStrings)
    ? actionStringOrStrings
    : [actionStringOrStrings]
  for (const action of actionsToInvert) {
    if (isAllAsterisks(action)) {
      allActionsFound = true
      break
    }
    const parts = parseIamActionParts(action)
    if (!parts) {
      continue
    }
    const service = parts.service.toLowerCase()
    const wildcardActions = parts.actionName.toLowerCase()
    if (isAllAsterisks(wildcardActions)) {
      servicesToExclude.add(service)
      continue
    }
    if (!excludePatterns[service]) {
      excludePatterns[service] = []
    }
    excludePatterns[service].push(wildcardActions)
  }

  if (allActionsFound) {
    return []
  }

  const allServices = await iamServiceKeys()
  const actionLists = await Promise.all(
    allServices.map(async (serviceKey) => {
      if (servicesToExclude.has(serviceKey)) {
        return []
      }
      const serviceActions = await iamActionsForService(serviceKey)
      const excludePatternsForService = excludePatterns[serviceKey] || []
      if (excludePatternsForService.length === 0) {
        return serviceActions.map((action) => `${serviceKey}:${action}`)
      }
      return serviceActions
        .filter((action) => {
          return !excludePatternsForService.some((pattern) => wildcardMatches(pattern, action))
        })
        .map((action) => `${serviceKey}:${action}`)
    })
  )

  return Array.from(new Set(actionLists.flat())).sort()
}
