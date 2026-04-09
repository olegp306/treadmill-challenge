import { Navigate } from 'react-router-dom';

/** @deprecated Use `/participate` — kept for bookmarks and README links */
export default function StartRunningPage() {
  return <Navigate to="/participate/1" replace />;
}
