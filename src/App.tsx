import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import Landing from './features/landing/Landing'
import Dashboard from './features/dashboard/Dashboard'
import Editor from './features/journal/Editor'
import Explore, { StoryDetail } from './features/explore/Explore'
import Shell from './app/Shell'
import RouteFocus from './app/RouteFocus'
export function AppRoutes() {
  return (
    <>
      <RouteFocus />
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route element={<Shell />}>
          <Route path="/app" element={<Dashboard />} />
          <Route path="/app/write" element={<Editor />} />
          <Route path="/app/entries/:id" element={<StoryDetail personal />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/explore/:id" element={<StoryDetail />} />
          <Route
            path="*"
            element={
              <div className="page not-found">
                <p className="eyebrow">404 / An unwritten page</p>
                <h1>A little off the beaten path.</h1>
                <p>Let’s find your way back to a fresh page.</p>
                <Link className="button" to="/">
                  Back home
                </Link>
              </div>
            }
          />
        </Route>
      </Routes>
    </>
  )
}
export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}
