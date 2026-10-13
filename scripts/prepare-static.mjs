import { copyFile, mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

const root = fileURLToPath(new URL('../', import.meta.url))
const dist = resolve(root, 'dist')
await mkdir(resolve(dist, 'personal-historian'), { recursive: true })
// Explicit source allowlist: never copy archives, exports or browser profiles.
for (const file of ['index.html', 'styles.css', 'app.js', 'favicon.svg']) {
  await copyFile(resolve(root, 'personal-historian', file), resolve(dist, 'personal-historian', file))
}
async function listFiles(directory, prefix = '') {
  const files = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = `${prefix}${entry.name}`
    if (entry.isDirectory()) files.push(...await listFiles(resolve(directory, entry.name), `${path}/`))
    else if (entry.isFile() && path !== 'sw.js') files.push(`./${path}`)
  }
  return files.sort()
}
const files = await listFiles(dist)
const hash = createHash('sha256')
for (const file of files) {
  hash.update(file)
  hash.update(await readFile(resolve(dist, file)))
}
const template = await readFile(resolve(root, 'public/sw.js'), 'utf8')
const worker = template
  .replace('__BUILD_ID__', hash.digest('hex').slice(0, 16))
  .replace(/\/\* __PRECACHE__ \*\/ \[[^\n]*\]/, JSON.stringify(['./', './personal-historian/', ...files]))
await writeFile(resolve(dist, 'sw.js'), worker)
console.log(`Prepared Personal Historian and ${files.length} offline assets`)
