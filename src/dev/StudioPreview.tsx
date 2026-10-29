/** DEV ONLY. Actual screens, synthetic in-memory data; never a security substitute. */
import { BrowserRouter, useNavigate } from 'react-router-dom'
import type { SupabaseClient, Session } from '@supabase/supabase-js'
import { AppRoutes } from '../App'
import { documentFromText } from '../features/rich-editor/document'
import { isThemeId } from '../features/theme/themes'
const uid = '61000000-0000-4000-8000-000000000001'
const stamp = '2026-10-29T09:00:00Z'
const session = {
  access_token: 'synthetic-preview',
  refresh_token: '',
  token_type: 'bearer',
  expires_in: 3600,
  user: {
    id: uid,
    email: 'writer@example.test',
    email_confirmed_at: stamp,
    created_at: stamp,
    aud: 'authenticated',
    app_metadata: {},
    user_metadata: {},
  },
} as Session
const selectedTheme = new URLSearchParams(location.search).get('theme')
const theme = isThemeId(selectedTheme) ? selectedTheme : 'midnight-purple'
type Row = Record<string, unknown>
const entries: Row[] = [
  [
    'A window seat',
    'cafe-memory',
    '☀️',
    'Some mornings ask for nothing more than a warm cup and a little attention.',
  ],
  [
    'The long way home',
    'forest-light',
    '🌿',
    'I took the path under the trees. For a while, there was nowhere else I needed to be.',
  ],
  [
    'What the tide kept',
    'pacific-dusk',
    '🌊',
    'The sea kept its own time. I sat on the rocks and let the day slow down.',
  ],
].map(([title, cover, icon, body], i) => ({
  id: `62000000-0000-4000-8000-00000000000${i + 1}`,
  user_id: uid,
  title,
  body,
  writing_document: {
    ...documentFromText(body),
    page: { cover, position: 50 },
  },
  page_icon: icon,
  cover_preset: null,
  mood: 'Calm',
  tags: ['small moments'],
  category: 'Personal',
  entry_date: '2026-10-29',
  status: 'saved',
  version: 1,
  created_at: stamp,
  updated_at: stamp,
}))
const tables: Record<string, Row[]> = {
  journal_entries: entries,
  public_stories: entries.slice(0, 2).map((e) => ({
    ...e,
    public_username: 'studio_writer',
    public_category: 'Personal',
    public_tags: ['ordinary-days'],
    published_at: stamp,
  })),
  public_profiles: [
    {
      user_id: uid,
      username: 'studio_writer',
      display_name: 'The quiet observer',
      bio: 'Small memories, long walks, and the ordinary world. A fictional profile for design review.',
      avatar: 'leaf',
      visible: true,
      joined_month: null,
      cover_id: 'forest-light',
    },
  ],
  profiles: [{ id: uid, display_name: 'Studio writer', created_at: stamp }],
  user_settings: [
    { user_id: uid, theme_id: theme, appearance: {}, updated_at: stamp },
  ],
}
function query(table: string) {
  const filters: ((r: Row) => boolean)[] = []
  let operation = 'read',
    payload: Row | Row[] = {},
    head = false,
    start = 0,
    end = 1000
  const result = () => {
    const all = tables[table] ?? [],
      found = all.filter((r) => filters.every((f) => f(r)))
    let rows = found
    if (operation === 'insert') {
      rows = (Array.isArray(payload) ? payload : [payload]).map((p) => ({
        id: crypto.randomUUID(),
        user_id: uid,
        version: 1,
        created_at: stamp,
        updated_at: stamp,
        ...(table === 'public_stories'
          ? { published_at: new Date().toISOString() }
          : {}),
        ...p,
      }))
      tables[table] = [...all, ...rows]
    }
    if (operation === 'update') {
      rows = found.map((r) => {
        Object.assign(r, payload, { updated_at: new Date().toISOString() })
        if (table === 'journal_entries') r.version = Number(r.version) + 1
        return r
      })
    }
    if (operation === 'delete') {
      tables[table] = all.filter((r) => !found.includes(r))
      if (table === 'journal_entries')
        tables.public_stories = tables.public_stories.filter(
          (s) => !found.some((r) => r.id === s.id),
        )
    }
    return {
      data: head ? null : rows.slice(start, end + 1),
      error: null,
      count: rows.length,
    }
  }
  const q: Record<string, unknown> = {
    select: (
      _fields?: string,
      options?: { head?: boolean; count?: string },
    ) => {
      head = !!options?.head
      return q
    },
    eq: (k: string, v: unknown) => {
      filters.push((r) => r[k] === v)
      return q
    },
    in: (k: string, v: unknown[]) => {
      filters.push((r) => v.includes(r[k]))
      return q
    },
    ilike: (k: string, v: string) => {
      filters.push((r) =>
        String(r[k])
          .toLowerCase()
          .includes(v.replaceAll('%', '').toLowerCase()),
      )
      return q
    },
    returns: () => q,
    order: () => q,
    neq: (k: string, v: unknown) => {
      filters.push((r) => r[k] !== v)
      return q
    },
    range: (a: number, b: number) => {
      start = a
      end = b
      return q
    },
    limit: (n: number) => {
      end = n - 1
      return q
    },
    insert: (v: Row | Row[]) => {
      operation = 'insert'
      payload = v
      return q
    },
    update: (v: Row) => {
      operation = 'update'
      payload = v
      return q
    },
    delete: () => {
      operation = 'delete'
      return q
    },
    single: async () => {
      const r = result()
      return { ...r, data: r.data?.[0] ?? null }
    },
    maybeSingle: async () => {
      const r = result()
      return { ...r, data: r.data?.[0] ?? null }
    },
    then: (resolve: (v: ReturnType<typeof result>) => unknown) =>
      Promise.resolve(result()).then(resolve),
  }
  return q
}
const listeners = new Set<(event: string, value: Session | null) => void>()
const client = {
  from: query,
  rpc: async (name: string) => {
    if (name === 'my_public_profile') {
      const p = tables.public_profiles[0]
      if (!p) return { data: null, error: null }
      const { user_id: _, ...safe } = p
      void _
      return { data: safe, error: null }
    }
    return { data: [], error: null }
  },
  auth: {
    getSession: async () => ({ data: { session }, error: null }),
    getUser: async () => ({ data: { user: session.user }, error: null }),
    onAuthStateChange: (cb: (event: string, value: Session | null) => void) => {
      listeners.add(cb)
      return {
        data: { subscription: { unsubscribe: () => listeners.delete(cb) } },
      }
    },
    signOut: async () => {
      listeners.forEach((cb) => cb('SIGNED_OUT', null))
      return { error: null }
    },
    updateUser: async () => ({
      error: {
        message: 'Credential changes are unavailable in the synthetic preview.',
      },
    }),
  },
  functions: {
    invoke: async () => ({
      data: null,
      error: { message: 'No hosted requests in the synthetic preview.' },
    }),
  },
} as unknown as SupabaseClient
function PreviewRoutes() {
  const navigate = useNavigate()
  return (
    <div
      onClickCapture={(e) => {
        const a = (e.target as Element).closest('a[href]')
        if (
          a instanceof HTMLAnchorElement &&
          a.origin === location.origin &&
          !e.defaultPrevented &&
          !e.ctrlKey &&
          !e.metaKey
        ) {
          const u = new URL(a.href)
          u.searchParams.set('studio', 'preview')
          if (selectedTheme) u.searchParams.set('theme', selectedTheme)
          e.preventDefault()
          e.stopPropagation()
          navigate(u.pathname + u.search + u.hash)
        }
      }}
    >
      <AppRoutes client={client} />
    </div>
  )
}
export function StudioPreview() {
  return (
    <>
      <div className="studio-fixture-banner" role="status">
        Design review · Synthetic in-memory content · No journal writes to
        Supabase
      </div>
      <BrowserRouter>
        <PreviewRoutes />
      </BrowserRouter>
    </>
  )
}
