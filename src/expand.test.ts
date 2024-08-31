import { iamActionExists, iamActionsForService, iamServiceExists, iamServiceKeys } from '@cloud-copilot/iam-data'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { expandIamActions, InvalidActionBehavior } from "./expand.js"

vi.mock('@cloud-copilot/iam-data')

beforeEach(() => {
  vi.resetAllMocks()
  // jest.resetAllMocks()
})

describe("expand", () => {
  it("should return an empty array when actionString is null", () => {
    //Given actionString is null
    const actionString = null
    //When expand is called with actionString
    const result = expandIamActions(actionString as any)
    //Then result should be an empty array
    expect(result).toEqual([])
  })

  it("should return '*' when actionString is '*' and expandAsterik is false", () => {
    //Given actionString is '*'
    const actionString = '*'
    //When expand is called with actionString
    const result = expandIamActions(actionString)
    //Then result should be '*'
    expect(result).toEqual(['*'])
  })

  it('should return "*" when action string multiple asteriks and expandAsterik is false', () => {
    //Given actionString is multiple asteriks
    const actionString = '***'

    //And expandAsterik is false
    const options = { expandAsterik: false }

    //When expand is called with actionString and options
    const result = expandIamActions(actionString, options)

    //Then result should be '*'
    expect(result).toEqual(['*'])
  })

  it("should expand all actions for all services when actionString is '*' and expandAsterik is true", () => {
    //Given actionString is '*'
    const actionString = '*'
    //And expandAsterik is true
    const options = { expandAsterik: true }
    //And there are services
    vi.mocked(iamServiceKeys).mockReturnValue(['s3', 'ec2'])

    //And there are actions for the services
    vi.mocked(iamActionsForService).mockImplementation(service => {
      if(service === 's3') {
        return ['action1', 'action2']
      }
      if(service === 'ec2') {
        return ['action3', 'action4']
      }
      return []
    })



    //When expand is called with actionString and options
    const result = expandIamActions(actionString, options)
    //Then result should be an array of all actions for all services
    expect(result.sort()).toEqual([
      'ec2:action3',
      'ec2:action4',
      's3:action1',
      's3:action2'
    ])
  })

  it("should do a case insensitive match for the service in the action string", () => {
    //Given actionString is 'S3:GetObject'
    const actionString = 'S3:get*'
    //And s3 service exists
    vi.mocked(iamServiceExists).mockImplementation((s) => s === 's3')
    //And there are matching actions
    vi.mocked(iamActionsForService).mockReturnValue(['GetObject'])

    //When expand is called with actionString
    const result = expandIamActions(actionString)

    //Then result should be an array with the actionString
    expect(result).toEqual(['s3:GetObject'])
  })

  describe("invalid action name", () => {
    it('should return an action without wildcards if it is a valid action', () => {
      //Given actionString contains a valid action
      const actionString = 's3:GetObject'
      //And s3 the service exists
      vi.mocked(iamServiceExists).mockReturnValue(true)
      //And the action does not
      vi.mocked(iamActionExists).mockReturnValue(true)

      //When expand is called with actionString
      const result = expandIamActions(actionString)

      //Then result should be an array with the actionString
      expect(result).toEqual([actionString])
    })

    it("should remove an invalid action if invalidActionBehavior is Remove", () => {
      //Given actionString contains an invalid action
      const actionString = 's3:DoSomethingDumb'
      //And invalidActionBehavior is Remove
      const options = { invalidActionBehavior: InvalidActionBehavior.Remove }
      //And s3 the service exists
      vi.mocked(iamServiceExists).mockReturnValue(true)
      //And the action does not
      vi.mocked(iamActionExists).mockReturnValue(false)

      //When expand is called with actionString
      const result = expandIamActions(actionString, options)

      //Then result should be an array with the valid action
      expect(result).toEqual([])
    })

    it("should include an invalid action if invalidActionBehavior is Include", () => {
      //Given actionString contains an invalid action
      const actionString = 's3:DoSomethingSilly'
      //And invalidActionBehavior is Include
      const options = { invalidActionBehavior: InvalidActionBehavior.Include }
      //And s3 the service exists
      vi.mocked(iamServiceExists).mockReturnValue(true)
      //And the action does not
      vi.mocked(iamActionExists).mockReturnValue(false)

      //When expand is called with actionString
      const result = expandIamActions(actionString, options)

      //Then result should be an array with the invalid action
      expect(result).toEqual([actionString])
    })

    it('should throw an error if the action is invalid and invalidActionBehavior is Error', () => {
      //Given actionString contains an invalid action
      const actionString = 's3:AbsurdlyInvalidAction'
      //And invalidActionBehavior is Error
      const options = { invalidActionBehavior: InvalidActionBehavior.Error }
      //And s3 the service exists
      vi.mocked(iamServiceExists).mockReturnValue(true)
      //And the action does not
      vi.mocked(iamActionExists).mockReturnValue(false)

      //When expand is called with actionString
      //Then an error should be thrown
      expect(() => expandIamActions(actionString, options)).toThrowError('Invalid action')
    })
  })

  describe("when the actions string is in the wrong format", () => {
    it("should return an empty array when there are too many parts and errorOnInvalidFormat is false", () => {
      //Given actionString is in the wrong format
      const actionString = 's3:GetObject:Extra*'
      //And errorOnInvalidFormat is false
      const options = { errorOnInvalidFormat: false }

      //When expand is called with actionString
      const result = expandIamActions(actionString, options)

      //Then result should be an empty array
      expect(result).toEqual([])
    })

    it("should return an empty array when there are too few parts and errorOnInvalidFormat is false", () => {
      //Given actionString has no :
      const actionString = 's3GetObject*'
      //And errorOnInvalidFormat is false
      const options = { errorOnInvalidFormat: false }

      //When expand is called with actionString
      const result = expandIamActions(actionString, options)

      //Then result should be an empty array
      expect(result).toEqual([])
    })

    it("should throw an error when there are too many parts and errorOnInvalidFormat is true", () => {
      //Given actionString is in the wrong format
      const actionString = 's3:GetObject:Extra*'
      //And errorOnInvalidFormat is true
      const options = { errorOnInvalidFormat: true }

      //When expand is called with actionString
      //Then an error should be thrown
      expect(() => expandIamActions(actionString, options)).toThrowError('Invalid action format')
    })

    it("should throw an error when there are too few parts and errorOnInvalidFormat is true", () => {
      //Given actionString has no :
      const actionString = 's3GetObject*'
      //And errorOnInvalidFormat is true
      const options = { errorOnInvalidFormat: true }

      //When expand is called with actionString
      //Then an error should be thrown
      expect(() => expandIamActions(actionString, options)).toThrowError('Invalid action format')
    })
  })

  describe("when the service in the action string does not exist", () => {
    it("should return an empty array when errorOnMissingService is false", () => {
      //Given actionString contains a service that does not exist
      const actionString = 'fake:GetObject*'
      //And errorOnMissingService is false
      const options = { errorOnMissingService: false }

      //When expand is called with actionString
      const result = expandIamActions(actionString, options)

      //Then result should be an empty array
      expect(result).toEqual([])
    })

    it("should throw an error when errorOnMissingService is true", () => {
      //Given actionString contains a service that does not exist
      const actionString = 'fake:GetObject*'
      //And errorOnMissingService is true
      const options = { errorOnMissingService: true }

      //When expand is called with actionString
      //Then an error should be thrown
      expect(() => expandIamActions(actionString, options)).toThrowError('Service not found')
    })
  })

  describe("when the action string contains a wildcard for a service", () => {
    it("should expand not expand the wildcard when expandServiceAsterik is false", () => {
      //Given actionString is 's3:*'
      const actionString = 's3:*'
      //And expandServiceAsterik is false
      const options = { expandServiceAsterik: false }
      //And s3 service exists
      vi.mocked(iamServiceExists).mockReturnValue(true)
      //And there are matching actions
      vi.mocked(iamActionsForService).mockReturnValue(['GetObject', 'PutObject'])

      //When expand is called with actionString
      const result = expandIamActions(actionString, options)

      //Then result should be an array with the original string
      expect(result).toEqual([actionString])
    })

    it("should expand not expand the wildcard when there are multiple asteriks and expandServiceAsterik is false", () => {
      //Given actionString has multiple asteriks for the actions
      const actionString = 's3:****'
      //And expandServiceAsterik is false
      const options = { expandServiceAsterik: false }
      //And s3 service exists
      vi.mocked(iamServiceExists).mockReturnValue(true)
      //And there are matching actions
      vi.mocked(iamActionsForService).mockReturnValue(['GetObject', 'PutObject'])

      //When expand is called with actionString
      const result = expandIamActions(actionString, options)

      //Then result should be an array with the original string
      expect(result).toEqual(['s3:*'])
    })

    it("should expand the wildcard when expandServiceAsterik is true", () => {
      //Given actionString is 's3:*'
      const actionString = 's3:*'
      //And expandServiceAsterik is true
      const options = { expandServiceAsterik: true }
      //And s3 service exists
      vi.mocked(iamServiceExists).mockReturnValue(true)
      //And there are matching actions
      vi.mocked(iamActionsForService).mockReturnValue(['GetObject', 'PutObject'])

      //When expand is called with actionString
      const result = expandIamActions(actionString, options)

      //Then result should be an array of actions
      expect(result).toEqual([
        's3:GetObject',
        's3:PutObject'
      ])
    })
  })


  describe("when the action string contains wildcards", () => {
    it('should expand the wildcard actions at the end', () => {
      //Given actionString is 's3:Get*'
      const actionString = 's3:Get*'
      //And s3 service exists
      vi.mocked(iamServiceExists).mockReturnValue(true)
      //And there are matching actions
      vi.mocked(iamActionsForService).mockReturnValue([
        'GetObject',
        'GetObjectAcl',
        'GetObjectTagging',
        'GetObjectTorrent',
        'PutObject',
        'PutObjectAcl',
        'SomethingGetSomething'
      ])

      //When expand is called with actionString
      const result = expandIamActions(actionString)
      //Then result should be an array of actions
      expect(result).toEqual([
        's3:GetObject',
        's3:GetObjectAcl',
        's3:GetObjectTagging',
        's3:GetObjectTorrent'
      ])
    })

    it('should expand the wildcard actions at the beginning', () => {
      //Given actionString is 's3:*Object'
      const actionString = 's3:*Object'
      //And s3 service exists
      vi.mocked(iamServiceExists).mockReturnValue(true)
      //And there are matching actions
      vi.mocked(iamActionsForService).mockReturnValue([
        'GetObject',
        'GetObjectAcl',
        'GetObjectTagging',
        'GetObjectTorrent',
        'PutObject',
        'PutObjectAcl',
        'SomethingGetSomething'
      ])

      //When expand is called with actionString
      const result = expandIamActions(actionString)
      //Then result should be an array of actions
      expect(result).toEqual([
        's3:GetObject',
        's3:PutObject'
      ])
    })

    it('should expand the wildcard actions in the middle', () => {
      //Given actionString is 's3:Get*Tagging'
      const actionString = 's3:Get*Tagging'
      //And s3 service exists
      vi.mocked(iamServiceExists).mockReturnValue(true)
      //And there are matching actions
      vi.mocked(iamActionsForService).mockReturnValue([
        'GetObject',
        'GetObjectAcl',
        'GetObjectTagging',
        'GetBanskyTagging',
        'GetObjectTorrent',
        'PutObject',
        'PutObjectAcl',
        'SomethingGetSomething'
      ])

      //When expand is called with actionString
      const result = expandIamActions(actionString)
      //Then result should be an array of actions
      expect(result).toEqual([
        's3:GetObjectTagging',
        's3:GetBanskyTagging'
      ])
    })

    it('should expand multiple wildcards', () => {
      //Given actionString is 's3:Get*Tagging*'
      const actionString = 's3:Get*Tagging*'
      //And s3 service exists
      vi.mocked(iamServiceExists).mockReturnValue(true)
      //And there are matching actions
      vi.mocked(iamActionsForService).mockReturnValue([
        'GetObject',
        'GetObjectAcl',
        'GetObjectTagging',
        'GetBanskyTagging',
        'GetTagging',
        'GetObjectTorrent',
        'GetSomethingTaggingSomething',
        'PutObject',
        'PutObjectAcl',
        'SomethingGetSomething'
      ])

      //When expand is called with actionString
      const result = expandIamActions(actionString)
      //Then result should be an array of actions
      expect(result).toEqual([
        's3:GetObjectTagging',
        's3:GetBanskyTagging',
        's3:GetTagging',
        's3:GetSomethingTaggingSomething'
      ])
    })
  })

  describe("when actionStrings is an array", () => {
    it("should return an empty array when actionStrings is an empty array", () => {
      //Given actionStrings is an empty array
      const actionStrings: string[] = []

      //When expand is called with actionStrings
      const result = expandIamActions(actionStrings)

      //Then result should be an empty array
      expect(result).toEqual([])
    })

    it("should return an array of expanded actions when actionStrings is an array of action strings", () => {
      //Given actionStrings is an array of action strings
      const actionStrings = [
        's3:Get*',
        'ec2:*Instances'
      ]
      //And s3 and ec2 services exist
      vi.mocked(iamServiceExists).mockReturnValue(true)
      //And there are actions for the services
      vi.mocked(iamActionsForService).mockImplementation(service => {
        if(service === 's3') {
          return ['GetObject', 'GetObjectTagging', 'PutObject', 'PutObjectTagging']
        }
        if(service === 'ec2') {
          return ['RunInstances', 'TerminateInstances']
        }
        return []
      })

      //When expand is called with actionStrings
      const result = expandIamActions(actionStrings)

      //Then result should be an array of expanded actions
      expect(result.sort()).toEqual([
        'ec2:RunInstances',
        'ec2:TerminateInstances',
        's3:GetObject',
        's3:GetObjectTagging',
      ])
    })
  })

  describe("distinct option", () => {
    it('should return all values when distinct is false', () => {
      //Given two action strings
      const actionString = ['s3:Get*','s3:*Object']
      //And s3 service exists
      vi.mocked(iamServiceExists).mockReturnValue(true)
      //And there are matching actions
      vi.mocked(iamActionsForService).mockReturnValue(['GetObject', 'PutObject', 'GetOtherObject'])

      //When expand is called with actionString and distinct is false
      const result = expandIamActions(actionString, { distinct: false })

      //Then result should be an array of actions, even if they are duplicates
      expect(result).toEqual(['s3:GetObject', 's3:GetOtherObject', 's3:GetObject', 's3:PutObject', 's3:GetOtherObject'])
    })

    it('should return only unique values when distinct is true, and maintain order', () => {
      //Given two action strings
      const actionString = ['s3:Get*','s3:*Object']
      //And s3 service exists
      vi.mocked(iamServiceExists).mockReturnValue(true)
      //And there are matching actions
      vi.mocked(iamActionsForService).mockReturnValue(['GetObject', 'PutObject', 'GetOtherObject'])

      //When expand is called with actionStrings and distinct is true
      const result = expandIamActions(actionString, { distinct: true })
      //Then result should be an array of unique actions
      expect(result).toEqual(['s3:GetObject', 's3:GetOtherObject', 's3:PutObject'])
    })
  })

  describe("sort option", () => {
    it('should return values in the order they were expanded when sort is false', () => {
      //Given two action strings
      const actionString = ['s3:Get*','ec2:Describe*']
      //And s3 service exists
      vi.mocked(iamServiceExists).mockReturnValue(true)
      //And there are matching actions
      vi.mocked(iamActionsForService).mockImplementation(service => {
        if(service === 's3') {
          return ['GetObject', 'GetBucket']
        }
        if(service === 'ec2') {
          return ['DescribeInstances', 'DescribeVolumes']
        }
        return []
      })

      //When expand is called with actionStrings and sort is false
      const result = expandIamActions(actionString, { sort: false })
      //Then result should be an array of actions in the order they were expanded
      expect(result).toEqual(['s3:GetObject', 's3:GetBucket', 'ec2:DescribeInstances', 'ec2:DescribeVolumes'])
    })

    it('should return values sorted when sort is true', () => {
      //Given two action strings
      const actionString = ['s3:Get*','ec2:Describe*']
      //And s3 service exists
      vi.mocked(iamServiceExists).mockReturnValue(true)
      //And there are matching actions
      vi.mocked(iamActionsForService).mockImplementation(service => {
        if(service === 's3') {
          return ['GetObject', 'GetBucket']
        }
        if(service === 'ec2') {
          return ['DescribeInstances', 'DescribeVolumes']
        }
        return []
      })

      //When expand is called with actionStrings and sort is false
      const result = expandIamActions(actionString, { sort: true })
      //Then result should be an array of actions in the order they were expanded
      expect(result).toEqual(['ec2:DescribeInstances', 'ec2:DescribeVolumes', 's3:GetBucket', 's3:GetObject'])
    })
  })


})