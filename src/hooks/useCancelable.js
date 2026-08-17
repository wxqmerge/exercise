import { useRef } from 'react';

export const useIsMounted = () => {
  const mounted = useRef(true);
  return {
    isMounted: () => mounted.current,
    setMounted: (v) => { mounted.current = v },
  };
};
