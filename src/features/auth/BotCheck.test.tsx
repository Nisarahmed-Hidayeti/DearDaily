import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import BotCheck from './BotCheck'

afterEach(() => {
  delete window.turnstile
  vi.useRealTimers()
})
async function setup() {
  const renderWidget = vi.fn().mockReturnValue('synthetic-widget')
  const remove = vi.fn()
  window.turnstile = { render: renderWidget, remove }
  const onToken = vi.fn()
  const view = render(
    <BotCheck siteKey="synthetic-public-site-key" onToken={onToken} />,
  )
  await act(async () => {})
  return {
    ...view,
    onToken,
    renderWidget,
    remove,
    callbacks: renderWidget.mock.calls[0][1],
  }
}
it('accepts only the widget callback and invalidates expired verification', async () => {
  const { callbacks, onToken } = await setup()
  expect(onToken).not.toHaveBeenCalled()
  act(() => callbacks.callback('synthetic-token'))
  expect(screen.getByRole('status')).toHaveTextContent('Verification complete')
  expect(onToken).toHaveBeenLastCalledWith('synthetic-token')
  act(() => callbacks['expired-callback']())
  expect(onToken).toHaveBeenLastCalledWith('')
  expect(screen.getByRole('alert')).toHaveTextContent('expired')
})
it('shows safe error codes and retries without reusing a token', async () => {
  const { callbacks, onToken, renderWidget, remove } = await setup()
  act(() => callbacks['error-callback']('110200'))
  expect(screen.getByRole('alert')).toHaveTextContent('code 110200')
  fireEvent.click(screen.getByRole('button', { name: 'Retry verification' }))
  await act(async () => {})
  expect(remove).toHaveBeenCalledWith('synthetic-widget')
  expect(renderWidget).toHaveBeenCalledTimes(2)
  expect(onToken).toHaveBeenLastCalledWith('')
  act(() => callbacks.callback('stale-token'))
  expect(onToken).not.toHaveBeenCalledWith('stale-token')
})
it('never echoes arbitrary provider error text', async () => {
  const { callbacks } = await setup()
  act(() => callbacks['error-callback']('private provider detail'))
  expect(screen.getByRole('alert')).not.toHaveTextContent(
    'private provider detail',
  )
})
it('replaces endless verification with an honest retry state', async () => {
  vi.useFakeTimers()
  const { onToken, unmount, remove } = await setup()
  act(() => vi.advanceTimersByTime(45000))
  expect(screen.getByRole('alert')).toHaveTextContent('taking longer')
  expect(onToken).toHaveBeenLastCalledWith('')
  unmount()
  expect(remove).toHaveBeenCalledWith('synthetic-widget')
})
