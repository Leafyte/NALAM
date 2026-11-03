import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { Screen } from '../components/Screen';
import { LoadingView } from '../components/StateViews';
import { useSession } from '../hooks/useSession';

/**
 * Route alias: Redirects smoothly to the unified questionnaire screen.
 * Prevents jarring switches to disconnected chat interfaces.
 */
export default function FollowupRedirect() {
  const router = useRouter();
  const { language } = useSession();

  useEffect(() => {
    router.replace('/questionnaire');
  }, [router]);

  return (
    <Screen>
      <LoadingView language={language} />
    </Screen>
  );
}
