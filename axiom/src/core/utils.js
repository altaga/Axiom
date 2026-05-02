/**
 * 🛠️ AXIOM LABS - CORE UTILITIES
 * 
 * Shared helper functions for the Axiom agent system.
 * Includes fetch-retry logic for unreliable networks and timestamp formatting for UI.
 */

import { fetch } from "expo/fetch";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * ⚡ NEURAL TRACE: Verbose Logging Helper
 */
const vLog = (...args) => {
  if (process.env.VERBOSE_DEBUG === 'true') {
    console.log(">> [UTILS:VERBOSE]", ...args);
  }
};

/**
 * Enhanced Fetch: Implements exponential backoff retries for robust external calls.
 * Used for LLM provider communication and payment facilitator requests.
 * 
 * @param {string} url - The target endpoint.
 * @param {object} options - Standard fetch options (method, headers, body).
 * @param {object} retryOptions - Custom retry config (retries, delay, backoff).
 * @returns {Response} - The successful fetch response or a structured error object.
 */
export async function fetchWithRetries(url, options = {}, retryOptions = {}) {
  const {
    retries = 10,
    delay = 3000,
    backoff = 2,
    nullOnStatuses = [],
  } = retryOptions;

  let attempts = 0;
  let currentDelay = delay;

  while (attempts < retries) {
    try {
      vLog(`FETCH_ATTEMPT: ${attempts + 1}/${retries} URL: ${url}`);
      const response = await fetch(url, options);

      // EXIT: SUCCESS
      if (response.ok) {
        vLog(`FETCH_SUCCESS: URL: ${url}`);
        return response;
      }

      // EXIT: NON-RETRYABLE STATUS
      if (nullOnStatuses.includes(response.status)) {
        vLog(`FETCH_STOP: Status ${response.status} in nullOnStatuses. URL: ${url}`);
        return { result: null };
      }

      vLog(`FETCH_RETRIABLE_ERROR: Status ${response.status}. URL: ${url}`);
      throw new Error(`HTTP error! status: ${response.status}`);
    } catch (error) {
      attempts++;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // LOGIC: LOOP BACK WITH DELAY
      if (attempts < retries) {
        vLog(`FETCH_RETRY_WAIT: ${currentDelay}ms before attempt ${attempts + 1}.`);
        await new Promise((resolve) => setTimeout(resolve, currentDelay));
        // BACKOFF: Exponentially increase wait time between retries to prevent API spam.
        currentDelay *= backoff;
      } else {
        console.error(`>> [UTILS] FETCH_FINAL_FAILURE: URL: ${url} After ${retries} attempts. Error: ${errorMessage}`);
        throw new Error(`Failed to fetch ${url} after ${retries} attempts. Last error: ${errorMessage}`);
      }
    }
  }

  return { result: null };
}

/**
 * React State Helper: A custom hook that returns a promise version of setState.
 * Useful for awaiting state updates in complex component lifecycles.
 */
export function useStateAsync(initialValue) {
  const [state, setState] = useState(initialValue);
  const resolverRef = useRef(null);

  const asyncSetState = useCallback((newValue) => {
    setState(newValue);
    return new Promise((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  useEffect(() => {
    if (resolverRef.current) {
      resolverRef.current(state);
      resolverRef.current = null;
    }
  }, [state]);

  return [state, asyncSetState];
}

/**
 * UI Formatter: Converts Unix timestamps (seconds or milliseconds) to readable strings.
 * Implements "Just Now" detection and smart year-filtering for same-year dates.
 * 
 * @param {number} unixTimestamp - Raw epoch time (handled both Millis and Seconds).
 * @returns {string} - Formatted date string (e.g., "5 minutes ago", "Yesterday", "03/Jul").
 */
export function formatTimestamp(unixTimestamp) {
  const now = new Date();
  
  // SANITIZATION: Automatically convert seconds-epoch to milliseconds for JS compatibility.
  let ts = unixTimestamp;
  if (ts < 10000000000) ts *= 1000; 
  
  const messageDate = new Date(ts);
  const diffMs = now - messageDate;
  
  // CALCULATION: Derive time differences.
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // LOGIC: Select the appropriate "Friendly Time" string.
  if (diffMs < 60000) return "just now";
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes > 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffDays === 1) return "Yesterday";

  // FORMATTING: Standard date-string fallback.
  const day = messageDate.getDate();
  const month = messageDate.toLocaleString("default", { month: "short" });
  const year = messageDate.getFullYear();
  const showYear = year !== now.getFullYear();
  
  return `${day}/${month}${showYear ? "/" + year : ""}`;
}
