import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { PageAppearance } from './PageAppearance'
import { photographicCovers } from './covers'
import { documentFromText } from './document'
it('shows icons and every named cover collection together and applies both without losing writing', async () => {
  const original = documentFromText('Preserve these synthetic words')
  const apply = vi.fn()
  render(<PageAppearance document={original} onApply={apply} />)
  await userEvent.click(
    screen.getByRole('button', { name: /Cover & page icon/ }),
  )
  expect(
    screen.queryByRole('combobox', { name: 'Cover collection' }),
  ).toBeNull()
  expect(screen.queryByRole('button', { name: /^Page icon$/ })).toBeNull()
  expect(
    screen.getByRole('region', { name: 'Cover collections' }),
  ).toHaveAttribute('tabindex', '0')
  for (const group of new Set(photographicCovers.map((c) => c.collection)))
    expect(screen.getByRole('heading', { name: group })).toBeVisible()
  await userEvent.type(
    screen.getByRole('searchbox', { name: 'Search page icons' }),
    'kitten',
  )
  await userEvent.click(screen.getByRole('button', { name: 'Use 🐱' }))
  const last = photographicCovers.at(-1)!
  await userEvent.click(screen.getByRole('button', { name: last.name }))
  expect(screen.getByRole('button', { name: 'Use 🐱' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await userEvent.click(
    screen.getByRole('button', { name: 'Apply page style' }),
  )
  expect(apply.mock.calls[0][0].document).toMatchObject({
    content: original.content,
    icon: '🐱',
    page: { cover: last.id },
  })
})
