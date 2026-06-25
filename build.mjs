/**
 * Custom esbuild bundler script.
 *
 * Why this exists:
 *   @azure/storage-common (12.4+) ships an Emscripten-compiled CRC64 WASM
 *   in dist/esm/crc64.js. That file has an ESM-compat shim that calls
 *   createRequire(import.meta.url) at module initialisation time. When any
 *   bundler converts the ESM entry to CJS, import.meta.url becomes undefined
 *   and the createRequire call throws at runtime.
 *
 *   The dist/commonjs/crc64.js is clean – the shim block is stripped.  We
 *   therefore force @azure/storage-blob (and its transitive storage-common
 *   dependency) to always resolve to their dist/commonjs/ entry points.
 *
 *   @actions/core 3.0.1 is ESM-only (no "require" export condition).  We
 *   add "import" to the active condition list so esbuild falls back to it for
 *   packages that have no "require" condition.  Because storage-blob is
 *   aliased to its CJS distribution, all internal require() calls inside that
 *   distribution are resolved with CJS conditions, keeping the chain clean.
 */

import * as esbuild from 'esbuild';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

// Resolve the exact CJS entry point paths to avoid any re-resolution via
// the exports map (which would pick the import/ESM condition again).
// We use path.resolve directly since these internal paths are not exported
// in the package's exports map.
function resolvePackagePath(pkg, subPath) {
  const pkgDir = path.dirname(require.resolve(pkg + '/package.json'));
  return path.join(pkgDir, subPath);
}

const storageBlobCjs = resolvePackagePath('@azure/storage-blob', 'dist/commonjs/index.js');
const storageCommonCjs = resolvePackagePath('@azure/storage-common', 'dist/commonjs/index.js');

await esbuild.build({
  entryPoints: [path.join(__dirname, 'lib/main.js')],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  // Add "import" as a fallback so ESM-only packages like @actions/core resolve.
  // esbuild checks conditions in the order they appear in the exports map, so
  // packages that have a "require" condition will still use it first.
  conditions: ['import'],
  alias: {
    // Force the Azure storage packages to use their CJS distributions.
    '@azure/storage-blob': storageBlobCjs,
    '@azure/storage-common': storageCommonCjs,
  },
  outfile: path.join(__dirname, 'dist/index.js'),
  sourcemap: true,
  logLevel: 'info',
});
