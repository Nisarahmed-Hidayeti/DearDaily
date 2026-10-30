import { LoadingState } from '../../components/Shared'
import { CloudUnavailable } from './CloudUnavailable'
import { useAuth } from '../auth/AuthProvider'
import { RequireAccount } from '../auth/AuthPages'
import { journalEnabled } from './journalApi'
import DemoEditor from './DemoEditor'
import CloudEditor from './CloudEditor'
export default function Editor() {
  const { session, loading } = useAuth()
  if (loading) return <LoadingState>Restoring your account…</LoadingState>
  if (session && !journalEnabled) return <CloudUnavailable />
  if (session)
    return (
      <RequireAccount>
        <CloudEditor />
      </RequireAccount>
    )
  return <DemoEditor />
}
