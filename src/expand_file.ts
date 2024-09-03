import { expandIamActions, ExpandIamActionsOptions } from "./expand.js"

/**
 * Takes any JSON document and expands any Action found in the document
 *
 * @param options the options to use when expanding the actions
 * @param document the JSON document to expand
 * @param key the key of the current node in the document
 * @returns the expanded JSON document
 */
export async function expandJsonDocument(options: Partial<ExpandIamActionsOptions>, document: any, key?: string): Promise<any> {
  if(key === 'Action' || key === 'NotAction') {
    if(typeof document === 'string') {
      return await expandIamActions(document, options)
    }
    if(Array.isArray(document) && document.length > 0 && typeof document[0] === 'string') {
      const value =  await expandIamActions(document, {...options, distinct: true})
      return value
    }
  }

  if(Array.isArray(document)) {
    return Promise.all(document.map(async (item) => {
      return expandJsonDocument(options, item)
    }))
  }

  if(typeof document === 'object') {
    const keys = Object.keys(document)
    const newObject: any = {}
    for(const key of keys) {
      const value = document[key]
      newObject[key] = await expandJsonDocument(options, value, key)
    }
    return newObject
  }

  return document
}