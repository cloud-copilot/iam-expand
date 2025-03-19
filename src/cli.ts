#!/usr/bin/env node

import { parseCliArguments } from '@cloud-copilot/cli'
import { iamDataUpdatedAt, iamDataVersion } from '@cloud-copilot/iam-data'
import { invalidActionBehaviorForString, parseStdIn } from './cli_utils.js'
import { expandIamActions } from './expand.js'
import { invertIamActions } from './invert.js'

const dataPackage = '@cloud-copilot/iam-data'
const fiveDays = 432_000_000

/**
 * Run a function and print the results to the console
 *
 * @param func the function to run
 */
async function runAndPrint(func: () => Promise<string[]>) {
  try {
    const result = await func()
    for (const action of result) {
      console.log(action)
    }
  } catch (e: any) {
    console.error(e.message)
    process.exit(1)
  }
}

/**
 * Check the age of the data package and print a warning if it is over five days old.
 */
async function checkDataAge() {
  const dataFrom = await iamDataUpdatedAt()
  const dataAge = Date.now() - dataFrom.getTime()

  if (dataAge > fiveDays) {
    console.warn('Warning: The data package is over five days old. Please run:')
    console.warn(`  iam-expand --show-data-version`)
  }
}

/**
 * Print a list of warnings to the console
 *
 * @param warnings the list of warnings to print
 */
function printWarnings(warnings: string[]) {
  for (const warning of warnings) {
    console.warn(`Notice: ${warning}`)
  }
}

const actionStrings: string[] = []

async function run() {
  const cli = parseCliArguments(
    'iam-expand',
    {},
    {
      expandAsterisk: {
        character: 'e',
        description: 'Expand the * action to all actions',
        type: 'boolean'
      },
      errorOnInvalidFormat: {
        character: 'f',
        description: 'Throw an error if the action string is not in the correct format',
        type: 'boolean'
      },
      errorOnInvalidService: {
        character: 's',
        description: 'Throw an error if a service is not found',
        type: 'boolean'
      },
      invalidActionBehavior: {
        description: 'What to do when an invalid action is encountered',
        values: 'single',
        type: 'enum',
        validValues: ['remove', 'include', 'error']
      },
      invert: {
        character: 'i',
        description: 'If not JSON, print the inverse of the actions provided',
        type: 'boolean'
      },
      invertNotActions: {
        character: 'n',
        description:
          'If JSON, replace NotAction strings or arrays with Action arrays that have the inverse actions',
        type: 'boolean'
      },
      showDataVersion: {
        character: 'v',
        description: 'Print the version of the iam-data package being used and exit',
        type: 'boolean'
      },
      readWaitMs: {
        description: 'Milliseconds to wait for the first byte from stdin before timing out',
        values: 'single',
        type: 'number'
      }
    },
    {
      operandsName: 'action',
      envPrefix: 'IAM_EXPAND',
      allowOperandsFromStdin: true
    }
  )

  if (cli.args.showDataVersion) {
    const version = await iamDataVersion()
    const updatedAt = await iamDataUpdatedAt()
    console.log(`${dataPackage} version: ${version}`)
    console.log(`Data last updated: ${await iamDataUpdatedAt()}`)
    console.log(`Update with either:`)
    console.log(`  npm update ${dataPackage}`)
    console.log(`  npm update -g ${dataPackage}`)
    return
  }

  const warnings: string[] = []

  const argsWithDefaults = {
    ...cli.args,
    invalidActionBehavior: invalidActionBehaviorForString(cli.args.invalidActionBehavior)
  }

  actionStrings.push(...cli.operands)

  if (actionStrings.length === 0) {
    //If no actions are provided, read from stdin
    const stdInResult = await parseStdIn(argsWithDefaults)
    if (stdInResult.object) {
      console.log(JSON.stringify(stdInResult.object, null, 2))
      if (cli.args.invert) {
        printWarnings([
          '--invert is not supported when processing JSON, ignoring. Did you mean --invert-not-actions ?'
        ])
      }
      await checkDataAge()
      return
    } else if (stdInResult.strings) {
      const otherActions = stdInResult.strings
      if (otherActions.length > 0) {
        if (cli.args.expandAsterisk) {
          warnings.push('--expand-asterisk is not supported when reading from stdin, ignoring.')
        }
      }
      actionStrings.push(...otherActions)
    }
  }

  if (actionStrings.length > 0) {
    if (cli.args.invertNotActions) {
      warnings.push('--invert-not-actions is only supported when processing JSON, ignoring.')
    }
    if (cli.args.invert) {
      await runAndPrint(() => invertIamActions(actionStrings, argsWithDefaults))
    } else {
      await runAndPrint(() => expandIamActions(actionStrings, argsWithDefaults))
    }

    printWarnings(warnings)
    await checkDataAge()
    return
  }

  console.log('No actions provided or input from stdin')
  cli.printHelp()
}

run()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .then(() => {})
  .finally(() => {})
