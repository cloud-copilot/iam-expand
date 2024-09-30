import { iamActionDetails, iamActionExists, iamActionsForService, iamServiceExists, iamServiceKeys } from '@cloud-copilot/iam-data'

export enum InvalidActionBehavior {
  Remove = "Remove",
  Error = "Error",
  Include = "Include",
}

/**
 * Options for the expand function
 *
 */
export interface ExpandIamActionsOptions {
  /**
   * If true, a single `*` will be expanded to all actions for all services
   * If false, a single `*` will be returned as is
   * Default: false
   */
  expandAsterisk: boolean

  /**
   * If true, `service:*` will be expanded to all actions for that service
   * If false, `service:*` will be returned as is
   * Default: false
   */
  expandServiceAsterisk: boolean

  /**
   * If true, an error will be thrown if the action string is not in the correct format
   * If false, an empty array will be returned
   * Default: false
   */
  errorOnInvalidFormat: boolean

  /**
   * If true, an error will be thrown if the service in the action string does not exist
   * If false, an empty array will be returned
   * Default: false
   */
  errorOnInvalidService: boolean

  /**
   * The behavior to use when an invalid action is encountered without wildcards
   * @{InvalidActionBehavior.Remove} will remove the invalid action from the output
   * @{InvalidActionBehavior.Error} will throw an error if an invalid action is encountered
   * @{InvalidActionBehavior.Include} will include the invalid action in the output
   *
   * Default: InvalidActionBehavior.Remove
   */
  invalidActionBehavior: InvalidActionBehavior
}

const defaultOptions: ExpandIamActionsOptions = {
  expandAsterisk: false,
  expandServiceAsterisk: false,
  errorOnInvalidFormat: false,
  errorOnInvalidService: false,
  invalidActionBehavior: InvalidActionBehavior.Remove,
}

const allAsterisksPattern = /^\*+$/i

/**
 * Expands an IAM action string that contains wildcards.
 * If the action string contains no wildcards, it is returned as is.
 * @see {@link ExpandIamActionsOptions} for options to customize behavior
 *
 * If any options are set to throw an error, the function will throw an error if validation fails for a single value.
 *
 * @param actionStringOrStrings An IAM action or array IAM action(s) that may contain wildcards
 * @param overrideOptions Options to override the default behavior
 * @returns An array of expanded action strings flattend to a single array
 */
export async function expandIamActions(actionStringOrStrings: string | string[], overrideOptions?: Partial<ExpandIamActionsOptions>): Promise<string[]> {
  const options = {...defaultOptions, ...overrideOptions}

  if(!actionStringOrStrings) {
    //Just in case the user passes in null or undefined
    return []
  }

  if(Array.isArray(actionStringOrStrings)) {
    const actionLists = await Promise.all(actionStringOrStrings.map(async (actionString) => {
      return expandIamActions(actionString, options);
    }))

    const allMatches = Array.from(new Set(actionLists.flat()))
    allMatches.sort()

    return allMatches
  }

  const actionString = actionStringOrStrings.trim()

  if(actionString.match(allAsterisksPattern)) {
    if(options.expandAsterisk) {
      //If that's really what you want...
      const allActions = []
      const serviceKeys = await iamServiceKeys()
      for await (const service of serviceKeys) {
        const serviceActions = await iamActionsForService(service)
        allActions.push(...serviceActions.map(action => `${service}:${action}`))
      }
      return allActions
    }
    return ['*']
  }

  if(!actionString.includes(':')) {
    if(options.errorOnInvalidFormat) {
      throw new Error(`Invalid action format: ${actionString}`)
    }
    return []
  }

  const parts = actionString.split(':')
  if(parts.length !== 2) {
    if(options.errorOnInvalidFormat) {
      throw new Error(`Invalid action format: ${actionString}`)
    }
    return []
  }

  const [service, wildcardActions] = parts.map(part => part.toLowerCase())
  if(!await iamServiceExists(service)) {
    if(options.errorOnInvalidService) {
      throw new Error(`Service not found: ${service}`)
    }
    return []
  }

  if(wildcardActions.match(allAsterisksPattern)) {
    if(options.expandServiceAsterisk) {
      const actionsForService = await iamActionsForService(service)
      return actionsForService.map(action => `${service}:${action}`)
    }
    return [`${service}:*`]
  }

  if(!actionString.includes('*') && !actionString.includes('?')) {
    const actionExists = await iamActionExists(service, wildcardActions)
    if(actionExists) {
      const details = await iamActionDetails(service, wildcardActions)
      return [service + ":" + details.name]
    }

    if(options.invalidActionBehavior === InvalidActionBehavior.Remove) {
      return []
    } else if(options.invalidActionBehavior === InvalidActionBehavior.Include) {
      return [actionString]
    } else if(options.invalidActionBehavior === InvalidActionBehavior.Error) {
      throw new Error(`Invalid action: ${actionString}`)
    } else {
      //This should never happen
      throw new Error(`Invalid invalidActionBehavior: ${options.invalidActionBehavior}`)
    }
  }

  const allActions = await iamActionsForService(service)
  const pattern = "^" + wildcardActions.replace(/\?/g, '.').replace(/\*/g, '.*?') + "$"
  const regex = new RegExp(pattern, 'i')
  const matchingActions = allActions.filter(action => regex.test(action)).map(action => `${service}:${action}`)
  matchingActions.sort()

  return matchingActions
}