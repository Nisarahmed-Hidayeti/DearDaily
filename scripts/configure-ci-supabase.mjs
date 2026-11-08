/* global process, console */
import { readFile, writeFile } from 'node:fs/promises'
import { createServer } from 'node:net'
// Never alter a developer's retained local database configuration accidentally.
if (
  process.env.CI !== 'true' ||
  !/^\d+$/.test(process.env.GITHUB_RUN_ID ?? '') ||
  !/^\d+$/.test(process.env.GITHUB_RUN_ATTEMPT ?? '')
) {
  throw Error(
    'GitHub CI identity required; local configuration was not changed',
  )
}
const path = 'supabase/config.toml'
let config = await readFile(path, 'utf8')
const matches = [...config.matchAll(/^(?:port|shadow_port) = (\d+)$/gm)]
const previous = [...new Set(matches.map((m) => m[1]))]
if (previous.length !== matches.length || previous.length < 6)
  throw Error('Unexpected Supabase port configuration')
const reservations = []
try {
  const replacements = new Map()
  for (const port of previous) {
    const server = createServer()
    await new Promise((resolve, reject) => {
      server.once('error', reject)
      server.listen(0, '0.0.0.0', resolve)
    })
    reservations.push(server)
    replacements.set(port, server.address().port)
  }
  config = config.replace(
    /^project_id = ".*"$/m,
    `project_id = "deardaily-ci-${process.env.GITHUB_RUN_ID}-${process.env.GITHUB_RUN_ATTEMPT}"`,
  )
  config = config.replace(
    /^(port|shadow_port) = (\d+)$/gm,
    (_, field, port) => `${field} = ${replacements.get(port)}`,
  )
  await writeFile(path, config)
  console.log(
    'Configured an isolated CI project with reserved free ports; no hosted settings changed.',
  )
} finally {
  await Promise.all(
    reservations.map(
      (server) => new Promise((resolve) => server.close(resolve)),
    ),
  )
}
