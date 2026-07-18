module.exports = {
  apps: [
    {
      name: 'ship-monitoring-api',
      script: 'src/server.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 3131,
        API_PREFIX: '/api',
        PUBLIC_BASE_URL: 'http://43.133.134.10',
      },
    },
  ],
};
