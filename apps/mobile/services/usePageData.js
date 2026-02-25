import { useEffect, useState } from 'react';
import { apiRequest } from './api';

export function usePageData(pageKey) {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const payload = await apiRequest(`/page-data/${encodeURIComponent(pageKey)}`);
        if (active) {
          setData(payload && typeof payload === 'object' ? payload : {});
        }
      } catch (e) {
        if (active) {
          setError(e);
          setData({});
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [pageKey]);

  return { data, loading, error };
}
