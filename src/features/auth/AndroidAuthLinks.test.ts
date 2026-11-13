import { expect, it } from 'vitest'
import { parseAndroidAuthLink } from './AndroidAuthLinks'

it('preserves the SDK flow ID only for exact Android callbacks', () => {
  const origin = 'https://deardailyy.netlify.app'
  const code = '12345678-1234-1234-1234-123456789abc'
  const query = '?code=' + code + '&sb_flow_id=abcdefghijklmnop'
  expect(parseAndroidAuthLink(origin + '/mobile/recovery' + query)).toEqual({
    code,
    flowId: 'abcdefghijklmnop',
    recovery: true,
  })
  expect(parseAndroidAuthLink(origin + '/auth/callback' + query)).toBeNull()
  expect(
    parseAndroidAuthLink('https://example.com/mobile/recovery' + query),
  ).toBeNull()
  expect(
    parseAndroidAuthLink(
      origin + '/mobile/callback' + query + '&sb_flow_id=duplicate',
    ),
  ).toEqual({ invalid: true })
})
