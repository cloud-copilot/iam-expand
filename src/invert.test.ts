import { iamActionsForService, iamServiceKeys } from '@cloud-copilot/iam-data'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { invert } from './invert.js'

vi.mock('@cloud-copilot/iam-data')

beforeEach(() => {
  vi.resetAllMocks()
})

describe('invert', () => {

  it('should throw an error if no action string is provided', async () => {
    //Given no action string
    const actionString = undefined

    //When invert is called
    const result = invert(actionString as any)

    //Then an error should be thrown
    await expect(result).rejects.toThrow('actionStringOrStrings is required')
  })

  it('should return nothing if an asteristk wildcard is provided', async () => {
    //Given an asterisk wildcard
    const actionString = '*'

    //When invert is called
    const result = await invert(actionString)

    //Then an empty array should be returned
    expect(result).toEqual([])
  })

  it('should ignore a service if the service is followed by an asterisk wildcard', async () => {
    //Given a service followed by an asterisk wildcard
    const actionString = 's3:*'
    //And there are two services with actions
    vi.mocked(iamServiceKeys).mockResolvedValue(['s3', 'ec2'])
    vi.mocked(iamActionsForService).mockImplementation(async (service) => {
      if(service === 's3') {
        return ['action1', 'action2']
      }
      if(service === 'ec2') {
        return ['action3', 'action4']
      }
      return []
    })

    //When invert is called
    const result = await invert(actionString)

    //Then an empty array should be returned
    expect(result).toEqual(['ec2:action3', 'ec2:action4'])
  })

  it('should exclude actions that match the patterns provided', async () => {
    //Given a service with a pattern to exclude
    const actionString = 's3:Get*'
    //And there are two services with actions
    vi.mocked(iamServiceKeys).mockResolvedValue(['s3', 'ec2'])
    vi.mocked(iamActionsForService).mockImplementation(async (service) => {
      if(service === 's3') {
        return ['GetObjcet', 'PutObject']
      }
      if(service === 'ec2') {
        return ['GetObject', 'PutObject']
      }
      return []
    })

    //When invert is called
    const result = await invert(actionString)

    //Then an empty array should be returned
    expect(result).toEqual(['ec2:GetObject', 'ec2:PutObject', 's3:PutObject'])
  })

  it('should invert patterns against multiple services', async () => {
    //Given multiple service patterns to exclude
    const actionString = ['s3:Get*', 'ec2:Put*']
    //And there are two services with actions
    vi.mocked(iamServiceKeys).mockResolvedValue(['s3', 'ec2'])
    vi.mocked(iamActionsForService).mockImplementation(async (service) => {
      if(service === 's3') {
        return ['GetObject', 'PutObject']
      }
      if(service === 'ec2') {
        return ['GetObject', 'PutObject']
      }
      return []
    })

    //When invert is called
    const result = await invert(actionString)

    //Then an empty array should be returned
    expect(result).toEqual(['ec2:GetObject', 's3:PutObject'])
  })

  it('shoud exclude multiple patterns for a single service', async () => {
    //Given multiple patterns to exclude for a single service
    const actionString = ['s3:Get*', 's3:Put*']
    //And there are two services with actions
    vi.mocked(iamServiceKeys).mockResolvedValue(['s3', 'ec2'])
    vi.mocked(iamActionsForService).mockImplementation(async (service) => {
      if(service === 's3') {
        return ['GetObject', 'PutObject', 'DeleteObject']
      }
      if(service === 'ec2') {
        return ['GetObject', 'PutObject']
      }
      return []
    })

    //When invert is called
    const result = await invert(actionString)

    //Then an empty array should be returned
    expect(result).toEqual(['ec2:GetObject', 'ec2:PutObject', 's3:DeleteObject'])
  })

  it('should ignore invalid action strings', async () => {
    //Given an invalid action string
    const actionString = 's3:GetObject:PutObject'
    //And there are two services with actions
    vi.mocked(iamServiceKeys).mockResolvedValue(['s3', 'ec2'])
    vi.mocked(iamActionsForService).mockImplementation(async (service) => {
      if(service === 's3') {
        return ['GetObject', 'PutObject']
      }
      if(service === 'ec2') {
        return ['GetObject', 'PutObject']
      }
      return []
    })

    //When invert is called
    const result = await invert(actionString)

    //Then an empty array should be returned
    expect(result).toEqual(['ec2:GetObject', 'ec2:PutObject', 's3:GetObject', 's3:PutObject'])
  })
})