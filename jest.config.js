module.exports = {
  preset: 'jest-expo',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  // Unit tests only for now; detection logic has no native deps.
  testMatch: ['**/__tests__/**/*.test.ts'],
  // Agent worktrees (.claude/worktrees/*) are full checkouts and can contain
  // their own __tests__ directories. Anchor to <rootDir> so this only excludes
  // worktrees NESTED BELOW this checkout; a worktree running its own suite
  // (rootDir already inside .claude/worktrees/<id>) is unaffected because the
  // pattern only matches a further .claude/worktrees segment below its own root.
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/\\.claude/worktrees/'],
};
