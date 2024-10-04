import { iamActionsForService, iamServiceKeys } from "@cloud-copilot/iam-data"
import { allAsterisksPattern, convertStringToPattern } from "./util.js"

export interface InvertIamActionsOptions {
}

const defaultOptions: InvertIamActionsOptions = {}

export async function invert(actionStringOrStrings: string | string[], overrideOptions?: Partial<InvertIamActionsOptions>): Promise<string[]> {
  const options = {...defaultOptions, ...overrideOptions}

  if(!actionStringOrStrings) {
    throw new Error('at least one action must be provided to invert')
  }

  let allActionsFound = false
  const servicesToExclude = new Set<string>()
  const excludePatterns: Record<string, RegExp[]> = {}

  const actionsToInvert = Array.isArray(actionStringOrStrings) ? actionStringOrStrings : [actionStringOrStrings]
  for(const action of actionsToInvert) {
    if(action.match(allAsterisksPattern)) {
      allActionsFound = true
      break;
    }
    const parts = action.split(':')
    if(parts.length !== 2) {
      continue;
    }
    const [service, wildcardActions] = parts.map(part => part.toLowerCase())
    if(wildcardActions.match(allAsterisksPattern)) {
      servicesToExclude.add(service)
      continue;
    }
    if(!excludePatterns[service]) {
      excludePatterns[service] = []
    }
    excludePatterns[service].push(convertStringToPattern(wildcardActions))
  }

  if(allActionsFound) {
    return []
  }

  const allServices = await iamServiceKeys()
  const actionLists = await Promise.all(allServices.map(async (serviceKey) => {
    if(servicesToExclude.has(serviceKey)) {
      return []
    }
    const serviceActions = await iamActionsForService(serviceKey)
    const excludePatternsForService = excludePatterns[serviceKey] || []
    if(excludePatternsForService.length === 0) {
      return serviceActions.map(action => `${serviceKey}:${action}`)
    }
    return serviceActions.filter(action => {
      return !excludePatternsForService.some(pattern => action.match(pattern))
    }).map(action => `${serviceKey}:${action}`)
  }))

  return  Array.from(new Set(actionLists.flat())).sort()
}