import { beforeEach } from 'node:test'
import { describe, expect, it, vi } from 'vitest'
import { expandIamActions } from './expand.js'
import { expandJsonDocument } from './expand_file.js'
import { invertIamActions } from './invert.js'

vi.mock('./expand.js')
vi.mock('./invert.js')

beforeEach(() => {
  vi.resetAllMocks()
})

describe('expand_file', () => {
  describe('expandJsonDocument', () => {
    it('should return a document without actions as is', async () => {
      // Given a document without actions
      const document = {
        key: 'value',
        key2: ['value1', 'value2']
      }

      // When the document is expanded
      const result = await expandJsonDocument({}, document)

      // Then the document should be returned as is
      expect(result).toEqual(document)
    })

    it('should expand a string action', async () => {
      // Given a document with an action
      const document = {
        a: {
          b: {
            Action: 's3:Get*'
          }
        }
      }
      vi.mocked(expandIamActions).mockResolvedValue(['s3:GetObject', 's3:GetBucket'])

      // When the document is expanded
      const result = await expandJsonDocument({}, document)

      // Then the action should be expanded
      const expected = JSON.parse(JSON.stringify(document))
      expected.a.b.Action = ['s3:GetObject', 's3:GetBucket']
      expect(result).toEqual(expected)
    })

    it('should expand an array of string actions', async () => {
      // Given a document with an action
      const document = {
        a: {
          b: {
            Action: ['s3:Get*', 's3:Put*']
          }
        }
      }
      vi.mocked(expandIamActions).mockImplementation(async (actions, options) => {
        return ['s3:GetObject', 's3:GetBucket', 's3:PutObject', 's3:PutBucket']
      })

      // When the document is expanded
      const result = await expandJsonDocument({}, document)

      // Then the action should be expanded
      const expected = JSON.parse(JSON.stringify(document))
      expected.a.b.Action = ['s3:GetObject', 's3:GetBucket', 's3:PutObject', 's3:PutBucket']
      expect(result).toEqual(expected)
    })

    it('should not expand an Action if it is an object', async () => {
      // Given a document with an action
      const document = {
        a: {
          b: {
            Action: {
              key: 'value'
            }
          }
        }
      }

      // When the document is expanded
      const result = await expandJsonDocument({}, document)

      // Then the document should be returned as is
      expect(result).toEqual(document)
    })

    it('should not expand an Action if it is an array of numbers', async () => {
      // Given a document with an action
      const document = {
        a: {
          b: {
            Action: [1, 2, 3]
          }
        }
      }

      // When the document is expanded
      const result = await expandJsonDocument({}, document)

      // Then the document should be returned as is
      expect(result).toEqual(document)
    })

    it('should expand a string NotAction', async () => {
      // Given a document with an action
      const document = {
        a: {
          b: {
            NotAction: 's3:Get*'
          }
        }
      }
      vi.mocked(expandIamActions).mockResolvedValue(['s3:GetObject', 's3:GetBucket'])

      // When the document is expanded
      const result = await expandJsonDocument({}, document)

      // Then the action should be expanded
      const expected = JSON.parse(JSON.stringify(document))
      expected.a.b.NotAction = ['s3:GetObject', 's3:GetBucket']
      expect(result).toEqual(expected)
    })

    it('should expand an array of string NotActions', async () => {
      // Given a document with an action
      const document = {
        a: {
          b: {
            NotAction: ['s3:Get*', 's3:Put*']
          }
        }
      }
      vi.mocked(expandIamActions).mockImplementation(async (actions, options) => {
        return ['s3:GetObject', 's3:GetBucket', 's3:PutObject', 's3:PutBucket']
      })

      // When the document is expanded
      const result = await expandJsonDocument({}, document)

      // Then the action should be expanded
      const expected = JSON.parse(JSON.stringify(document))
      expected.a.b.NotAction = ['s3:GetObject', 's3:GetBucket', 's3:PutObject', 's3:PutBucket']
      expect(result).toEqual(expected)
    })

    it('should not expand a NotAction if it is an object', async () => {
      // Given a document with an action
      const document = {
        a: {
          b: {
            NotAction: {
              key: 'value'
            }
          }
        }
      }

      // When the document is expanded
      const result = await expandJsonDocument({}, document)

      // Then the document should be returned as is
      expect(result).toEqual(document)
    })

    it('should not expand a NotAction if it is an array of numbers', async () => {
      // Given a document with an action
      const document = {
        a: {
          b: {
            NotAction: [1, 2, 3]
          }
        }
      }

      // When the document is expanded
      const result = await expandJsonDocument({}, document)

      // Then the document should be returned as is
      expect(result).toEqual(document)
    })

    it('should invert a NotAction string if invertNotActions is true', async () => {
      // Given a document with a NotAction
      const document = {
        a: {
          b: {
            NotAction: 's3:Get*'
          }
        }
      }
      vi.mocked(expandIamActions).mockResolvedValue(['s3:GetObject', 's3:GetBucket'])
      vi.mocked(invertIamActions).mockResolvedValue(['s3:PutBucket', 's3:PutObject'])

      // When the document is expanded
      const result = await expandJsonDocument({ invertNotActions: true }, document)

      // Then the NotAction should be inverted
      expect(result.a.b).toEqual({ Action: ['s3:PutBucket', 's3:PutObject'] })
    })

    it('should invert a NotAction array if invertNotActions is true', async () => {
      // Given a document with a NotAction
      const document = {
        a: {
          b: {
            NotAction: ['s3:Get*', 's3:Put*']
          }
        }
      }
      vi.mocked(expandIamActions).mockResolvedValue([
        's3:GetObject',
        's3:GetBucket',
        's3:PutObject',
        's3:PutBucket'
      ])
      vi.mocked(invertIamActions).mockResolvedValue(['s3:ListAccessPoints', 's3:ListBucket'])

      // When the document is expanded
      const result = await expandJsonDocument({ invertNotActions: true }, document)

      // Then the NotAction should be inverted
      expect(result.a.b).toEqual({ Action: ['s3:ListAccessPoints', 's3:ListBucket'] })
    })

    it('should not invert a Action string if invertNotActions is true', async () => {
      // Given a document with an Action
      const document = {
        a: {
          b: {
            Action: 's3:Get*'
          }
        }
      }
      vi.mocked(expandIamActions).mockResolvedValue(['s3:GetObject', 's3:GetBucket'])

      // When the document is expanded
      const result = await expandJsonDocument({ invertNotActions: true }, document)

      // Then the document should be returned as is
      expect(result.a.b).toEqual({ Action: ['s3:GetObject', 's3:GetBucket'] })
    })
  })
})
