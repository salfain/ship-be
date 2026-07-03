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
        PORT: 3000,
        API_PREFIX: '/api',
      },
    },
  ],
};
