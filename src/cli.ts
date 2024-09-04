#!/usr/bin/env node

import { iamDataUpdatedAt, iamDataVersion } from "@cloud-copilot/iam-data";
import { convertOptions, parseStdIn } from "./cli_utils.js";
import { expandIamActions, ExpandIamActionsOptions } from "./expand.js";

const commandName = 'iam-expand'
const dataPackage = '@cloud-copilot/iam-data'

async function expandAndPrint(actionStrings: string[], options: Partial<ExpandIamActionsOptions>) {
  try {
    const result = await expandIamActions(actionStrings, options)
    for (const action of result) {
      console.log(action)
    }
  } catch (e: any) {
    console.error(e.message)
    process.exit(1)
  }
}

function printUsage() {
  console.log('No arguments provided or input from stdin.')
  console.log('Usage:')
  console.log(`  ${commandName} [options] [action1] [action2] ...`)
  console.log(`  <input from stdout> | ${commandName} [options]`)
  console.log('Action Expanding Options:')
  console.log('  --distinct: Remove duplicate actions')
  console.log('  --sort: Sort the actions')
  console.log('  --expand-asterisk: Expand the * action to all actions')
  console.log('  --expand-service-asterisk: Expand service:* to all actions for that service')
  console.log('  --error-on-missing-service: Throw an error if a service is not found')
  console.log('  --error-on-invalid-format: Throw an error if the action string is not in the correct format')
  console.log('  --invalid-action-behavior: What to do when an invalid action is encountered:')
  console.log('    --invalid-action-behavior=remove: Remove the invalid action')
  console.log('    --invalid-action-behavior=include: Include the invalid action')
  console.log('    --invalid-action-behavior=error: Throw an error if an invalid action is encountered')
  console.log('CLI Behavior Options:')
  console.log('  --show-data-version: Print the version of the iam-data package being used and exit')
  console.log('  --read-wait-time: Millisenconds to wait for the first byte from stdin before timing out.')
  console.log('                    Example: --read-wait-time=10_000')
  process.exit(1)
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
    const updatedAt =
    console.log(`${dataPackage} version: ${version}`)
    console.log(`Data last updated: ${await iamDataUpdatedAt()}`)
    console.log(`Update with either:`)
    console.log(`  npm update ${dataPackage}`)
    console.log(`  npm update -g ${dataPackage}`)
    return
  }

  if(actionStrings.length === 0) {
    //If no actions are provided, read from stdin
    const stdInResult = await parseStdIn(options)
    if(stdInResult.object) {
      console.log(JSON.stringify(stdInResult.object, null, 2))
      return
    } else if (stdInResult.strings) {
      const otherActions = stdInResult.strings
      if(otherActions.length > 0 && options.expandAsterisk) {
        console.warn('Notice: --expand-asterisk is not supported when reading from stdin, ignoring.')
      }
      actionStrings.push(...otherActions)
    }
  }

  if(actionStrings.length > 0) {
    await expandAndPrint(actionStrings, options)
    return
  }

  printUsage()
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
}).then(() => process.exit(0)).finally(() => {})
