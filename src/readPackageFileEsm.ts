import { createPackageFileReader, type PackageFileReader } from '@cloud-copilot/cli'

let levels = 2
//@ts-ignore
if (import.meta.url.includes('src')) {
  levels = 1
}

let fileReader: PackageFileReader | undefined = undefined

export function getPackageFileReader(): PackageFileReader {
  if (!fileReader) {
    //@ts-ignore
    fileReader = createPackageFileReader(import.meta.url, levels)
  }
  return fileReader
}
