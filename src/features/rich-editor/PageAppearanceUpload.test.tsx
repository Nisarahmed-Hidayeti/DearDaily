import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { PageAppearance } from './PageAppearance'
import { documentFromText } from './document'
it('explains a cover rejection and permits retrying the same file without losing writing', async () => {
  const onUpload = vi
    .fn()
    .mockRejectedValueOnce(Error('Choose a photo smaller than 5 MiB.'))
    .mockResolvedValueOnce('11000000-0000-0000-0000-000000000001')
  const apply = vi.fn()
  render(
    <PageAppearance
      document={documentFromText('Keep synthetic writing')}
      onApply={apply}
      onUpload={onUpload}
    />,
  )
  await userEvent.click(
    screen.getByRole('button', { name: /Cover & page icon/ }),
  )
  const input = screen.getByLabelText('Upload cover from computer')
  const file = new File(['synthetic'], 'fixture.jpg', { type: 'image/jpeg' })
  await userEvent.upload(input, file)
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'smaller than 5 MiB',
  )
  expect(apply).not.toHaveBeenCalled()
  await userEvent.upload(input, file)
  expect(onUpload).toHaveBeenCalledTimes(2)
  await userEvent.click(
    screen.getByRole('button', { name: 'Apply page style' }),
  )
  expect(
    apply.mock.calls[0][0].document.content.content[0].content[0].text,
  ).toBe('Keep synthetic writing')
  expect(apply.mock.calls[0][0].document.page.assetId).toBe(
    '11000000-0000-0000-0000-000000000001',
  )
})
