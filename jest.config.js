module.exports = {
  preset: 'jest-expo',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    // jest-expo resolves lucide's "react-native" export to an untransformed
    // .mjs bundle, and its transform only targets .js/.jsx/.ts/.tsx (not .mjs),
    // so the ESM leaks through as a syntax error. Redirect the barrel import to
    // lucide's CommonJS build; every file it pulls in is .js and transforms
    // normally. react-native-svg (below) still needs the transform whitelist.
    '^lucide-react-native$':
      '<rootDir>/node_modules/lucide-react-native/dist/cjs/lucide-react-native.js',
  },
  // Unit tests only for now; detection logic has no native deps.
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  // Agent worktrees (.claude/worktrees/*) are full checkouts and can contain
  // their own __tests__ directories. Anchor to <rootDir> so this only excludes
  // worktrees NESTED BELOW this checkout; a worktree running its own suite
  // (rootDir already inside .claude/worktrees/<id>) is unaffected because the
  // pattern only matches a further .claude/worktrees segment below its own root.
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/\\.claude/worktrees/'],
  // Extend the jest-expo default whitelist so the new lucide icons (WP-1) and
  // their react-native-svg dependency are transformed; without this the render
  // tests fail on untransformed ESM in node_modules.
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|lucide-react-native))',
  ],
};
