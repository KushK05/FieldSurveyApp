import { useEffect, useRef, useCallback } from 'react';
import { saveResponse } from '../lib/db';
import type { SurveyResponse } from '../types';

const AUTO_SAVE_INTERVAL = 30_000;

export function useOfflineForm(
  response: SurveyResponse | null,
  getData: () => Record<string, unknown>
) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const saveDraft = useCallback(async () => {
    if (!response) return;
    const draft: SurveyResponse = {
      ...response,
      data: getData(),
      sync_status: 'pending',
    };
    await saveResponse(draft);
  }, [response, getData]);

  useEffect(() => {
    if (!response) return;
    intervalRef.current = setInterval(saveDraft, AUTO_SAVE_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [response, saveDraft]);

  return { saveDraft };
}
