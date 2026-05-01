import { Buffer } from 'buffer';
import process from 'process';

/**
 * 🛠️ GEPPETTO LABS - GLOBAL POLYFILLS
 * 
 * Injects Node.js globals (Buffer, process) into the browser/metro environment.
 * Required for cryptographic libraries like ripemd160 and ethers to function correctly.
 */

if (typeof global.Buffer === 'undefined') {
  global.Buffer = Buffer;
}

if (typeof global.process === 'undefined') {
  global.process = process;
} else {
  // Merge existing process with shim if necessary
  global.process = { ...global.process, ...process };
}

console.log("[Polyfills] Node.js globals injected.");
