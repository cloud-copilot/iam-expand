import { readStdin } from '@cloud-copilot/cli'
import { ExpandIamActionsOptions, InvalidActionBehavior } from './expand.js'
import { expandJsonDocument, ExpandJsonDocumentOptions } from './expand_file.js'

interface CliOptions extends ExpandIamActionsOptions, ExpandJsonDocumentOptions {
  invert: boolean
  showDataVersion: boolean
  readWaitMs: number | undefined
}

const actionPattern = /\:?((\\u[0-9]{4}|[a-zA-Z0-9-])+:(\\u[0-9]{4}|[a-zA-Z0-9*\?]|)+)/g
export function extractActionsFromLineOfInput(line: string): string[] {
  const matches = line.matchAll(actionPattern)
  return Array.from(matches)
    .filter((match) => !match[0].startsWith('arn:') && !match[0].startsWith(':'))
    .map((match) => match[1])
}

export function invalidActionBehaviorForString(
  behaviorString: string | undefined
): InvalidActionBehavior | undefined {
  if (!behaviorString) {
    return undefined
  }
  const cleanedInput =
    behaviorString.charAt(0).toUpperCase() + behaviorString.slice(1).toLowerCase()
  return InvalidActionBehavior[cleanedInput as keyof typeof InvalidActionBehavior]
}

/**
 * Parse the actions from stdin
 *
 * @returns an array of strings from stdin
 */
export async function parseStdIn(
  options: Partial<CliOptions>
): Promise<{ strings?: string[]; object?: any }> {
  const data = await readStdin(options.readWaitMs)
  if (data.length === 0) {
    return {}
  }

  try {
    const object = await expandJsonDocument(options, JSON.parse(data))
    return { object }
  } catch (err: any) {}

  const lines = data.split('\n')
  const actions = lines.flatMap((line) => extractActionsFromLineOfInput(line))
  return { strings: actions }
}
