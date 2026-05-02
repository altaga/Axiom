/**
 * ⚡ AXIOM LABS - CONTEXT INITIALIZATION LOADER
 * 
 * A headless component designed to trigger global state initialization on mount.
 * It ensures that the 'starter' flag is set within the ContextModule once the 
 * application component tree has stabilized.
 */

import { Fragment, useCallback, useContext, useEffect } from "react";
import ContextModule from "./contextModule";

export default function ContextLoader() {
  const context = useContext(ContextModule);

  /**
   * INITIALIZATION: Sets the 'starter' flag to true.
   * This can be used by other components to signify that the global state is ready.
   */
  const checkStarter = useCallback(async () => {
    context.setValue({
      ...context.value,
      starter: true,
    });
  }, [context]);

  // EFFECT: Lifecycle hook to trigger the initialization logic on the initial mount.
  useEffect(() => {
    checkStarter();
  }, []);

  // RENDER: Headless (Internal Logic Only)
  return <Fragment />;
}
