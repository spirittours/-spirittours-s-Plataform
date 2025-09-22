module.exports = {
  apps: [
    {
      name: 'spirit-tours-frontend',
      script: 'npm',
      args: 'start',
      cwd: '/home/user/webapp/frontend',
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
        BROWSER: 'none',
        REACT_APP_API_URL: 'http://localhost:8000'
      },
      error_file: './logs/frontend-error.log',
      out_file: './logs/frontend-out.log',
      log_file: './logs/frontend-combined.log',
      time: true,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      exec_mode: 'fork'
    }
  ]
};