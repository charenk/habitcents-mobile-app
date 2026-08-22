/**
 * UX-012: the intake hook must yield to the UI thread BEFORE the synchronous,
 * JS-thread-blocking runScan pass, so the "Reading your files" spinner and the
 * VoiceOver announcement paint first instead of freezing behind the parse.
 *
 * This pins the ordering by holding InteractionManager's callback: while it is
 * pending the hook must already be on the 'scanning' stage with no result yet
 * (the spinner is committed and painted); the scan may only run once the frame
 * is released. leakScanScopeFlow.test.tsx already covers the end-to-end result
 * with the real InteractionManager; this isolates the yield itself.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const mockGetDocumentAsync = jest.fn();
jest.mock('expo-document-picker', () => ({
  getDocumentAsync: (...args: unknown[]) => mockGetDocumentAsync(...args),
}));

jest.mock('expo-file-system', () => ({
  File: class {
    async text() {
      const nodeFs = require('fs');
      const nodePath = require('path');
      return nodeFs.readFileSync(
        nodePath.join(__dirname, 'leakScanEval', 'fixtures', 'chequing-split-mixed-dates.csv'),
        'utf-8'
      );
    }
  },
}));

jest.mock('@/utils/analytics', () => ({ track: jest.fn() }));

import fs from 'fs';
import path from 'path';
import { InteractionManager } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook } from '@testing-library/react-native';
import { useLeakScanIntake } from '@/components/leak-scan/useLeakScanIntake';

const FIXTURE = path.join(__dirname, 'leakScanEval', 'fixtures', 'chequing-split-mixed-dates.csv');
const FIXTURE_TEXT = fs.readFileSync(FIXTURE, 'utf-8');

/** Held InteractionManager callbacks, run only when the test releases the frame. */
let pendingInteractions: Array<() => void> = [];
let interactionSpy: jest.SpyInstance;

beforeEach(async () => {
  await AsyncStorage.clear();
  pendingInteractions = [];
  mockGetDocumentAsync.mockReset();
  mockGetDocumentAsync.mockResolvedValue({
    canceled: false,
    assets: [{ name: 'statement.csv', uri: 'file:///statement.csv', size: FIXTURE_TEXT.length }],
  });
  // Capture rather than run: the yield stays open until the test flushes it, so
  // the state between the 'scanning' commit and the scan is observable.
  // The hook always passes a plain thunk; capture it. Signature erased to
  // `never` because runAfterInteractions' overloads do not accept a narrowed
  // implementation type here.
  const capture = ((task: unknown) => {
    const run = typeof task === 'function' ? (task as () => void) : undefined;
    if (run) pendingInteractions.push(run);
    return { then: () => {}, done: () => {}, cancel: () => {} };
  }) as never;
  interactionSpy = jest
    .spyOn(InteractionManager, 'runAfterInteractions')
    .mockImplementation(capture);
});

afterEach(() => {
  interactionSpy.mockRestore();
});

/** Release every held interaction callback and let the resumed work settle. */
async function releaseFrame() {
  await act(async () => {
    const callbacks = pendingInteractions;
    pendingInteractions = [];
    callbacks.forEach((cb) => cb());
    // Real timers under jest-expo: a macrotask flushes the resumed promise chain.
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

describe('intake yields before the blocking scan (UX-012)', () => {
  it('commits the scanning spinner stage, then defers runScan behind an interaction', async () => {
    const { result } = await renderHook(() => useLeakScanIntake());

    // Start the scan but do not await it: the yield is held open above, so
    // pickAndScan cannot resolve past runWithRules until we release the frame.
    await act(async () => {
      void result.current.pickAndScan();
      // Let the pre-scan awaits (picker, file read, rules load, setState) settle.
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    // The spinner stage is committed and painted...
    expect(result.current.state.stage).toBe('scanning');
    // ...and the scan has NOT run yet: no result, and a frame is waiting.
    expect(result.current.state.result).toBeNull();
    expect(pendingInteractions.length).toBeGreaterThan(0);

    // Releasing the frame runs the deferred synchronous scan.
    await releaseFrame();

    expect(result.current.state.stage).toBe('scope');
    expect(result.current.state.result?.habits.length).toBeGreaterThan(0);
  });
});
