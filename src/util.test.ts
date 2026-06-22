import { describe, expect, it } from 'vitest'
import { isAllAsterisks, unescapeUnicodeCharacters, wildcardMatches } from './util.js'

describe('unescapeUnicodeCharacters', () => {
  it('should unescape unicode characters', () => {
    //Given a string with unicode escape sequences
    const input = '\\u0041\\u0042\\u0043' // ABC

    //When unescaping the unicode characters
    const result = unescapeUnicodeCharacters(input)

    //Then the result should be the unescaped string
    expect(result).toBe('ABC')
  })

  it('should return the original string when it has no unicode escape sequences', () => {
    //Given a string without unicode escape sequences
    const input = 's3:GetObject'

    //When unescaping unicode characters
    const result = unescapeUnicodeCharacters(input)

    //Then the original string should be returned
    expect(result).toBe(input)
  })

  it('should preserve uppercase unicode escape handling', () => {
    //Given a string with an uppercase unicode escape sequence prefix
    const input = '\\U0041'

    //When unescaping unicode characters
    const result = unescapeUnicodeCharacters(input)

    //Then the escape sequence should be converted
    expect(result).toBe('A')
  })
})

describe('isAllAsterisks', () => {
  it('should return true only for non-empty strings made of asterisks', () => {
    //Given values with and without only asterisks
    const allAsterisks = '***'
    const empty = ''
    const mixed = '**a'

    //When checking whether each value is all asterisks
    const allAsterisksResult = isAllAsterisks(allAsterisks)
    const emptyResult = isAllAsterisks(empty)
    const mixedResult = isAllAsterisks(mixed)

    //Then only the all-asterisks value should match
    expect(allAsterisksResult).toBe(true)
    expect(emptyResult).toBe(false)
    expect(mixedResult).toBe(false)
  })
})

describe('wildcardMatches', () => {
  it('should match exact strings while ignoring ASCII case', () => {
    //Given an exact pattern and candidate with different casing
    const pattern = 'S3:LISTALLMYBUCKETS'
    const candidate = 's3:ListAllMyBuckets'

    //When checking the candidate against the pattern
    const result = wildcardMatches(pattern, candidate)

    //Then the candidate should match
    expect(result).toBe(true)
  })

  it('should match asterisks without creating a regular expression', () => {
    //Given a pattern with a star wildcard
    const pattern = 's3:Get*Tagging'
    const candidate = 's3:GetBucketTagging'

    //When checking the candidate against the pattern
    const result = wildcardMatches(pattern, candidate)

    //Then the candidate should match
    expect(result).toBe(true)
  })

  it('should match question marks as exactly one character', () => {
    //Given a pattern with question mark wildcards
    const pattern = 's3:Get??????'
    const candidate = 's3:GetObject'

    //When checking the candidate against the pattern
    const result = wildcardMatches(pattern, candidate)

    //Then the candidate should match
    expect(result).toBe(true)
  })

  it('should reject candidates that do not match the full pattern', () => {
    //Given a pattern and a non-matching candidate
    const pattern = 's3:Get*Tagging'
    const candidate = 's3:GetObject'

    //When checking the candidate against the pattern
    const result = wildcardMatches(pattern, candidate)

    //Then the candidate should not match
    expect(result).toBe(false)
  })
})
