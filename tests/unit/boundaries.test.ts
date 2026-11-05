import { describe, expect, it } from 'vitest';
import { analyzeSource } from '../../scripts/check-boundaries.mjs';

describe('module boundaries', () => {
  it('allows pure domain imports and application ports', () => {
    expect(analyzeSource('src/domain/rules/example.ts', "import { date } from '../calendar-date';")).toHaveLength(0);
    expect(analyzeSource('src/ui/Example.tsx', "import type { Port } from '../application/ports';")).toHaveLength(0);
  });
  it.each([
    "import React from 'react';", "import { Client } from 'pg';", "import { readFile } from 'node:fs';",
    "import { store } from '../adapters/browser/store';", "export * from '../ui/App';", "import type { Port } from '../application/ports';",
    "type R = import('../ui/App').App;", "const p = import('../adapters/browser/store');", "const p = import(variable);",
    "const p = require('pg');", 'Date.now();', 'window.location;', 'Math.random();',
  ])('rejects forbidden domain access: %s', (source) => {
    expect(analyzeSource('src/domain/example.ts', source).length).toBeGreaterThan(0);
  });
  it.each(["localStorage.getItem('key');", "window['indexedDB'];", "import { store } from '../adapters/browser/store';", "import { x } from '@/server/environment';"])(
    'rejects direct UI storage/infrastructure: %s', (source) => {
      expect(analyzeSource('src/ui/Example.tsx', source).length).toBeGreaterThan(0);
    },
  );
  it('allows storage access inside the browser adapter', () => {
    expect(analyzeSource('src/adapters/browser/store.ts', "indexedDB.open('our-home');")).toHaveLength(0);
  });
});
