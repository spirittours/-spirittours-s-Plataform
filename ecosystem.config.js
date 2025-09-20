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
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      log_file: './logs/spirit-frontend.log',
      out_file: './logs/spirit-frontend-out.log', 
      error_file: './logs/spirit-frontend-error.log',
      time: true
    }
  ]
};