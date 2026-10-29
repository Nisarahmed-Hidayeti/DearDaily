import type { SupabaseClient } from '@supabase/supabase-js'
import { readBounded, sanitizePhoto } from './image.ts'
const uuid = (v: unknown): v is string =>
  typeof v === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(v)
type Document = Record<string, unknown>
export function mediaRefs(doc: unknown, publicCopy = false) {
  const ids = new Set<string>()
  const visit = (value: unknown) => {
    if (!value || typeof value !== 'object') return
    const n = value as Record<string, unknown>
    if (n.type === 'journalImage') {
      const a = n.attrs as Record<string, unknown> | undefined
      const id = a?.[publicCopy ? 'publicId' : 'assetId']
      if (!uuid(id)) throw Error('Invalid photo reference')
      ids.add(id)
    }
    if (Array.isArray(n.content)) n.content.forEach(visit)
  }
  const d = doc as { content?: unknown; page?: Record<string, unknown> } | null
  visit(d?.content)
  if (d?.page?.cover === 'upload') {
    const id = d.page[publicCopy ? 'publicId' : 'assetId']
    if (!uuid(id)) throw Error('Invalid cover reference')
    ids.add(id)
  }
  if (ids.size > 10) throw Error('Too many photos')
  return [...ids]
}
export function publicDocument(input: unknown, mapping: Map<string, string>) {
  const d = structuredClone(input) as Document
  const visit = (value: unknown) => {
    if (!value || typeof value !== 'object') return
    const n = value as Record<string, unknown>
    if (n.type === 'journalImage') {
      const a = n.attrs as Record<string, unknown>,
        id = mapping.get(String(a.assetId))
      if (!id) throw Error('Missing public image')
      delete a.assetId
      a.publicId = id
    }
    if (Array.isArray(n.content)) n.content.forEach(visit)
  }
  visit(d.content)
  const page = d.page as Record<string, unknown> | undefined
  if (page?.cover === 'upload') {
    const id = mapping.get(String(page.assetId))
    if (!id) throw Error('Missing public cover')
    delete page.assetId
    page.publicId = id
  }
  return d
}
export function createMediaHandler(
  admin: SupabaseClient,
  userClient: (token: string) => SupabaseClient,
  origins: string[],
  publicBase?: string,
) {
  return async (request: Request) => {
    const origin = request.headers.get('origin'),
      url = new URL(request.url),
      publicId = url.searchParams.get('public')
    const cors = {
      'Access-Control-Allow-Origin':
        origin && origins.includes(origin) ? origin : '*',
      'Access-Control-Allow-Headers':
        'authorization,apikey,content-type,x-client-info,x-entry-id,x-action',
      'Cache-Control': 'no-store',
      'Referrer-Policy': 'no-referrer',
    }
    const externalUrl = (value: string) => {
      if (!publicBase) return value
      const url = new URL(value),
        base = new URL(publicBase)
      url.protocol = base.protocol
      url.host = base.host
      return url.href
    }
    const json = (data: unknown, status = 200) =>
      Response.json(data, { status, headers: cors })
    if (request.method === 'OPTIONS')
      return new Response(null, { headers: cors })
    try {
      if (request.method === 'GET' && uuid(publicId)) {
        const { data: m } = await admin
          .from('story_media')
          .select('id,entry_id,object_key')
          .eq('id', publicId)
          .maybeSingle()
        if (!m) return json({ error: 'Unavailable' }, 404)
        const { data: s } = await admin
          .from('public_stories')
          .select('writing_document')
          .eq('id', m.entry_id)
          .maybeSingle()
        if (!s || !mediaRefs(s.writing_document, true).includes(publicId))
          return json({ error: 'Unavailable' }, 404)
        const { data, error } = await admin.storage
          .from('deardaily-story-media')
          .createSignedUrl(m.object_key, 60)
        if (error || !data) return json({ error: 'Unavailable' }, 404)
        return new Response(null, {
          status: 302,
          headers: { ...cors, Location: externalUrl(data.signedUrl) },
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
        if (!uuid(entry)) return json({ error: 'Entry unavailable' }, 400)
        const input = await readBounded(request),
          photo = sanitizePhoto(
            input,
            request.headers.get('content-type') ?? '',
          ),
          id = crypto.randomUUID()
        const { error: reserve } = await client.rpc('reserve_journal_media', {
          entry,
          media: id,
          byte_count: photo.bytes.length,
        })
        if (reserve)
          return json(
            { error: 'Entry unavailable or photo quota reached' },
            403,
          )
        const key = who + '/' + id + '.webp'
        try {
          const uploaded = await admin.storage
            .from('deardaily-private')
            .upload(key, photo.bytes, {
              contentType: 'image/webp',
              upsert: false,
              cacheControl: '0',
            })
          if (uploaded.error) throw Error('Upload failed')
          const marked = await admin
            .from('private_media')
            .update({
              status: 'ready',
              width: photo.width,
              height: photo.height,
            })
            .eq('id', id)
            .eq('user_id', who)
          if (marked.error) throw Error('Upload confirmation failed')
          return json({ id, width: photo.width, height: photo.height })
        } catch {
          await admin
            .from('private_media')
            .delete()
            .eq('id', id)
            .eq('user_id', who)
          return json({ error: 'Upload not confirmed' }, 503)
        }
      }
      if (Number(request.headers.get('content-length') ?? 0) > 4096)
        return json({ error: 'Request too large' }, 413)
      const body = JSON.parse(
        new TextDecoder().decode(await readBounded(request, 4096)),
      ) as {
        action?: string
        id?: string
        entry?: string
        version?: number
        prune?: boolean
      }
      if (body.action === 'read' && uuid(body.id)) {
        const { data: m } = await admin
          .from('private_media')
          .select('object_key,status')
          .eq('id', body.id)
          .eq('user_id', who)
          .maybeSingle()
        if (!m || m.status !== 'ready')
          return json({ error: 'Unavailable' }, 404)
        const { data, error } = await admin.storage
          .from('deardaily-private')
          .createSignedUrl(m.object_key, 60)
        if (error || !data) return json({ error: 'Unavailable' }, 404)
        return json({ url: externalUrl(data.signedUrl) })
      }
      if (
        body.action === 'prepare' &&
        uuid(body.entry) &&
        Number.isSafeInteger(body.version)
      ) {
        const { data: entry } = await admin
          .from('journal_entries')
          .select('id,user_id,version,writing_document')
          .eq('id', body.entry)
          .eq('user_id', who)
          .maybeSingle()
        if (!entry || entry.version !== body.version)
          return json({ error: 'Entry changed. Save and review again.' }, 409)
        const mapping = new Map<string, string>(),
          created: string[] = []
        try {
          for (const id of mediaRefs(entry.writing_document)) {
            const { data: asset } = await admin
              .from('private_media')
              .select('object_key')
              .eq('id', id)
              .eq('entry_id', entry.id)
              .eq('user_id', who)
              .eq('status', 'ready')
              .single()
            if (!asset) throw Error('Missing private image')
            const { data: blob, error: read } = await admin.storage
              .from('deardaily-private')
              .download(asset.object_key)
            if (read || !blob) throw Error('Image unavailable')
            const publicId = crypto.randomUUID(),
              key = publicId + '.webp'
            const upload = await admin.storage
              .from('deardaily-story-media')
              .upload(key, blob, {
                contentType: 'image/webp',
                upsert: false,
                cacheControl: '0',
              })
            if (upload.error) throw Error('Public copy failed')
            const record = await admin.from('story_media').insert({
              id: publicId,
              entry_id: entry.id,
              user_id: who,
              object_key: key,
              bytes: blob.size,
            })
            if (record.error) {
              await admin.storage.from('deardaily-story-media').remove([key])
              throw Error('Public copy not confirmed')
            }
            created.push(publicId)
            mapping.set(id, publicId)
          }
          return json({
            document: publicDocument(entry.writing_document, mapping),
          })
        } catch {
          if (created.length)
            await admin
              .from('story_media')
              .delete()
              .in('id', created)
              .eq('user_id', who)
          return json(
            {
              error:
                'Public photos not prepared. Existing story remains unchanged.',
            },
            503,
          )
        }
      }
      if (body.action === 'cleanup') {
        if (body.prune) {
          const pruned = await client.rpc('prune_unused_journal_media')
          if (pruned.error) return json({ error: 'Cleanup not confirmed' }, 409)
        }
        // Only queued exact object keys belonging to the authenticated owner.
        const { data: jobs } = await admin
          .from('media_gc')
          .select('id,bucket,object_key')
          .eq('user_id', who)
          .limit(50)
        let cleaned = 0
        for (const job of jobs ?? []) {
          const r = await admin.storage
            .from(job.bucket)
            .remove([job.object_key])
          if (!r.error) {
            await admin
              .from('media_gc')
              .delete()
              .eq('id', job.id)
              .eq('user_id', who)
            cleaned++
          }
        }
        return json({ cleaned })
      }
      return json({ error: 'Unsupported media request' }, 400)
    } catch {
      return json({ error: 'Photo request could not be completed' }, 400)
    }
  }
}
