module.exports = {
  apps: [
    {
      name: "gyrex-labs",
      script: "node_modules/next/dist/bin/next",
      args: "start",
      cwd: "/opt/gyrex-labs",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 3005,
      },
      error_file: "./logs/pm2-error.log",
      out_file: "./logs/pm2-out.log",
      log_file: "./logs/pm2-combined.log",
      time: true,
      exp_backoff_restart_delay: 100,
      listen_timeout: 10000,
      kill_timeout: 5000,
    },
  ],
};
