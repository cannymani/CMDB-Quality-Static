# Browser vendor modules

Minified production ESM bundles built with esbuild 0.28.2 from React 19.2.8, React DOM 19.2.8,
Recharts 2.15.4, and htm 3.1.1. React is external in the React DOM, Recharts, and htm bundles;
the React bundle explicitly exports the package's named exports for native browser imports, and
the import map points all four modules at the same React instance. React DOM's CommonJS bundle
uses `require('react')`; its banner shim resolves that request through the same external React
import. `*.LEGAL.txt` files retain esbuild's linked legal comments. Full license texts for bundled
packages and the D3 sources redistributed by victory-vendor are in `licenses/`.

The temporary entry files used for these builds contained:

```js
// react.mjs
import React from 'react';
export default React;
export const {
  Activity, Children, Component, Fragment, Profiler, PureComponent, StrictMode, Suspense,
  __CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, __COMPILER_RUNTIME, act, cache,
  cacheSignal, captureOwnerStack, cloneElement, createContext, createElement, createRef, forwardRef,
  isValidElement, lazy, memo, startTransition, unstable_useCacheRefresh, use, useActionState,
  useCallback, useContext, useDebugValue, useDeferredValue, useEffect, useEffectEvent, useId,
  useImperativeHandle, useInsertionEffect, useLayoutEffect, useMemo, useOptimistic, useReducer,
  useRef, useState, useSyncExternalStore, useTransition, version,
} = React;

// react-dom-client.mjs
export { createRoot, hydrateRoot } from 'react-dom/client';

// recharts.mjs
export * from 'recharts';

// htm-react.mjs
export { html } from 'htm/react';
```

The bundles were generated with these commands (from a scratch directory with the packages above installed):

```sh
ESBUILD=./node_modules/.bin/esbuild
OUT=<repo>/js/vendor
ENTRY=./vendor-entry
"$ESBUILD" "$ENTRY/react.mjs" --bundle --format=esm --platform=browser --conditions=production --define:process.env.NODE_ENV='"production"' --minify --legal-comments=linked --metafile=./meta/esbuild-react.meta.json --outfile="$OUT/react.js"
"$ESBUILD" "$ENTRY/react-dom-client.mjs" --bundle --format=esm --platform=browser --conditions=production --define:process.env.NODE_ENV='"production"' --minify --legal-comments=linked --external:react --banner:js='import React from "react"; const require = (id) => { if (id === "react") return React; throw new Error("Dynamic require of " + id + " is not supported"); };' --metafile=./meta/esbuild-react-dom-client.meta.json --outfile="$OUT/react-dom-client.js"
"$ESBUILD" "$ENTRY/recharts.mjs" --bundle --format=esm --platform=browser --conditions=production --define:process.env.NODE_ENV='"production"' --minify --legal-comments=linked --external:react --metafile=./meta/esbuild-recharts.meta.json --outfile="$OUT/recharts.js"
"$ESBUILD" "$ENTRY/htm-react.mjs" --bundle --format=esm --platform=browser --conditions=production --define:process.env.NODE_ENV='"production"' --minify --legal-comments=linked --external:react --metafile=./meta/esbuild-htm-react.meta.json --outfile="$OUT/htm-react.js"
```

## Bundled package licenses

| License | Bundled packages |
| --- | --- |
| Apache-2.0 | htm 3.1.1 |
| BSD-3-Clause | d3-ease and d3-voronoi (copies bundled by victory-vendor 36.9.2), react-transition-group 4.4.5 |
| ISC | d3-array 3.2.4, d3-color 3.1.0, d3-format 3.1.2, d3-interpolate 3.0.1, d3-path 3.1.0, d3-scale 4.0.2, d3-shape 3.2.0, d3-time 3.1.0, d3-time-format 4.1.0, d3-timer and internmap 2.0.3; ISC-licensed D3 copies in victory-vendor 36.9.2 |
| MIT | @babel/runtime 7.29.7, clsx 2.1.1, decimal.js-light 2.5.1, dom-helpers 5.2.1, eventemitter3 4.0.7, fast-equals 5.4.1, lodash 4.18.1, prop-types 15.8.1, React 19.2.8, React DOM 19.2.8, react-is 18.3.1, react-smooth 4.0.4, Recharts 2.15.4, recharts-scale 0.4.5, scheduler 0.27.0, tiny-invariant 1.3.3 |
| MIT AND ISC | victory-vendor 36.9.2 (its package license; embedded D3 notices are separately listed above) |
