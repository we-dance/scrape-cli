import * as YAML from 'yaml'
import { promises as fs } from 'fs'
import * as mkdirp from 'mkdirp'
import * as path from 'path'

export default async (filePath: string, content: any) => {
  YAML.scalarOptions.null.nullStr = '~'

  const doc = new YAML.Document()
  doc.contents = content
  const output = doc.toString()
  const exportPath = path.dirname(filePath)

  await mkdirp(exportPath)
  await fs.writeFile(filePath, output)

  return filePath
}
