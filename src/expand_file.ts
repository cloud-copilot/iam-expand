import { expandIamActions, ExpandIamActionsOptions } from "./expand.js";

/**
 * Takes any JSON document and expands any Action or NotAction string or array of strings in the document.
 * *MODIFIES THE DOCUMENT IN PLACE*
 *
 * @param options the options to use when expanding the actions
 * @param document the JSON document to expand
 * @param key the key of the current node in the document
 * @returns the original JSON document with any actions expanded in place
 */
export async function expandJsonDocument(options: Partial<ExpandIamActionsOptions>, document: any, key?: string): Promise<any> {
  if (key === 'Action' || key === 'NotAction') {
    if (typeof document === 'string') {
      return expandIamActions(document, options);
    }
    if (Array.isArray(document) && document.length > 0 && typeof document[0] === 'string') {
      return expandIamActions(document, options);
    }
  }

  if (Array.isArray(document)) {
    const results = [];
    for (const item of document) {
      results.push(await expandJsonDocument(options, item));
    }
    return results;
  }

  if (typeof document === 'object' && document !== null) {
    for (const key of Object.keys(document)) {
      document[key] = await expandJsonDocument(options, document[key], key);
    }
    return document;
  }

  return document;
}