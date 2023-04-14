import { generateFile } from '../config/interface/code-gen'

async function run() {
  console.log('generating code...')
  await generateFile()
  console.log('done')
}

run()
