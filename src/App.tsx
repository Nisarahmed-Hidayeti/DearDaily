import { LoadingState } from './components/Shared'
import RichWritingSecurityCheck from './features/auth/RichWritingSecurityCheck'
import CommunityPreview from './features/community/CommunityPreview'
import CommunitySecurityCheck from './features/auth/CommunitySecurityCheck'
import { communityEnabled } from './features/community/communityApi'
import PublicProfile from './features/community/PublicProfile'
import ProfileSettings from './features/community/ProfileSettings'
import PublishedManager from './features/community/PublishedManager'
import Moderation from './features/community/Moderation'
import AccountPrivacy from './features/community/AccountPrivacy'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import { lazy, Suspense } from 'react'
const EditorWorkshop = import.meta.env.DEV
  ? lazy(() => import('./features/rich-editor/EditorPreview'))
  : null
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
import JournalSecurityCheck from './features/auth/JournalSecurityCheck'
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
          {import.meta.env.DEV && EditorWorkshop && (
            <Route
              path="/dev/editor-workshop"
              element={
                <Suspense
                  fallback={
                    <LoadingState>Preparing your writing space…</LoadingState>
                  }
                >
                  <EditorWorkshop />
                </Suspense>
              }
            />
          )}
          {import.meta.env.DEV && (
            <Route path="/dev/security-check" element={<SecurityCheck />} />
          )}
          {import.meta.env.DEV && (
            <Route
              path="/dev/journal-check"
              element={<JournalSecurityCheck />}
            />
          )}
          {import.meta.env.DEV && (
            <Route
              path="/dev/community-preview"
              element={<CommunityPreview />}
            />
          )}
          {import.meta.env.DEV && (
            <Route
              path="/dev/community-check"
              element={<CommunitySecurityCheck />}
            />
          )}
          {communityEnabled && (
            <>
              <Route path="/u/:username" element={<PublicProfile />} />
              <Route
                path="/account/public-profile"
                element={
                  <RequireAccount>
                    <ProfileSettings />
                  </RequireAccount>
                }
              />
              <Route
                path="/app/published"
                element={
                  <RequireAccount>
                    <PublishedManager />
                  </RequireAccount>
                }
              />
              <Route
                path="/moderation"
                element={
                  <RequireAccount>
                    <Moderation />
                  </RequireAccount>
                }
              />
              <Route
                path="/account/privacy"
                element={
                  <RequireAccount>
                    <AccountPrivacy />
                  </RequireAccount>
                }
              />
            </>
          )}
          {import.meta.env.DEV && (
            <Route
              path="/dev/rich-check"
              element={<RichWritingSecurityCheck />}
            />
          )}
          <Route path="/app" element={<Dashboard />} />
          <Route path="/app/journal" element={<Dashboard library />} />
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
          <Route path="/explore/:id" element={<PublishedStory />} />
          <Route path="/explore/samples/:id" element={<StoryDetail />} />
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
