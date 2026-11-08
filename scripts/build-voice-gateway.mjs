import process from 'node:process'
import console from 'node:console'
import { readFile, writeFile } from 'node:fs/promises'
const withoutImports = (source) =>
  source.replace(/^import\b[\s\S]*?from\s+['"][^'"]+['"]\r?\n/gm, '')
const files = [
  'supabase/functions/_shared/voice.ts',
  'supabase/functions/_shared/voiceHandler.ts',
  'supabase/functions/voice-gateway/index.ts',
]
const bundle =
  "// Generated from the reviewed repository sources; no credentials are embedded.\nimport {createClient,type SupabaseClient} from 'npm:@supabase/supabase-js@2.118.0'\n" +
  (
    await Promise.all(
      files.map(async (path) => withoutImports(await readFile(path, 'utf8'))),
    )
  ).join('\n')
const output = process.argv[2] || '/tmp/deardaily-voice-gateway.ts'
await writeFile(output, bundle)
console.log('Generated reviewed single-file gateway:', output)
