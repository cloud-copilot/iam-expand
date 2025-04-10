import { describe, expect, it } from 'vitest'
import { actionMatchesPattern, matchesAnyAction } from './actions.js'

describe('matchesAnyAction', () => {
  it('should return true if it matches a known IAM action', async () => {
    //Given a known IAM action
    const action = 's3:ListAllMyBuckets'

    //When checking if it matches any known IAM actions
    const result = await matchesAnyAction(action)

    //Then it should return true
    expect(result).toBe(true)
  })

  it('should return false if it does not match any known IAM action', async () => {
    //Given an unknown IAM action
    const action = 's3:UnknownAction'

    //When checking if it matches any known IAM actions
    const result = await matchesAnyAction(action)

    //Then it should return false
    expect(result).toBe(false)
  })

  it('should return false if the service does not exist', async () => {
    //Given an action with a non-existent service
    const action = 'nonexistentservice:ListAllMyBuckets'

    //When checking if it matches any known IAM actions
    const result = await matchesAnyAction(action)

    //Then it should return false
    expect(result).toBe(false)
  })

  it('should return false if the action string is not in the correct format', async () => {
    //Given an action string that is not in the correct format
    const action = 'invalidactionstring'

    //When checking if it matches any known IAM actions
    const result = await matchesAnyAction(action)

    //Then it should return false
    expect(result).toBe(false)
  })

  it('should return true for wildcard actions that match known IAM actions', async () => {
    //Given a wildcard action that matches known IAM actions
    const action = 's3:List*'

    //When checking if it matches any known IAM actions
    const result = await matchesAnyAction(action)

    //Then it should return true
    expect(result).toBe(true)
  })

  it('should return false for wildcard actions that do not match any known IAM actions', async () => {
    //Given a wildcard action that does not match any known IAM actions
    const action = 's3:*ThisDoesNotExist*'

    //When checking if it matches any known IAM actions
    const result = await matchesAnyAction(action)

    //Then it should return false
    expect(result).toBe(false)
  })
})

describe('actionMatchesPattern', () => {
  it('should return true if it is an exact match', () => {
    //Given an action and a pattern that is an exact match
    const action = 's3:ListAllMyBuckets'
    const pattern = 's3:ListAllMyBuckets'

    //When checking if the action matches the pattern
    const result = actionMatchesPattern(action, pattern)

    //Then it should return true
    expect(result).toBe(true)
  })

  it('should return true if it is an exact match ignoring case', () => {
    //Given an action and a pattern that is an exact match ignoring case
    const action = 's3:ListAllMyBuckets'
    const pattern = 'S3:LISTALLMYBUCKETS'

    //When checking if the action matches the pattern
    const result = actionMatchesPattern(action, pattern)

    //Then it should return true
    expect(result).toBe(true)
  })

  it('should return true if an exact match with unicode characters', () => {
    //Given an action and a pattern that is an exact match with unicode characters
    const action = 's3:ListAllMyBucke\u0074s'
    const pattern = 's3:ListAllMy\u0042uckets'

    //When checking if the action matches the pattern
    const result = actionMatchesPattern(action, pattern)

    //Then it should return true
    expect(result).toBe(true)
  })

  it('should return false if it is not an exact match', () => {
    //Given an action and a pattern that is not an exact match
    const action = 's3:ListAllMyBuckets'
    const pattern = 's3:ListNoteOfMyBuckets'

    //When checking if the action matches the pattern
    const result = actionMatchesPattern(action, pattern)

    //Then it should return false
    expect(result).toBe(false)
  })

  it('should return true if it matches the wildcard pattern with *', () => {
    //Given an action and a wildcard pattern that matches
    const action = 's3:ListAllMyBuckets'
    const pattern = 's3:List*'

    //When checking if the action matches the pattern
    const result = actionMatchesPattern(action, pattern)

    //Then it should return true
    expect(result).toBe(true)
  })

  it('should return true if it matches the wildcard pattern with ?', () => {
    //Given an action and a wildcard pattern that matches
    const action = 's3:ListAllMyBuckets'
    const pattern = 's3:List?llMyBuckets'

    //When checking if the action matches the pattern
    const result = actionMatchesPattern(action, pattern)

    //Then it should return true
    expect(result).toBe(true)
  })

  it('should return true if it matches the wildcard pattern ignoring case', () => {
    //Given an action and a wildcard pattern that matches ignoring case
    const action = 's3:ListAllMyBuckets'
    const pattern = 'S3:LIST*'

    //When checking if the action matches the pattern
    const result = actionMatchesPattern(action, pattern)

    //Then it should return true
    expect(result).toBe(true)
  })

  it('should return true if it matches the wildcard pattern with unicode characters', () => {
    //Given an action and a wildcard pattern that matches with unicode characters
    const action = 's3:ListAllMyBuckets'
    const pattern = 's3:List\u0041*'

    //When checking if the action matches the pattern
    const result = actionMatchesPattern(action, pattern)

    //Then it should return true
    expect(result).toBe(true)
  })
})
