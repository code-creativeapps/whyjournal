import { Redirect } from 'expo-router';

// expo-router catches any unmatched route here. Deep links from Supabase
// auth callbacks land at routes we don't have (e.g. `loghero://` + a hash
// fragment), so quietly redirect to the journal instead of showing the
// default "This screen doesn't exist" page.
export default function NotFound() {
  return <Redirect href="/" />;
}
