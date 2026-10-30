import { describe, expect, it } from 'vitest'
import { authRedirect, readAuthConfig, safeNext } from './config'
const valid = {
  VITE_SUPABASE_URL: 'https://dev-project.supabase.co',
  VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_example_key_for_testing_only',
}
describe('authentication configuration and redirect boundaries', () => {
  it('accepts a publishable development key and defaults registration closed', () => {
    expect(readAuthConfig(valid)).toMatchObject({
      allowSignup: false,
      googleEnabled: false,
    })
  })
  it('enables Google only with an explicit flag, independently of signup', () => {
    expect(
      readAuthConfig({ ...valid, VITE_ENABLE_GOOGLE_AUTH: 'true' }),
    ).toMatchObject({ googleEnabled: true, allowSignup: false })
    expect(
      readAuthConfig({ ...valid, VITE_ENABLE_GOOGLE_AUTH: true }),
    ).toMatchObject({ googleEnabled: false })
  })
  it.each([
    {},
    { ...valid, VITE_SUPABASE_URL: 'https://evil.example' },
    { ...valid, VITE_SUPABASE_URL: 'http://dev-project.supabase.co' },
    {
      ...valid,
      VITE_SUPABASE_URL: 'https://user:password@dev-project.supabase.co',
    },
    { ...valid, VITE_SUPABASE_URL: 'https://dev-project.supabase.co/path' },
    { ...valid, VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_secret_never_allowed' },
    { ...valid, VITE_SUPABASE_PUBLISHABLE_KEY: 'eyJlegacy_or_privileged_jwt' },
  ])('rejects missing, malformed or privileged configuration %#', (env) => {
    expect(readAuthConfig(env)).toBeNull()
  })
  it('accepts only exact approved callback origins', () => {
    expect(
      authRedirect('/auth/callback', 'https://deardailyy.netlify.app'),
    ).toBe('https://deardailyy.netlify.app/auth/callback')
    expect(() =>
      authRedirect('/auth/callback', 'https://attacker.netlify.app'),
    ).toThrow()
    expect(() =>
      authRedirect(
        '/auth/callback',
        'https://deardailyy.netlify.app.evil.example',
      ),
    ).toThrow()
  })
  it.each([
    'https://evil.example',
    '//evil.example',
    '/\\evil.example',
    '/account?next=https://evil.example',
    'javascript:alert(1)',
    null,
  ])('never follows untrusted next parameter %s', (next) => {
    expect(safeNext(next)).toBe('/account')
  })
})
