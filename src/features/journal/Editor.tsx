import { useAuth } from '../auth/AuthProvider'
import { RequireAccount } from '../auth/AuthPages'
import { journalEnabled } from './journalApi'
import DemoEditor from './DemoEditor'
import CloudEditor from './CloudEditor'
export default function Editor() {
  const { session, loading } = useAuth()
  if (journalEnabled && (session || loading))
    return (
      <RequireAccount>
        <CloudEditor />
      </RequireAccount>
    )
  return <DemoEditor />
}
