import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AppRoutes } from '../App'
import Dashboard from '../features/dashboard/Dashboard'
function page(route = '/') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AppRoutes />
    </MemoryRouter>,
  )
}
describe('DearDaily prototype', () => {
  it('offers a useful empty journal state', () => {
    render(
      <MemoryRouter>
        <Dashboard recentEntries={[]} />
      </MemoryRouter>,
    )
    expect(screen.getByText('Your first page is waiting.')).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Write your first entry' }),
    ).toHaveAttribute('href', '/app/write')
  })
  it('introduces journaling and navigates to the editor', async () => {
    page()
    expect(
      screen.getByRole('heading', { name: /Every day has a story/ }),
    ).toBeInTheDocument()
    await userEvent.click(screen.getByRole('link', { name: 'Start writing' }))
    expect(screen.getByLabelText('Entry title')).toBeInTheDocument()
  })
  it('renders fictional dashboard data and working navigation', async () => {
    page('/app')
    expect(screen.getByText(/Fictional sample content/)).toBeInTheDocument()
    expect(screen.getByText('24')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('link', { name: 'Explore stories' }))
    expect(
      screen.getByRole('heading', { name: /Different lives/ }),
    ).toBeInTheDocument()
  })
  it('accepts writing, counts words and defaults to private', async () => {
    page('/app/write')
    expect(screen.getByLabelText('Entry visibility')).toHaveValue('Private')
    await userEvent.type(screen.getByLabelText('Entry title'), 'My quiet day')
    await userEvent.type(
      screen.getByLabelText('Journal body'),
      'Two little words',
    )
    expect(screen.getByText('3 words')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Preview' }))
    expect(
      screen.getByRole('heading', { name: 'My quiet day' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Two little words')).toBeInTheDocument()
  })
  it('updates mood and tags and supports removing a tag', async () => {
    page('/app/write')
    await userEvent.click(screen.getByRole('button', { name: /Happy/ }))
    expect(screen.getByRole('button', { name: /Happy/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await userEvent.type(screen.getByLabelText('Tags'), 'gratitude{enter}')
    expect(screen.getByText('#gratitude')).toBeInTheDocument()
    await userEvent.click(
      screen.getByRole('button', { name: 'Remove gratitude tag' }),
    )
    expect(screen.queryByText('#gratitude')).not.toBeInTheDocument()
  })
  it('cannot save or publish even with public visibility', async () => {
    page('/app/write')
    await userEvent.selectOptions(
      screen.getByLabelText('Entry visibility'),
      'Public',
    )
    expect(screen.getByText(/This entry is not public/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Publish/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: /Save draft/ })).toBeDisabled()
  })
  it('shows filters and opens sample stories', async () => {
    page('/explore')
    expect(screen.getAllByText('Sample story')).toHaveLength(3)
    await userEvent.click(screen.getByRole('button', { name: 'Reflections' }))
    expect(screen.getAllByText('Sample story')).toHaveLength(1)
    await userEvent.click(
      screen.getByRole('link', { name: /What the night sky taught me/ }),
    )
    expect(
      screen.getByText(/Beyond the last streetlight, the sky opened up/),
    ).toBeInTheDocument()
  })
  it('clears temporary writing when the editor unmounts', async () => {
    page('/app/write')
    await userEvent.type(
      screen.getByLabelText('Journal body'),
      'Temporary private thought',
    )
    await userEvent.click(screen.getByRole('link', { name: 'Overview' }))
    await userEvent.click(screen.getByRole('link', { name: 'Write an entry' }))
    expect(screen.getByLabelText('Journal body')).toHaveValue('')
  })
  it('has a 404 and honest authentication notice', async () => {
    const view = page('/missing')
    expect(
      screen.getByText('A little off the beaten path.'),
    ).toBeInTheDocument()
    view.unmount()
    page()
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(screen.getByRole('dialog')).toHaveTextContent(
      'Sign-in and accounts are coming in Phase 2',
    )
  })
})
