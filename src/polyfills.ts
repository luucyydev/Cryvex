import { Buffer } from 'buffer';
import stream from 'stream-browserify';
import util from 'util';
import zlib from 'browserify-zlib';
import events from 'events';
import assert from 'assert';
import path from 'path-browserify';

// Polyfills for Node.js built-ins
declare global {
  interface Window {
    global: any;
    Buffer: typeof Buffer;
    process: any;
  }
}

window.global = window;
window.Buffer = Buffer;

// Set up process
const processPolyfill = {
  env: { 
    NODE_DEBUG: undefined,
    NODE_ENV: process.env.NODE_ENV || 'development',
    BROWSER: true
  },
  browser: true,
  version: '',
  versions: {},
  platform: 'browser',
  arch: 'x64',
  nextTick: (cb: Function) => Promise.resolve().then(cb)
};

window.process = processPolyfill;

// Ensure global process is available
if (typeof globalThis.process === 'undefined') {
  globalThis.process = processPolyfill;
}

// Ensure other Node.js built-ins are available globally
Object.assign(globalThis, {
  Buffer,
  process: processPolyfill,
  console,
  stream,
  util,
  zlib,
  events,
  assert,
  path
});