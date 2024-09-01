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
  expandAsterik: boolean

  /**
   * If true, `service:*` will be expanded to all actions for that service
   * If false, `service:*` will be returned as is
   * Default: false
   */
  expandServiceAsterik: boolean

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
  errorOnMissingService: boolean

  /**
   * If true, only unique values will be returned, while maintaining order
   * If false, all values will be returned, even if they are duplicates
   * Default: false
   */
  distinct: boolean


  /**
   * The behavior to use when an invalid action is encountered without wildcards
   * @{InvalidActionBehavior.Remove} will remove the invalid action from the output
   * @{InvalidActionBehavior.Error} will throw an error if an invalid action is encountered
   * @{InvalidActionBehavior.Include} will include the invalid action in the output
   *
   * Default: InvalidActionBehavior.Remove
   */
  invalidActionBehavior: InvalidActionBehavior

  /**
   * If true, the returned array will be sorted
   * If false, the returned array will be in the order they were expanded
   * Default: false
   */
  sort: boolean
}

const defaultOptions: ExpandIamActionsOptions = {
  expandAsterik: false,
  expandServiceAsterik: false,
  errorOnInvalidFormat: false,
  errorOnMissingService: false,
  invalidActionBehavior: InvalidActionBehavior.Remove,
  distinct: false,
  sort: false
}

const allAsteriksPattern = /^\*+$/i

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
export function expandIamActions(actionStringOrStrings: string | string[], overrideOptions?: Partial<ExpandIamActionsOptions>): string[] {
  const options = {...defaultOptions, ...overrideOptions}

  if(!actionStringOrStrings) {
    //Just in case the user passes in null or undefined
    return []
  }

  if(Array.isArray(actionStringOrStrings)) {
    let allMatches = actionStringOrStrings.flatMap(actionString => expandIamActions(actionString, options))
    if(options.distinct) {
      const aSet = new Set<string>()
      allMatches = allMatches.filter((value) => {
        if(aSet.has(value)) {
          return false
        }
        aSet.add(value)
        return true
      })
    }
    if(options.sort) {
      allMatches.sort()
    }
    return allMatches
  }

  const actionString = actionStringOrStrings.trim()

  if(actionString.match(allAsteriksPattern)) {
    if(options.expandAsterik) {
      //If that's really what you want...
      return iamServiceKeys().flatMap(
        service => iamActionsForService(service).map(action => `${service}:${action}`)
      )
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
  if(!iamServiceExists(service)) {
    if(options.errorOnMissingService) {
      throw new Error(`Service not found: ${service}`)
    }
    return []
  }

  if(wildcardActions.match(allAsteriksPattern)) {
    if(options.expandServiceAsterik) {
      return iamActionsForService(service).map(action => `${service}:${action}`)
    }
    return [`${service}:*`]
  }

  if(!actionString.includes('*')) {
    const actionExists = iamActionExists(service, wildcardActions)
    if(actionExists) {
      return [service + ":" + iamActionDetails(service, wildcardActions).name]
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

  const allActions = iamActionsForService(service)
  const pattern = "^" + wildcardActions.replace(/\*/g, '.*?') + "$"
  const regex = new RegExp(pattern, 'i')
  const matchingActions = allActions.filter(action => regex.test(action)).map(action => `${service}:${action}`)
  if(options.sort) {
    matchingActions.sort()
  }

  return matchingActions
}