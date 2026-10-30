import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const root = createRoot(document.getElementById('root')!)
if (
  import.meta.env.DEV &&
  new URLSearchParams(location.search).get('studio') === 'preview'
) {
  void import('./dev/StudioPreview').then(({ StudioPreview }) =>
    root.render(
      <StrictMode>
        <StudioPreview />
      </StrictMode>,
    ),
  )
} else
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
