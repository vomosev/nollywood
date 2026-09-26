module.exports = {
  apps: [
    {
      name: 'nollywood',
      script: 'node_modules/.bin/next',
      args: 'start',
      cwd: '/home/arx-app/backends/nollywood',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      out_file: 'logs/next-out.log',
      error_file: 'logs/next-error.log',
      merge_logs: true,
      time: true,
      env: {
        NODE_ENV: 'production',
        PORT: 50109
      }
    }
  ]
};