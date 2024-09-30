import { beforeEach, describe, expect, it, vi } from 'vitest';
import { convertOptions, dashToCamelCase, extractActionsFromLineOfInput, parseStdIn } from "./cli_utils";
import { InvalidActionBehavior } from './expand.js';
import { readStdin } from './stdin';
vi.mock('./stdin')

beforeEach(() => {
  vi.resetAllMocks()
})

const extractScenarios = [
  {input: '  s3:Get*   ',                expected: ['s3:Get*']},
  {input: '  s3:Get* s3:Put*  ',         expected: ['s3:Get*', 's3:Put*']},
  {input: '  "s3:Get*", "s3:Put*"',      expected: ['s3:Get*', 's3:Put*']},
  {input: '  `s3:Get*`, `s3:Put*`',      expected: ['s3:Get*', 's3:Put*']},
  {input: `  's3:Get*', 's3:Put*'`,      expected: ['s3:Get*', 's3:Put*']},
  {input: `  'resource-Groups:Get*'`,    expected: ['resource-Groups:Get*']},
  {input: `s3:Get*, s3:Put*`,            expected: ['s3:Get*', 's3:Put*']},
  {input: `s3:Get??????, s3:????????`,   expected: ['s3:Get??????', 's3:????????']},
  {input: "s3:Put*",                     expected: ['s3:Put*']},
  {input: ":s3:Put*",                    expected: []},
  {input: 'arn:aws:apigateway:*::/apis', expected: []},
  {input: 'hamburger',                   expected: []},
]

const dashToCamelCaseScenarios = [
  {input: "--distinct", expected: "distinct"},
  {input: "--sort", expected: "sort"},
  {input: "--expand-asterisk", expected: "expandAsterisk"},
  {input: "--expand-service-asterisk", expected: "expandServiceAsterisk"},
  {input: "--error-on-missing-service", expected: "errorOnMissingService"},
  {input: "--error-on-invalid-format", expected: "errorOnInvalidFormat"},
  {input: "--show-data-version", expected: "showDataVersion"},
]

describe('cli_utils', () => {
  describe('extractActionsFromLineOfInput', () => {
    extractScenarios.forEach((scenario, index) => {
      it(`should return for scenario ${index}: ${scenario.input} `, () => {
        // Given the input
        const input = scenario.input

        // When the actions are extracted
        const result = extractActionsFromLineOfInput(input)

        // Then I should get the expected result
        expect(result).toEqual(scenario.expected)
      })
    })
  })

  describe('dashToCamelCase', () => {
    dashToCamelCaseScenarios.forEach((scenario, index) => {
      it(`should return for scenario ${index}: ${scenario.input} `, () => {
        // Given the input
        const input = scenario.input

        // When the input is converted
        const result = dashToCamelCase(input)

        // Then I should get the expected result
        expect(result).toEqual(scenario.expected)
      })
    })
  })

  describe('convertOptions', () => {
    it('should convert the options to keys on an object', () => {
      // Given options as an array of strings
      const optionArgs = ['--distinct', '--sort', '--something-cool', '--key-with-value=10']

      // When the options are converted
      const result = convertOptions(optionArgs)

      // Then each option should be a key on the object
      expect(result).toEqual({
        distinct: true,
        sort: true,
        somethingCool: true,
        keyWithValue: "10",
      })
    })

    it('should convert the invalidActionBehavior to an enum', () => {
      // Given an invalid action behavior option
      const optionArgs = ['--invalid-action-behavior=error']

      // When the options are converted
      const result = convertOptions(optionArgs)

      // Then the invalidActionBehavior should be an enum
      expect(result).toEqual({
        invalidActionBehavior: InvalidActionBehavior.Error,
      })
    })

    it('should remove the invalidActionBehavior if the value is not valid', () => {
      // Given an invalid action behavior option
      const optionArgs = ['--invalid-action-behavior=not-a-real-value']

      // When the options are converted
      const result = convertOptions(optionArgs)

      // Then the invalidActionBehavior should be removed
      expect(result).toEqual({})
    })
  })

  describe('parseStdIn', () => {
    it('should return an empty object if no data is provided', async () => {
      // Given no data is provided
      vi.mocked(readStdin).mockResolvedValue('')

      // When the actions are parsed
      const result = await parseStdIn({})

      // Then I should get an empty object
      expect(result).toEqual({})
    })

    it('should return an array of actions from the data if it cannot be parsed', async () => {
      // Given there is data with actions in multiple lines
      vi.mocked(readStdin).mockResolvedValue('s3:GetObject\ns3:PutObject\ns3:DeleteObject\n')

      // When the actions are parsed
      const result = await parseStdIn({})

      // Then I should get the expected actions
      expect(result).toEqual({strings: ['s3:GetObject', 's3:PutObject', 's3:DeleteObject']})
    })

    it('should return an object if the data can be parsed', async () => {
      // Given there is data that can be parsed
      const dataValue = {
        Action: ["s3:GetObject"],
        Version: "2012-10-17"
      }
      vi.mocked(readStdin).mockResolvedValue(JSON.stringify(dataValue))

      // When the actions are parsed
      const result = await parseStdIn({})

      // Then I should get the expected object
      expect(result).toEqual({object: dataValue})
    })
  })
})

