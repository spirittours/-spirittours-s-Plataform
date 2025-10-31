module.exports = {
  apps: [
    {
      name: 'spirit-tours-backend',
      script: 'python',
      args: '-m uvicorn main:app --host 0.0.0.0 --port 8000 --reload',
      cwd: './backend',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '1G',
      interpreter: '/usr/local/bin/python3',
      env: {
        PYTHONPATH: '/home/user/webapp/backend:/home/user/webapp/ai-agents',
        PORT: 8000
      },
      env_production: {
        PYTHONPATH: '/home/user/webapp/backend:/home/user/webapp/ai-agents',
        PORT: 8000
      },
      log_file: './logs/spirit-backend.log',
      out_file: './logs/spirit-backend-out.log',
      error_file: './logs/spirit-backend-error.log',
      time: true
    },
    {
      name: 'spirit-tours-accounting-api',
      script: './backend/server.js',
      instances: 'max',
      exec_mode: 'cluster',
      watch: false,
      max_memory_restart: '1G',
      node_args: '--max-old-space-size=1024',
      env: {
        NODE_ENV: 'development',
        PORT: 3001
      },
      env_staging: {
        NODE_ENV: 'staging',
        PORT: 3001,
        instances: 2
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
        instances: 4
      },
      log_file: './logs/accounting-api.log',
      out_file: './logs/accounting-api-out.log',
      error_file: './logs/accounting-api-error.log',
      time: true,
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      listen_timeout: 10000,
      kill_timeout: 5000
    },
    {
      name: 'spirit-tours-frontend', 
      script: 'npm',
      args: 'start',
      cwd: './frontend',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
        REACT_APP_API_URL: 'http://localhost:8000'
      },
      env_staging: {
        NODE_ENV: 'staging',
        PORT: 3000,
        REACT_APP_API_URL: 'https://staging-api.spirittours.com'
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        REACT_APP_API_URL: 'https://api.spirittours.com'
      },
      log_file: './logs/spirit-frontend.log',
      out_file: './logs/spirit-frontend-out.log', 
      error_file: './logs/spirit-frontend-error.log',
      time: true
    }
  ],
  deploy: {
    staging: {
      user: 'deploy',
      host: 'staging.spirittours.com',
      ref: 'origin/genspark_ai_developer',
      repo: 'git@github.com:spirittours/-spirittours-s-Plataform.git',
      path: '/var/www/spirit-tours-staging',
      'pre-deploy': 'git fetch --all',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env staging',
      env: {
        NODE_ENV: 'staging'
      }
    },
    production: {
      user: 'deploy',
      host: ['prod1.spirittours.com', 'prod2.spirittours.com'],
      ref: 'origin/main',
      repo: 'git@github.com:spirittours/-spirittours-s-Plataform.git',
      path: '/var/www/spirit-tours-production',
      'pre-deploy': 'git fetch --all',
      'post-deploy': 'npm install && npm run migrate:production && pm2 reload ecosystem.config.js --env production',
      env: {
        NODE_ENV: 'production'
      }
    }
  }
};