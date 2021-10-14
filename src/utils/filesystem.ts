import * as path from 'path'
import * as fs from 'fs'
import * as YAML from 'yaml'
import * as mkdirp from 'mkdirp'
import save from '../exporters/yaml'

export async function deleteFiles(pathToFiles: string) {
  if (!fs.existsSync(pathToFiles)) {
    return
  }

  fs.readdirSync(pathToFiles).forEach((file) => {
    const filePath = path.join(pathToFiles, file)
    fs.unlinkSync(filePath)
  })
}

export async function saveFiles(exportPath: string, content: any) {
  const files = Object.keys(content.files)

  await mkdirp(exportPath)

  let count = 0

  for (let file of files) {
    const filePath = path.join(exportPath, file)

    try {
      await save(filePath + '.yml', content.files[file])

      count++
    } catch (error) {
      console.error(error)
    }
  }

  return count
}

export function readFile(pathToFile: string) {
  if (!fs.existsSync(pathToFile)) {
    return {}
  }

  const fileContents = fs.readFileSync(pathToFile, 'utf8')
  return YAML.parse(fileContents)
}

export function readFiles(pathToFiles: string) {
  if (!fs.existsSync(pathToFiles)) {
    return []
  }

  const properties = [] as any

  fs.readdirSync(pathToFiles).forEach((file) => {
    const pathToFile = path.join(pathToFiles, file)
    const data = readFile(pathToFile)

    properties.push(data)
  })

  return properties
}
