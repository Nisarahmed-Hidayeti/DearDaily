import type { SupabaseClient } from '@supabase/supabase-js'
import { boundedVoice, validateWav, excerptWav } from './voice.ts'
const uuid = (v: unknown): v is string =>
  typeof v === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(v)
const privateBucket = 'deardaily-voice-private',
  publicBucket = 'deardaily-voice-public'
export function createVoiceHandler(
  admin: SupabaseClient,
  userClient: (token: string) => SupabaseClient,
  origins: string[],
  publicBase?: string,
) {
  return async (request: Request) => {
    const origin = request.headers.get('origin'),
      cors = {
        'Access-Control-Allow-Origin':
          origin && origins.includes(origin) ? origin : '*',
        'Access-Control-Allow-Headers':
          'authorization,apikey,content-type,x-client-info,x-entry-id,x-action',
        'Cache-Control': 'no-store',
        'Referrer-Policy': 'no-referrer',
        'X-Content-Type-Options': 'nosniff',
      }
    const json = (data: unknown, status = 200) =>
      Response.json(data, { status, headers: cors })
    const record = async (action: string, payload: Record<string, unknown>) => {
      const { data, error } = await admin.rpc('voice_gateway_record', {
        action,
        payload,
      })
      if (error) throw Error('Voice operation unavailable')
      return data
    }
    const signed = async (bucket: string, key: string) => {
      const { data, error } = await admin.storage
        .from(bucket)
        .createSignedUrl(key, 60)
      if (error || !data) throw Error('Audio unavailable')
      const url = new URL(data.signedUrl)
      if (publicBase) {
        const base = new URL(publicBase)
        url.protocol = base.protocol
        url.host = base.host
      }
      return url.href
    }
    if (request.method === 'OPTIONS')
      return new Response(null, { headers: cors })
    try {
      const id = new URL(request.url).searchParams.get('public')
      if (request.method === 'GET' && uuid(id)) {
        const copy = await record('copy', { id })
        if (!copy) return json({ error: 'Unavailable' }, 404)
        const { data: story, error } = await admin
          .from('public_stories')
          .select('voice_notes')
          .eq('id', copy.entry_id)
          .maybeSingle()
        if (
          error ||
          !story ||
          !Array.isArray(story.voice_notes) ||
          !story.voice_notes.some((n: { id?: unknown }) => n.id === id)
        )
          return json({ error: 'Unavailable' }, 404)
        return new Response(null, {
          status: 302,
          headers: {
            ...cors,
            Location: await signed(publicBucket, id + '.wav'),
          },
        })
      }
      if (request.method !== 'POST')
        return json({ error: 'Method not allowed' }, 405)
      if (origin && !origins.includes(origin))
        return json({ error: 'Origin unavailable' }, 403)
      const authorization = request.headers.get('authorization')
      if (!authorization?.startsWith('Bearer '))
        return json({ error: 'Sign in required' }, 401)
      const client = userClient(authorization),
        identity = await client.auth.getUser(authorization.slice(7))
      if (identity.error || !identity.data.user)
        return json({ error: 'Sign in required' }, 401)
      const who = identity.data.user.id
      if (request.headers.get('x-action') === 'upload') {
        const entry = request.headers.get('x-entry-id')
        if (!uuid(entry) || request.headers.get('content-type') !== 'audio/wav')
          return json({ error: 'Invalid recording' }, 400)
        const wave = validateWav(await boundedVoice(request)),
          id = crypto.randomUUID()
        const reserved = await client.rpc('reserve_voice_note', {
          entry,
          media: id,
          byte_count: wave.bytes.length,
          seconds: wave.duration,
        })
        if (reserved.error)
          return json(
            { error: 'Entry unavailable or audio quota reached' },
            403,
          )
        try {
          const uploaded = await admin.storage
            .from(privateBucket)
            .upload(id + '.wav', wave.bytes, {
              contentType: 'audio/wav',
              upsert: false,
              cacheControl: '0',
            })
          if (uploaded.error) throw Error('Upload failed')
          await record('ready', { id })
          return json({ id, duration: wave.duration })
        } catch {
          await record('discard', { id })
          return json({ error: 'Upload not confirmed' }, 503)
        }
      }
      const body = JSON.parse(
        new TextDecoder().decode(await boundedVoice(request, 4096)),
      )
      if (body.action === 'read' && uuid(body.id)) {
        const asset = await record('asset', { id: body.id })
        if (!asset || asset.user_id !== who || !asset.ready)
          return json({ error: 'Unavailable' }, 404)
        return json({ url: await signed(privateBucket, body.id + '.wav') })
      }
      if (
        body.action === 'prepare' &&
        uuid(body.entry) &&
        Number.isSafeInteger(body.version)
      ) {
        const { data: entry, error } = await admin
          .from('journal_entries')
          .select('id,user_id,version,voice_notes')
          .eq('id', body.entry)
          .eq('user_id', who)
          .maybeSingle()
        if (error || !entry || entry.version !== body.version)
          return json({ error: 'Save and review again' }, 409)
        const notes: unknown[] = [],
          created: string[] = []
        try {
          for (const n of entry.voice_notes) {
            if (n.share !== true) continue
            const asset = await record('asset', { id: n.id })
            if (
              !asset ||
              asset.user_id !== who ||
              asset.entry_id !== entry.id ||
              !asset.ready
            )
              throw Error('Audio unavailable')
            const { data: blob, error } = await admin.storage
              .from(privateBucket)
              .download(n.id + '.wav')
            if (error || !blob) throw Error('Audio unavailable')
            const excerpt = excerptWav(
              new Uint8Array(await blob.arrayBuffer()),
              n.start,
              n.end,
            )
            const id = crypto.randomUUID(),
              uploaded = await admin.storage
                .from(publicBucket)
                .upload(id + '.wav', excerpt, {
                  contentType: 'audio/wav',
                  upsert: false,
                  cacheControl: '0',
                })
            if (uploaded.error) throw Error('Copy failed')
            try {
              await record('stage', {
                id,
                source_id: n.id,
                user_id: who,
                entry_id: entry.id,
                version: entry.version,
              })
            } catch {
              await admin.storage.from(publicBucket).remove([id + '.wav'])
              throw Error('Copy unconfirmed')
            }
            created.push(id)
            notes.push({ id, title: n.title, start: n.start, end: n.end })
          }
          return json({ notes })
        } catch {
          for (const id of created) await record('unstage', { id })
          return json({ error: 'Public audio not prepared' }, 503)
        }
      }
      if (body.action === 'cleanup') {
        await record('prune', { user_id: who })
        const jobs = await record('jobs', { user_id: who })
        let cleaned = 0
        for (const job of jobs) {
          if (
            ![privateBucket, publicBucket].includes(job.bucket) ||
            !/^[-a-f0-9]{36}\.wav$/.test(job.object_key)
          )
            continue
          const r = await admin.storage
            .from(job.bucket)
            .remove([job.object_key])
          if (!r.error) {
            await record('cleaned', { id: job.id, user_id: who })
            cleaned++
          }
        }
        return json({
          cleaned,
          pending: (await record('jobs', { user_id: who })).length,
        })
      }
      return json({ error: 'Unsupported recording request' }, 400)
    } catch {
      return json({ error: 'Recording request could not be completed' }, 400)
    }
  }
}
