import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import {
  validUsername,
  readingTime,
  saveProfile,
  storyPage,
} from './communityApi'
import { StoryCard } from './StoryCard'
import ReportStory from './ReportStory'
import Moderation from './Moderation'
import type { SupabaseClient } from '@supabase/supabase-js'
const auth = vi.hoisted(() => ({
  client: null as unknown,
  session: null as unknown,
}))
vi.mock('../auth/AuthProvider', () => ({ useAuth: () => auth }))
const story = {
  id: 'synthetic',
  title: '<script>alert(1)</script>',
  body: 'Only deliberately public words',
  published_at: '2026-10-28T12:00:00Z',
  public_username: null,
  public_category: 'Growth',
  public_tags: ['chosen'],
}
describe('public identity validation', () => {
  it.each(['abc', 'writer_123', 'a'.repeat(24)])('accepts %s', (v) =>
    expect(validUsername(v)).toBe(true),
  )
  it.each([
    'ab',
    'Admin',
    'admin',
    '../x',
    'hello world',
    'a'.repeat(25),
    '1abc',
    'support',
    '<img>',
  ])('rejects %s', (v) => expect(validUsername(v)).toBe(false))
  it('estimates reading time with a minimum of one minute', () => {
    expect(readingTime('')).toBe(1)
    expect(readingTime('word '.repeat(201))).toBe(2)
  })
  it('does not call the backend for malformed usernames', async () => {
    const from = vi.fn()
    await expect(
      saveProfile(
        { from } as unknown as SupabaseClient,
        {
          username: '../bad',
          display_name: 'Name',
          bio: '',
          avatar: 'leaf',
          visible: true,
          joined_month: null,
        },
        null,
      ),
    ).rejects.toThrow('3–24')
    expect(from).not.toHaveBeenCalled()
  })
})
describe('public surfaces', () => {
  it('renders escaped story text, no owner identifier and no implied byline', () => {
    render(
      <MemoryRouter>
        <StoryCard story={story} />
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading').textContent).toBe(story.title)
    expect(document.querySelector('script')).toBeNull()
    expect(screen.getByText('Anonymous writer')).toBeVisible()
    expect(screen.getByText('#chosen')).toBeVisible()
  })
  it('links an explicitly chosen pseudonym', () => {
    render(
      <MemoryRouter>
        <StoryCard story={{ ...story, public_username: 'writer_a' }} />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: '@writer_a' })).toHaveAttribute(
      'href',
      '/u/writer_a',
    )
  })
  it('requires sign-in for reporting and does not submit anonymous requests', async () => {
    auth.client = { rpc: vi.fn() }
    auth.session = null
    render(
      <MemoryRouter>
        <ReportStory id="synthetic" />
      </MemoryRouter>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Report story' }))
    expect(screen.getByRole('link', { name: 'Sign in' })).toBeVisible()
    expect(
      (auth.client as { rpc: ReturnType<typeof vi.fn> }).rpc,
    ).not.toHaveBeenCalled()
  })
  it('reports only after form submission and shows backend confirmation', async () => {
    const rpc = vi.fn().mockResolvedValue({ error: null })
    auth.client = { rpc }
    auth.session = { user: { id: 'fixture' } }
    render(
      <MemoryRouter>
        <ReportStory id="synthetic" />
      </MemoryRouter>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Report story' }))
    expect(rpc).not.toHaveBeenCalled()
    await userEvent.selectOptions(screen.getByLabelText('Reason'), 'spam')
    await userEvent.click(screen.getByRole('button', { name: 'Submit report' }))
    expect(rpc).toHaveBeenCalledWith('submit_story_report', {
      story: 'synthetic',
      reason: 'spam',
      explanation: '',
    })
    expect(await screen.findByText(/Report received/)).toBeVisible()
  })
  it('does not claim report success on backend rejection', async () => {
    auth.client = {
      rpc: vi.fn().mockResolvedValue({ error: { code: '54000' } }),
    }
    auth.session = { user: { id: 'fixture' } }
    render(
      <MemoryRouter>
        <ReportStory id="synthetic" />
      </MemoryRouter>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Report story' }))
    await userEvent.click(screen.getByRole('button', { name: 'Submit report' }))
    expect(await screen.findByText(/Daily limit reached/)).toBeVisible()
  })
  it('shows denied moderation access with no action controls', async () => {
    auth.client = {
      rpc: vi.fn().mockResolvedValue({ data: null, error: { code: '42501' } }),
    }
    render(<Moderation />)
    expect(await screen.findByText(/Access denied/)).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Review decision' })).toBeNull()
  })
  it('paginates on the backend and escapes wildcard searches', async () => {
    const chain = {
      select: vi.fn(),
      order: vi.fn(),
      ilike: vi.fn(),
      eq: vi.fn(),
      range: vi.fn().mockResolvedValue({
        data: Array.from({ length: 13 }, () => story),
        error: null,
      }),
    }
    for (const key of ['select', 'order', 'ilike', 'eq'] as const)
      chain[key].mockReturnValue(chain)
    const from = vi.fn().mockReturnValue(chain)
    const result = await storyPage({ from } as unknown as SupabaseClient, {
      search: '100%_test',
      category: 'Growth',
      oldest: true,
      page: 2,
    })
    expect(chain.range).toHaveBeenCalledWith(24, 36)
    expect(chain.ilike).toHaveBeenCalledWith('title', '%100\\%\\_test%')
    expect(chain.eq).toHaveBeenCalledWith('public_category', 'Growth')
    expect(result.stories).toHaveLength(12)
    expect(result.more).toBe(true)
  })
})

describe('profile writes preserve hidden ownership', () => {
  const profile = {
    username: 'writer_a',
    display_name: 'Chosen name',
    bio: 'Chosen biography',
    avatar: 'leaf',
    visible: false,
    joined_month: null,
  }
  it('inserts with no row representation and confirms via the safe own-profile RPC', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null })
    const rpc = vi.fn().mockResolvedValue({ data: profile, error: null })
    const client = {
      from: vi.fn().mockReturnValue({ insert }),
      rpc,
    } as unknown as SupabaseClient
    expect(await saveProfile(client, profile, null)).toEqual(profile)
    expect(insert).toHaveBeenCalledWith(profile)
    expect(rpc).toHaveBeenCalledWith('my_public_profile')
  })
  it('updates minimally and checks the server-confirmed safe fields', async () => {
    const eq = vi.fn().mockResolvedValue({ error: null })
    const update = vi.fn().mockReturnValue({ eq })
    const client = {
      from: vi.fn().mockReturnValue({ update }),
      rpc: vi.fn().mockResolvedValue({ data: profile, error: null }),
    } as unknown as SupabaseClient
    expect(await saveProfile(client, profile, 'previous_name')).toEqual(profile)
    expect(eq).toHaveBeenCalledWith('username', 'previous_name')
  })
  it('never claims success when the confirmation differs', async () => {
    const client = {
      from: vi
        .fn()
        .mockReturnValue({
          insert: vi.fn().mockResolvedValue({ error: null }),
        }),
      rpc: vi
        .fn()
        .mockResolvedValue({
          data: { ...profile, bio: 'Old server version' },
          error: null,
        }),
    } as unknown as SupabaseClient
    await expect(saveProfile(client, profile, null)).rejects.toThrow(
      'reconcile',
    )
  })
  it('does not hide a write failure behind a later read', async () => {
    const rpc = vi.fn()
    const client = {
      from: vi
        .fn()
        .mockReturnValue({
          insert: vi.fn().mockResolvedValue({ error: { code: '42501' } }),
        }),
      rpc,
    } as unknown as SupabaseClient
    await expect(saveProfile(client, profile, null)).rejects.toThrow(
      'not confirmed',
    )
    expect(rpc).not.toHaveBeenCalled()
  })
})
