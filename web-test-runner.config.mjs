const filteredLogs = ['Running in dev mode', 'lit-html is in dev mode'];

export default /** @type {import("@web/test-runner").TestRunnerConfig} */ ({
  files: 'test/**/*.test.js',

  nodeResolve: {
    exportConditions: ['browser', 'development'],
  },

  filterBrowserLogs(log) {
    for (const arg of log.args) {
      if (typeof arg === 'string' && filteredLogs.some(l => arg.includes(l))) {
        return false;
      }
    }
    return true;
  },

});
