import { useState, useEffect } from 'react';
import { useReducedMotion } from 'framer-motion';

/**
 * Wrapper for Framer Motion's useReducedMotion that respects SSR
 * and avoids hydration mismatch errors.
 * Returns false during SSR, then resolves to the actual value.
 */
export function useReducedMotionSafe() {
    const prefersReducedMotion = useReducedMotion();
    const [isSafe, setIsSafe] = useState(false);

    useEffect(() => {
        setIsSafe(true);
    }, []);

    return isSafe ? prefersReducedMotion : false;
}
