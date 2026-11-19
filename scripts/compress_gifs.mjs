import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const version = process.argv[2] || 'advanced-kit'
if (!['latest', 'advanced-kit', 'standard-kit', 'ultimate-kit'].includes(version)) {
  throw new Error(`Unknown content version: ${version}`)
}
const contentRoot = path.join(repositoryRoot, 'content', version)
const backupRoot = await fs.mkdtemp(path.join(os.tmpdir(), `aimecha-${version}-gifs-`))
const report = { version, backupRoot, maxWidth: 960, quality: 80, files: [], updatedDocuments: [] }
const reportPath = path.join(backupRoot, 'report.json')

async function walk(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const file = path.join(directory, entry.name)
    if (entry.isDirectory()) files.push(...await walk(file))
    else files.push(file)
  }
  return files
}

function duration(metadata) {
  return (metadata.delay || []).reduce((total, delay) => total + delay, 0)
}

async function backup(file) {
  const destination = path.join(backupRoot, path.relative(contentRoot, file))
  await fs.mkdir(path.dirname(destination), { recursive: true })
  await fs.copyFile(file, destination)
}

sharp.cache(false)
sharp.concurrency(2)
const files = await walk(contentRoot)
const gifs = files.filter(file => /\.gif$/i.test(file))
const conversions = new Map()
const encoded = new Map()
console.log(`Original files will be backed up to ${backupRoot}`)

for (const [index, source] of gifs.entries()) {
  const target = source.replace(/\.gif$/i, '.webp')
  try {
    await fs.access(target)
    throw new Error(`Target already exists: ${target}`)
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
  const input = await fs.readFile(source)
  const hash = createHash('sha256').update(input).digest('hex')
  const before = await sharp(source, { animated: true, limitInputPixels: false }).metadata()
  if (encoded.has(hash)) {
    await fs.copyFile(encoded.get(hash), target)
  } else {
    await sharp(source, { animated: true, limitInputPixels: false })
      .resize({ width: report.maxWidth, withoutEnlargement: true })
      .webp({ quality: report.quality, effort: 5, loop: before.loop, delay: before.delay })
      .toFile(target)
    encoded.set(hash, target)
  }
  const after = await sharp(target, { animated: true, limitInputPixels: false }).metadata()
  const outputBytes = (await fs.stat(target)).size
  if (outputBytes >= input.length || after.format !== 'webp' ||
      (before.pages > 1 && !(after.pages > 1)) ||
      duration(before) !== duration(after) || before.loop !== after.loop) {
    throw new Error(`Animation validation failed: ${source}. Original has been preserved.`)
  }
  await backup(source)
  conversions.set(path.resolve(source), target)
  report.files.push({
    source: path.relative(contentRoot, source).replaceAll('\\', '/'),
    target: path.relative(contentRoot, target).replaceAll('\\', '/'),
    originalBytes: input.length, compressedBytes: outputBytes,
    originalWidth: before.width, width: after.width,
    originalFrames: before.pages, frames: after.pages,
    durationMs: duration(after), loop: after.loop
  })
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2))
  console.log(`[${index + 1}/${gifs.length}] ${path.relative(contentRoot, source)}: ${(input.length / 1048576).toFixed(2)} -> ${(outputBytes / 1048576).toFixed(2)} MiB`)
}

// Update references before removing any original GIF. All originals and changed
// documents are backed up outside the repository to keep them out of Git pushes.
for (const file of files.filter(file => /\.(md|html|css|js|json)$/i.test(file))) {
  const text = await fs.readFile(file, 'utf8')
  let updated = text
  for (const [source, target] of conversions) {
    const relative = path.relative(path.dirname(file), source).replaceAll('\\', '/')
    const replacement = path.relative(path.dirname(file), target).replaceAll('\\', '/')
    updated = updated.split(relative).join(replacement)
    updated = updated.split(encodeURI(relative)).join(encodeURI(replacement))
  }
  if (updated !== text) {
    await backup(file)
    await fs.writeFile(file, updated)
    report.updatedDocuments.push(path.relative(contentRoot, file).replaceAll('\\', '/'))
  }
}
for (const source of conversions.keys()) {
  if (!source.startsWith(`${contentRoot}${path.sep}`)) throw new Error(`Unexpected source: ${source}`)
  await fs.unlink(source)
}
report.originalBytes = report.files.reduce((total, file) => total + file.originalBytes, 0)
report.compressedBytes = report.files.reduce((total, file) => total + file.compressedBytes, 0)
await fs.writeFile(reportPath, JSON.stringify(report, null, 2))
console.log(`Total: ${(report.originalBytes / 1048576).toFixed(2)} -> ${(report.compressedBytes / 1048576).toFixed(2)} MiB`)
console.log(`Report and original files: ${backupRoot}`)
