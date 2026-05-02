/**
 * 🧠 AXIOM LABS - GLOBAL DATA CONTEXT (LEGACY CLASS PATTERN)
 * 
 * This module manages the global application state using the React Context API.
 * It primarily stores the 'chatGeneral' message history and provides synchronous/asynchronous 
 * methods for state updates (setValue and setValueAsync).
 */

import React from "react";

// INITIALIZATION: Standard React Context.
const ContextModule = React.createContext();

/**
 * Global Context Provider Component
 * Holds the master application state and exposes update methods to all child components.
 */
class ContextProvider extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      value: {
        // chatGeneral: Shared array of message objects {message, type, time, tool}.
        chatGeneral: [
          {
            message: `I'm AXIOM - an autonomous agent.

I can use APIs, pay per request, and execute tasks for you.
What would you like to do?`,
            type: "system",
            time: Date.now(),
            tool: "",
          },
        ],
      },
    };
  }

  /**
   * SET VALUE: Synchronous state update with an optional callback.
   * Merges the provided object into the existing global 'value'.
   */
  setValue = (value, then = () => { }) => {
    this.setState(
      {
        value: {
          ...this.state.value,
          ...value,
        },
      },
      () => then(),
    );
  };

  /**
   * SET VALUE ASYNC: Promise-based state update.
   * Forces the component to wait for state resolution before continuing (e.g., awaiting message additions).
   */
  setValueAsync = async (value, then = () => { }) => {
    await new Promise((resolve) =>
      this.setState(
        {
          value: {
            ...this.state.value,
            ...value,
          },
        },
        () => resolve(),
      ),
    );
    then();
  };

  render() {
    const { children } = this.props;
    const { value } = this.state;
    // EXTRACT: Local methods to be exposed to the provider.
    const { setValue, setValueAsync } = this;

    return (
      <ContextModule.Provider
        // EXPOSURE: All child components wrapped in this Provider can access the global state.
        value={{
          value,
          setValue,
          setValueAsync,
        }}
      >
        {children}
      </ContextModule.Provider>
    );
  }
}

// EXPORT: Standard Context Consumer and default module export.
export { ContextProvider };
export const ContextConsumer = ContextModule.Consumer;
export default ContextModule;
