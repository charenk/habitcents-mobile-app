/**
 * The leak scan gate (decision 0009).
 *
 * Two things are pinned. The flag must be OFF unless a build explicitly opted
 * in, including in local development: the whole point of leaving out the
 * `__DEV__` term DEV_MENU_ENABLED carries is that a developer running Metro
 * sees what a TestFlight user sees. And the route must answer a deep link
 * rather than render half a dormant flow, which is the bug class that crashed
 * build 5 and the reason app/onboarding/intent.tsx exists.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const FLAG = 'EXPO_PUBLIC_SCAN_FLOW';

describe('scan flow gate', () => {
  const originalDev = (global as { __DEV__?: boolean }).__DEV__;
  const originalFlag = process.env[FLAG];

  afterEach(() => {
    (global as { __DEV__?: boolean }).__DEV__ = originalDev;
    if (originalFlag === undefined) delete process.env[FLAG];
    else process.env[FLAG] = originalFlag;
    jest.resetModules();
  });

  it('is off by default, development included', () => {
    (global as { __DEV__?: boolean }).__DEV__ = true;
    delete process.env[FLAG];
    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    expect(require('@/utils/scanFlow').SCAN_FLOW_ENABLED).toBe(false);
  });

  it('is off in a non-dev build with no flag', () => {
    (global as { __DEV__?: boolean }).__DEV__ = false;
    delete process.env[FLAG];
    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    expect(require('@/utils/scanFlow').SCAN_FLOW_ENABLED).toBe(false);
  });

  it('is on only when the flag is exactly "1"', () => {
    process.env[FLAG] = '0';
    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    expect(require('@/utils/scanFlow').SCAN_FLOW_ENABLED).toBe(false);

    process.env[FLAG] = 'true';
    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    expect(require('@/utils/scanFlow').SCAN_FLOW_ENABLED).toBe(false);

    process.env[FLAG] = '1';
    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    expect(require('@/utils/scanFlow').SCAN_FLOW_ENABLED).toBe(true);
  });
});

describe('/leak-scan route while the flow is dormant', () => {
  const originalFlag = process.env[FLAG];

  afterEach(() => {
    if (originalFlag === undefined) delete process.env[FLAG];
    else process.env[FLAG] = originalFlag;
    jest.resetModules();
  });

  // Called directly rather than through a renderer: the gate runs before any
  // hook does, which is the whole property under test, and calling it proves
  // that without a provider tree the dormant flow would need.
  it('redirects to Insights rather than rendering the flow', () => {
    delete process.env[FLAG];
    jest.resetModules();

    // The flow's own hook must never run behind the gate: reaching it would
    // mean the redirect came too late to matter.
    const intake = jest.fn();
    jest.doMock('@/components/leak-scan/useLeakScanIntake', () => ({
      useLeakScanIntake: intake,
    }));

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Redirect } = require('expo-router');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const LeakScanRoute = require('@/app/leak-scan').default;

    const element = LeakScanRoute();

    expect(element.type).toBe(Redirect);
    expect(element.props.href).toBe('/(tabs)/insights');
    expect(intake).not.toHaveBeenCalled();
  });

  it('renders the flow when the build opted in', () => {
    process.env[FLAG] = '1';
    jest.resetModules();

    jest.doMock('@/components/leak-scan/useLeakScanIntake', () => ({
      useLeakScanIntake: jest.fn(),
    }));

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Redirect } = require('expo-router');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { default: LeakScanRoute, LeakScanFlow } = require('@/app/leak-scan');

    const element = LeakScanRoute();

    expect(element.type).not.toBe(Redirect);
    expect(element.type).toBe(LeakScanFlow);
  });
});
