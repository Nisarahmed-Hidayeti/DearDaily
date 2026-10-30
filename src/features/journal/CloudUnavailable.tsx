import { Link } from 'react-router-dom'
export function CloudUnavailable() {
  return (
    <div className="page">
      <h1>Your private journal</h1>
      <p role="status">
        Cloud writing is not available in this beta build. Your existing account
        and saved entries remain unchanged.
      </p>
      <Link className="text-link" to="/account">
        Open your account
      </Link>
    </div>
  )
}
