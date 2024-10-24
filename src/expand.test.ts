import { iamActionDetails, iamActionExists, iamActionsForService, iamServiceExists, iamServiceKeys } from '@cloud-copilot/iam-data'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { expandIamActions, InvalidActionBehavior } from "./expand.js"

vi.mock('@cloud-copilot/iam-data')

beforeEach(() => {
  vi.resetAllMocks()
})

describe("expand", () => {
  it("should return an empty array when actionString is null", async () => {
    //Given actionString is null
    const actionString = null
    //When expand is called with actionString
    const result = await expandIamActions(actionString as any)
    //Then result should be an empty array
    expect(result).toEqual([])
  })

  it("should return '*' when actionString is '*' and expandAsterisk is false", async () => {
    //Given actionString is '*'
    const actionString = '*'
    //When expand is called with actionString
    const result = await expandIamActions(actionString)
    //Then result should be '*'
    expect(result).toEqual(['*'])
  })

  it('should return "*" when action string multiple asterisks and expandAsterisk is false', async () => {
    //Given actionString is multiple asterisks
    const actionString = '***'

    //And expandAsterisk is false
    const options = { expandAsterisk: false }

    //When expand is called with actionString and options
    const result = await expandIamActions(actionString, options)

    //Then result should be '*'
    expect(result).toEqual(['*'])
  })

  it("should expand all actions for all services when actionString is '*' and expandAsterisk is true", async () => {
    //Given actionString is '*'
    const actionString = '*'
    //And expandAsterisk is true
    const options = { expandAsterisk: true }
    //And there are services
    vi.mocked(iamServiceKeys).mockResolvedValue(['s3', 'ec2'])

    //And there are actions for the services
    vi.mocked(iamActionsForService).mockImplementation(async (service) => {
      if(service === 's3') {
        return ['action1', 'action2']
      }
      if(service === 'ec2') {
        return ['action3', 'action4']
      }
      return []
    })

    //When expand is called with actionString and options
    const result = await expandIamActions(actionString, options)
    //Then result should be an array of all actions for all services
    expect(result.sort()).toEqual([
      'ec2:action3',
      'ec2:action4',
      's3:action1',
      's3:action2'
    ])
  })

  it("should do a case insensitive match for the service in the action string", async () => {
    //Given actionString is 'S3:GetObject'
    const actionString = 'S3:get*'
    //And s3 service exists
    vi.mocked(iamServiceExists).mockImplementation(async (s) => s === 's3')
    //And there are matching actions
    vi.mocked(iamActionsForService).mockResolvedValue(['GetObject'])

    //When expand is called with actionString
    const result = await expandIamActions(actionString)

    //Then result should be an array with the actionString
    expect(result).toEqual(['s3:GetObject'])
  })

  describe("invalid action name", () => {
    it('should return an action without wildcards if it is a valid action', async () => {
      //Given actionString contains a valid action
      const actionString = 's3:getobject'
      //And s3 the service exists
      vi.mocked(iamServiceExists).mockResolvedValue(true)
      //And the action does not
      vi.mocked(iamActionExists).mockResolvedValue(true)
      vi.mocked(iamActionDetails).mockResolvedValue({name: 'GetObject'} as any)

      //When expand is called with actionString
      const result = await expandIamActions(actionString)

      //Then result should be an array with the actionString
      expect(result).toEqual(['s3:GetObject'])
    })

    it("should remove an invalid action if invalidActionBehavior is Remove", async () => {
      //Given actionString contains an invalid action
      const actionString = 's3:DoSomethingDumb'
      //And invalidActionBehavior is Remove
      const options = { invalidActionBehavior: InvalidActionBehavior.Remove }
      //And s3 the service exists
      vi.mocked(iamServiceExists).mockResolvedValue(true)
      //And the action does not
      vi.mocked(iamActionExists).mockResolvedValue(false)

      //When expand is called with actionString
      const result = await expandIamActions(actionString, options)

      //Then result should be an array with the valid action
      expect(result).toEqual([])
    })

    it("should include an invalid action if invalidActionBehavior is Include", async () => {
      //Given actionString contains an invalid action
      const actionString = 's3:DoSomethingSilly'
      //And invalidActionBehavior is Include
      const options = { invalidActionBehavior: InvalidActionBehavior.Include }
      //And s3 the service exists
      vi.mocked(iamServiceExists).mockResolvedValue(true)
      //And the action does not
      vi.mocked(iamActionExists).mockResolvedValue(false)

      //When expand is called with actionString
      const result = await expandIamActions(actionString, options)

      //Then result should be an array with the invalid action
      expect(result).toEqual([actionString])
    })

    it('should throw an error if the action is invalid and invalidActionBehavior is Error', async () => {
      //Given actionString contains an invalid action
      const actionString = 's3:AbsurdlyInvalidAction'
      //And invalidActionBehavior is Error
      const options = { invalidActionBehavior: InvalidActionBehavior.Error }
      //And s3 the service exists
      vi.mocked(iamServiceExists).mockResolvedValue(true)
      //And the action does not
      vi.mocked(iamActionExists).mockResolvedValue(false)

      //When expand is called with actionString
      //Then an error should be thrown
      expect(
        expandIamActions(actionString, options)
      ).rejects.toThrowError('Invalid action')
    })
  })

  describe("when the actions string is in the wrong format", () => {
    it("should return an empty array when there are too many parts and errorOnInvalidFormat is false", async () => {
      //Given actionString is in the wrong format
      const actionString = 's3:GetObject:Extra*'
      //And errorOnInvalidFormat is false
      const options = { errorOnInvalidFormat: false }

      //When expand is called with actionString
      const result = await expandIamActions(actionString, options)

      //Then result should be an empty array
      expect(result).toEqual([])
    })

    it("should return an empty array when there are too few parts and errorOnInvalidFormat is false", async () => {
      //Given actionString has no :
      const actionString = 's3GetObject*'
      //And errorOnInvalidFormat is false
      const options = { errorOnInvalidFormat: false }

      //When expand is called with actionString
      const result = await expandIamActions(actionString, options)

      //Then result should be an empty array
      expect(result).toEqual([])
    })

    it("should throw an error when there are too many parts and errorOnInvalidFormat is true", async () => {
      //Given actionString is in the wrong format
      const actionString = 's3:GetObject:Extra*'
      //And errorOnInvalidFormat is true
      const options = { errorOnInvalidFormat: true }

      //When expand is called with actionString
      //Then an error should be thrown
      expect(
        () => expandIamActions(actionString, options)
      ).rejects.toThrowError('Invalid action format')
    })

    it("should throw an error when there are too few parts and errorOnInvalidFormat is true", async () => {
      //Given actionString has no :
      const actionString = 's3GetObject*'
      //And errorOnInvalidFormat is true
      const options = { errorOnInvalidFormat: true }

      //When expand is called with actionString
      //Then an error should be thrown
      expect(
        () => expandIamActions(actionString, options)
      ).rejects.toThrowError('Invalid action format')
    })
  })

  describe("when the service in the action string does not exist", () => {
    it("should return an empty array when errorOnInvalidService is false", async () => {
      //Given actionString contains a service that does not exist
      const actionString = 'fake:GetObject*'
      //And errorOnMissingService is false
      const options = { errorOnInvalidService: false }

      //When expand is called with actionString
      const result = await expandIamActions(actionString, options)

      //Then result should be an empty array
      expect(result).toEqual([])
    })

    it("should throw an error when errorOnInvalidService is true", async () => {
      //Given actionString contains a service that does not exist
      const actionString = 'fake:GetObject*'
      //And errorOnMissingService is true
      const options = { errorOnInvalidService: true }

      //When expand is called with actionString
      //Then an error should be thrown
      expect(
        () => expandIamActions(actionString, options)
      ).rejects.toThrowError('Service not found')
    })
  })

  describe("when the action string contains a wildcard for a service", () => {
    it("should expand the wildcard ", async () => {
      //Given actionString is 's3:*'
      const actionString = 's3:*'
      //And s3 service exists
      vi.mocked(iamServiceExists).mockResolvedValue(true)
      //And there are matching actions
      vi.mocked(iamActionsForService).mockResolvedValue(['GetObject', 'PutObject'])

      //When expand is called with actionString
      const result = await expandIamActions(actionString)

      //Then result should be an array of actions
      expect(result).toEqual([
        's3:GetObject',
        's3:PutObject'
      ])
    })
  })


  describe("when the action string contains wildcards", () => {
    it('should expand the wildcard actions at the end', async () => {
      //Given actionString is 's3:Get*'
      const actionString = 's3:Get*'
      //And s3 service exists
      vi.mocked(iamServiceExists).mockResolvedValue(true)
      //And there are matching actions
      vi.mocked(iamActionsForService).mockResolvedValue([
        'GetObject',
        'GetObjectAcl',
        'GetObjectTagging',
        'GetObjectTorrent',
        'PutObject',
        'PutObjectAcl',
        'SomethingGetSomething'
      ])

      //When expand is called with actionString
      const result = await expandIamActions(actionString)
      //Then result should be an array of actions
      expect(result).toEqual([
        's3:GetObject',
        's3:GetObjectAcl',
        's3:GetObjectTagging',
        's3:GetObjectTorrent'
      ])
    })

    it('should expand the wildcard actions at the beginning', async () => {
      //Given actionString is 's3:*Object'
      const actionString = 's3:*Object'
      //And s3 service exists
      vi.mocked(iamServiceExists).mockResolvedValue(true)
      //And there are matching actions
      vi.mocked(iamActionsForService).mockResolvedValue([
        'GetObject',
        'GetObjectAcl',
        'GetObjectTagging',
        'GetObjectTorrent',
        'PutObject',
        'PutObjectAcl',
        'SomethingGetSomething'
      ])

      //When expand is called with actionString
      const result = await expandIamActions(actionString)
      //Then result should be an array of actions
      expect(result).toEqual([
        's3:GetObject',
        's3:PutObject'
      ])
    })

    it('should expand the wildcard actions in the middle', async () => {
      //Given actionString is 's3:Get*Tagging'
      const actionString = 's3:Get*Tagging'
      //And s3 service exists
      vi.mocked(iamServiceExists).mockResolvedValue(true)
      //And there are matching actions
      vi.mocked(iamActionsForService).mockResolvedValue([
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
      const result = await expandIamActions(actionString)
      //Then result should be an array of actions
      expect(result).toEqual([
        's3:GetBanskyTagging',
        's3:GetObjectTagging'
      ])
    })

    it('should expand multiple wildcards', async () => {
      //Given actionString is 's3:Get*Tagging*'
      const actionString = 's3:Get*Tagging*'
      //And s3 service exists
      vi.mocked(iamServiceExists).mockResolvedValue(true)
      //And there are matching actions
      vi.mocked(iamActionsForService).mockResolvedValue([
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
      const result = await expandIamActions(actionString)
      //Then result should be an array of actions
      expect(result).toEqual([
        's3:GetBanskyTagging',
        's3:GetObjectTagging',
        's3:GetSomethingTaggingSomething',
        's3:GetTagging'
      ])
    })
  })

  describe("when actionStrings is an array", () => {
    it("should return an empty array when actionStrings is an empty array", async () => {
      //Given actionStrings is an empty array
      const actionStrings: string[] = []

      //When expand is called with actionStrings
      const result = await expandIamActions(actionStrings)

      //Then result should be an empty array
      expect(result).toEqual([])
    })

    it("should return an array of expanded actions when actionStrings is an array of action strings", async () => {
      //Given actionStrings is an array of action strings
      const actionStrings = [
        's3:Get*',
        'ec2:*Instances'
      ]
      //And s3 and ec2 services exist
      vi.mocked(iamServiceExists).mockResolvedValue(true)
      //And there are actions for the services
      vi.mocked(iamActionsForService).mockImplementation(async (service) => {
        if(service === 's3') {
          return ['GetObject', 'GetObjectTagging', 'PutObject', 'PutObjectTagging']
        }
        if(service === 'ec2') {
          return ['RunInstances', 'TerminateInstances']
        }
        return []
      })

      //When expand is called with actionStrings
      const result = await expandIamActions(actionStrings)

      //Then result should be an array of expanded actions
      expect(result.sort()).toEqual([
        'ec2:RunInstances',
        'ec2:TerminateInstances',
        's3:GetObject',
        's3:GetObjectTagging',
      ])
    })
  })

  describe('action strings with question marks', () => {
    it('should expand the action string with all question marks', async () => {
      //Given actionString has quesiton marks
      const actionString = 's3:?????????'

      //And s3 service exists
      vi.mocked(iamServiceExists).mockResolvedValue(true)
      //And there are matching actions
      vi.mocked(iamActionsForService).mockResolvedValue(['GetObject', 'PutObject', 'ListObjectTags', 'GetJob'])

      //When expand is called with actionString
      const result = await expandIamActions(actionString)

      //Then result should be an array of actions
      expect(result).toEqual([
        's3:GetObject',
        's3:PutObject'
      ])
    })

    it('should expand the action string with partial question marks', async () => {
      //Given actionString has quesiton marks in part of the action
      const actionString = 's3:Get??????'

      //And s3 service exists
      vi.mocked(iamServiceExists).mockResolvedValue(true)
      //And there are matching actions
      vi.mocked(iamActionsForService).mockResolvedValue(['GetObject', 'PutObject', 'ListObjectTags', 'GetJob', 'GetBucket'])

      //When expand is called with actionString
      const result = await expandIamActions(actionString)

      //Then result should be an array of actions
      expect(result).toEqual([
        's3:GetBucket',
        's3:GetObject'
      ])
    })
  })

  it('should return only unique values', async () => {
    //Given two action strings
    const actionString = ['s3:Get*','s3:*Object']
    //And s3 service exists
    vi.mocked(iamServiceExists).mockResolvedValue(true)
    //And there are matching actions
    vi.mocked(iamActionsForService).mockResolvedValue(['GetObject', 'PutObject', 'GetOtherObject'])

    //When expand is called with actionStrings and distinct is true
    const result = await expandIamActions(actionString)
    //Then result should be an array of unique actions
    expect(result).toEqual(['s3:GetObject', 's3:GetOtherObject', 's3:PutObject'])
  })

  it('should return values sorted', async () => {
    //Given two action strings
    const actionString = ['s3:Get*','ec2:Describe*']
    //And s3 service exists
    vi.mocked(iamServiceExists).mockResolvedValue(true)
    //And there are matching actions
    vi.mocked(iamActionsForService).mockImplementation(async (service) => {
      if(service === 's3') {
        return ['GetObject', 'GetBucket']
      }
      if(service === 'ec2') {
        return ['DescribeInstances', 'DescribeVolumes']
      }
      return []
    })

    //When expand is called with actionStrings
    const result = await expandIamActions(actionString)

    //Then result should be an array of sorted actions
    expect(result).toEqual(['ec2:DescribeInstances', 'ec2:DescribeVolumes', 's3:GetBucket', 's3:GetObject'])
  })

  it('should replace unicode characters', async () => {
    //Given an Action string with unicode characters
    const actionString = 's3:*\\u0042ucket*'

    //And s3 service exists
    vi.mocked(iamServiceExists).mockResolvedValue(true)
    //And there are matching actions
    vi.mocked(iamActionsForService).mockResolvedValue(['GetBucket', 'PutBucket', 'ListBuckets'])

    //When expand is called with actionString
    const result = await expandIamActions(actionString)

    //Then result should be an array of actions
    expect(result).toEqual([
      's3:GetBucket',
      's3:ListBuckets',
      's3:PutBucket'
    ])
  })

})