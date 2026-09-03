import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Runs an API call and tracks its lifecycle: `{ data, error, loading, reload }`.
 *
 * Two details that a bare `useEffect` + `fetch` usually gets wrong:
 *   - a request whose deps changed mid-flight is ignored, so a slow response
 *     for the old slug can never overwrite a newer one
 *   - `setState` is skipped after unmount
 *
 * @param {() => Promise<unknown>} fetcher
 * @param {unknown[]} deps  re-runs when these change, like useEffect
 */
export function useApi(fetcher, deps = []) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const [nonce, setNonce] = useState(0);

  // Kept in a ref so changing the fetcher identity every render (an inline
  // arrow, which is the normal way to call this) does not restart the request.
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    let active = true;
    setState((previous) => ({ ...previous, loading: true, error: null }));

    fetcherRef
      .current()
      .then((data) => {
        if (active) setState({ data, error: null, loading: false });
      })
      .catch((error) => {
        if (active) setState({ data: null, error, loading: false });
      });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps are the caller's contract
  }, [...deps, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  return { ...state, reload };
}
