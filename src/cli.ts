#!/usr/bin/env node

import { iamDataUpdatedAt, iamDataVersion } from "@cloud-copilot/iam-data";
import { convertOptions, parseStdIn } from "./cli_utils.js";
import { expandIamActions } from "./expand.js";
import { invertIamActions } from "./invert.js";

const commandName = 'iam-expand'
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

  if(dataAge > fiveDays) {
    console.warn('Warning: The data package is over five days old. Please run:')
    console.warn(`  iam-expand --show-data-version`)
  }
}

/**
 * Print the usage of the CLI to the console
 */
function printUsage() {
  console.log('No arguments provided or input from stdin.')
  console.log('Usage:')
  console.log(`  ${commandName} [options] [action1] [action2] ...`)
  console.log(`  <input from stdout> | ${commandName} [options]`)
  console.log('Action Expanding Options:')
  console.log('  --expand-asterisk: Expand the * action to all actions')
  console.log('  --error-on-invalid-format: Throw an error if the action string is not in the correct format')
  console.log('  --error-on-invalid-service: Throw an error if a service is not found')
  console.log('  --invalid-action-behavior: What to do when an invalid action is encountered:')
  console.log('    --invalid-action-behavior=remove: Remove the invalid action')
  console.log('    --invalid-action-behavior=include: Include the invalid action')
  console.log('    --invalid-action-behavior=error: Throw an error if an invalid action is encountered')

  console.log('Inverting Actions:')
  console.log('  --invert: If not JSON, print the inverse of the actions provided')
  console.log('  --invert-not-actions: If JSON, replace NotAction strings or arrays with Action arrays that have the inverse actions')


  console.log('CLI Behavior Options:')
  console.log('  --show-data-version: Print the version of the iam-data package being used and exit')
  console.log('  --read-wait-ms: Milliseconds to wait for the first byte from stdin before timing out.')
  console.log('                  Example: --read-wait-ms=10_000')
  process.exit(1)
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

const args = process.argv.slice(2); // Ignore the first two elements
const actionStrings: string[] = []
const optionStrings: string[] = []

for (const arg of args) {
  if(arg.startsWith('--')) {
    optionStrings.push(arg)
  } else {
    actionStrings.push(arg)
  }
}

async function run() {
  const options = convertOptions(optionStrings)
  if(options.showDataVersion) {
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

  if(actionStrings.length === 0) {
    //If no actions are provided, read from stdin
    const stdInResult = await parseStdIn(options)
    if(stdInResult.object) {
      console.log(JSON.stringify(stdInResult.object, null, 2))
      if(options.invert) {
        printWarnings(['--invert is not supported when processing JSON, ignoring. Did you mean --invert-not-actions ?'])
      }
      await checkDataAge()
      return
    } else if (stdInResult.strings) {
      const otherActions = stdInResult.strings
      if(otherActions.length > 0) {
        if(options.expandAsterisk) {
          warnings.push('--expand-asterisk is not supported when reading from stdin, ignoring.')
        }
      }
      actionStrings.push(...otherActions)
    }
  }

  if(actionStrings.length > 0) {
    if(options.invertNotActions) {
      warnings.push('--invert-not-actions is only supported when processing JSON, ignoring.')
    }
    if(options.invert) {
      await runAndPrint(() => invertIamActions(actionStrings, options))
    } else {
      await runAndPrint(() => expandIamActions(actionStrings, options))
    }

    printWarnings(warnings)
    await checkDataAge()
    return
  }

  printUsage()
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
}).then(() => {}).finally(() => {})
