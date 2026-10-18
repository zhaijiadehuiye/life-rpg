import { Navigate } from 'react-router-dom'

export default function Historian() {
  // Keep bookmarked hash routes while using the native shared record page.
  return <Navigate to="/journal?tab=notes" replace />
}
