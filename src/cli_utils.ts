
import { ExpandIamActionsOptions, InvalidActionBehavior } from "./expand.js";
import { readStdin } from "./stdin.js";

interface CliOptions extends ExpandIamActionsOptions {
  showDataVersion: boolean
  readWaitTime: string
}

/**
 * Convert a dash-case string to camelCase
 * @param str the string to convert
 * @returns the camelCase string
 */
export function dashToCamelCase(str: string): string {
  str = str.substring(2)
  return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
}

/**
 * Convert an array of option strings to an object
 *
 * @param optionArgs the array of option strings to convert
 * @returns the object representation of the options
 */
export function convertOptions(optionArgs: string[]): Partial<CliOptions> {
  const options: Record<string, string | boolean> = {} ;

  for(const option of optionArgs) {
    let key: string = option
    let value: boolean | string = true
    if(option.includes('=')) {
      [key,value] = option.split('=')
    }

    options[dashToCamelCase(key)] = value
  }

  if(typeof(options.invalidActionBehavior) === 'string') {
    const behaviorString = options.invalidActionBehavior as string
    const cleanedInput = behaviorString.charAt(0).toUpperCase() + behaviorString.slice(1).toLowerCase();
    const behavior = InvalidActionBehavior[cleanedInput as keyof typeof InvalidActionBehavior];
    if(behavior) {
      options.invalidActionBehavior = behavior
    } else {
      delete options['invalidActionBehavior']
    }
  }

  return options
}

const actionPattern = /\:?([a-zA-Z0-9-]+:[a-zA-Z0-9*]+)/g;
export function extractActionsFromLineOfInput(line: string): string[] {
  const matches = line.matchAll(actionPattern)

  return Array.from(matches)
              .filter((match) => !match[0].startsWith('arn:') && !match[0].startsWith(':'))
              .map((match) => match[1])
}

/**
 * Parse the actions from stdin
 *
 * @returns an array of strings from stdin
 */
export async function parseStdInActions(options: Partial<CliOptions>): Promise<string[]> {
  const delay = options.readWaitTime ? parseInt(options.readWaitTime.replaceAll(/\D/g, '')) : undefined
  const data = await readStdin(delay)
  if(data.length === 0) {
    return []
  }

  const lines = data.split('\n')

  const actions = lines.flatMap(line => extractActionsFromLineOfInput(line))
  return actions
}