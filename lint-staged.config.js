module.exports = {
  'tools/**/*.{js,jsx,cjs,mjs,ts,tsx}': ['nx format:write --uncommitted'],
  'packages/*/src/**/*.{ts,tsx}': [
    'nx affected --target=lint --uncommitted --fix=true',
    'nx affected --target=test --uncommitted',
    'nx format:write --uncommitted',
  ],
  'packages/*/*.{ts,tsx}': ['nx format:write --uncommitted'],
  '**/*.{md,yml}': ['nx format:write --uncommitted'],
};
