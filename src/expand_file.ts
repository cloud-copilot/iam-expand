import { expandIamActions, ExpandIamActionsOptions } from "./expand.js";
import { invert } from "./invert.js";

export interface ExpandJsonDocumentOptions extends ExpandIamActionsOptions {
  invertNotActions: boolean
}

const defaultOptions: Pick<ExpandJsonDocumentOptions, 'invertNotActions'> = {
  invertNotActions: false
}

/**
 * Takes any JSON document and expands any Action or NotAction string or array of strings in the document.
 * *MODIFIES THE DOCUMENT IN PLACE*
 *
 * @param options the options to use when expanding the actions
 * @param document the JSON document to expand
 * @param key the key of the current node in the document
 * @returns the original JSON document with any actions expanded in place
 */
export async function expandJsonDocument(options: Partial<ExpandJsonDocumentOptions>, document: any, key?: string): Promise<any> {
  options = {...defaultOptions, ...options};

  if (key === 'Action' || key === 'NotAction') {
    if (isStringOrArrayofStrings(document)) {
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
    if(options.invertNotActions && document.NotAction && isStringOrArrayofStrings(document.NotAction)) {
      document.Action = invert(document.NotAction)
      delete document.NotAction
    }

    for (const key of Object.keys(document)) {
      document[key] = await expandJsonDocument(options, document[key], key);
    }

    return document;
  }

  return document;
}

/**
 * Checks to see if a value is a string or an array of strings, used for type narrowing
 *
 * @param value The value to test
 * @returns
 */
function isStringOrArrayofStrings(value: any): value is string | string[] {
  return typeof value === 'string' || (Array.isArray(value) && value.length > 0 && typeof value[0] === 'string');
}