module.exports = {
  '{packages,tools}/**/*.{js,jsx,ts,tsx,md,yml}': [
    'nx affected --target=lint --uncommitted --fix=true',
    'nx affected --target=test --uncommitted',
    'nx format:write --uncommitted',
  ]
};
