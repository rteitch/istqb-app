// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add 'wasm' to assetExts so Metro treats .wasm files as static assets
// This is required for expo-sqlite to work on web (wa-sqlite uses WebAssembly)
config.resolver.assetExts.push('wasm');

// Ensure Metro can resolve the wasm file from expo-sqlite's web worker
config.resolver.sourceExts = config.resolver.sourceExts.filter(
  (ext) => ext !== 'wasm'
);

module.exports = config;
