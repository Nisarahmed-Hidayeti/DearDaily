import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import Landing from './features/landing/Landing'
import Dashboard from './features/dashboard/Dashboard'
import Editor from './features/journal/Editor'
import Explore, {
  StoryDetail,
  PublishedStory,
} from './features/explore/Explore'
import DemoExplore from './features/explore/DemoExplore'
import Shell from './app/Shell'
import RouteFocus from './app/RouteFocus'
import Settings from './features/settings/Settings'
import { AuthProvider, AuthStatus, useAuth } from './features/auth/AuthProvider'
import {
  AuthPage,
  AuthCallback,
  RequireAccount,
} from './features/auth/AuthPages'
import Account from './features/auth/Account'
import SecurityCheck from './features/auth/SecurityCheck'
import { ThemeProvider } from './features/theme/ThemeProvider'
export function AppRoutes() {
  return (
    <AuthProvider>
      <ThemedRoutes />
    </AuthProvider>
  )
}
function ThemedRoutes() {
  const { session } = useAuth()
  return (
    <ThemeProvider key={session?.user.id ?? 'guest'}>
      <RouteFocus />
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <AuthStatus />
      <Routes>
        <Route path="/" element={<Landing />} />
        {(
          ['sign-in', 'sign-up', 'forgot-password', 'reset-password'] as const
        ).map((mode) => (
          <Route
            key={mode}
            path={'/auth/' + mode}
            element={<AuthPage key={mode} mode={mode} />}
          />
        ))}
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route element={<Shell />}>
          {import.meta.env.DEV && (
            <Route path="/dev/security-check" element={<SecurityCheck />} />
          )}
          <Route path="/app" element={<Dashboard />} />
          <Route
            path="/account"
            element={
              <RequireAccount>
                <Account key={session?.user.id} />
              </RequireAccount>
            }
          />
          <Route path="/app/write" element={<Editor />} />
          <Route path="/app/write/:id" element={<Editor />} />
          <Route path="/app/settings" element={<Settings />} />
          <Route path="/app/entries/:id" element={<StoryDetail personal />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/explore/samples" element={<DemoExplore />} />
          <Route path="/explore/published/:id" element={<PublishedStory />} />
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
    </ThemeProvider>
  )
}
export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}
