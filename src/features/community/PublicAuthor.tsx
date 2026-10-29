import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { avatars, validUsername } from './communityApi'
type Author = { username: string; display_name: string; avatar: string }
export function PublicAuthor({ username }: { username?: string | null }) {
  const { client } = useAuth()
  const [author, setAuthor] = useState<Author | null>(null)
  useEffect(() => {
    if (!client || !username || !validUsername(username)) return
    let active = true
    void client
      .from('public_profiles')
      .select('username,display_name,avatar')
      .eq('username', username)
      .eq('visible', true)
      .maybeSingle()
      .then(({ data, error }) => {
        if (active) setAuthor(error ? null : (data as Author | null))
      })
    return () => {
      active = false
    }
  }, [client, username])
  if (!username) return <span className="muted">Anonymous writer</span>
  if (!author || author.username !== username)
    return <span className="muted">@{username}</span>
  return (
    <Link className="public-author" to={`/u/${author.username}`}>
      <span className="author-symbol" aria-hidden="true">
        {avatars[author.avatar] ?? '✧'}
      </span>
      <span>{author.display_name || `@${author.username}`}</span>
    </Link>
  )
}
