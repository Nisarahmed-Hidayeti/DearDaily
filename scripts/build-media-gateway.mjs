import process from 'node:process'
import console from 'node:console'
import { readFile, writeFile } from 'node:fs/promises'
const withoutImports = (source) =>
  source.replace(/^import\b[\s\S]*?from\s+['"][^'"]+['"]\r?\n/gm, '')
const files = [
  'supabase/functions/_shared/image.ts',
  'supabase/functions/_shared/profileImages.ts',
  'supabase/functions/_shared/mediaHandler.ts',
  'supabase/functions/media-gateway/index.ts',
]
const bundle =
  "// Generated from reviewed sources. No credentials embedded.\nimport {createClient,type SupabaseClient} from 'npm:@supabase/supabase-js@2.118.0'\nimport {PhotonImage,resize,SamplingFilter} from 'npm:@cf-wasm/photon@0.4.0/node'\nimport {imageSize} from 'npm:image-size@2.0.4'\n" +
  (
    await Promise.all(
      files.map(async (path) => withoutImports(await readFile(path, 'utf8'))),
    )
  ).join('\n')
const output = process.argv[2] || '/tmp/deardaily-profile-media-gateway.ts'
await writeFile(output, bundle)
console.log('Generated reviewed media gateway:', output)
