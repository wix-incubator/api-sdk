module.exports = {
  'yarn.lock': () => ['syncpack list-mismatches', 'yarn dedupe --check'],
};
