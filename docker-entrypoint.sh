#!/bin/sh
set -e

# Start Next.js (standalone) in the background on port 3000.
PORT=3000 HOSTNAME=127.0.0.1 node /app/server.js &
NEXT_PID=$!

# If Next.js dies, bring the container down so Docker restarts it.
trap 'kill -TERM $NEXT_PID 2>/dev/null; exit 0' TERM INT
( wait $NEXT_PID; echo "[entrypoint] Next.js exited — shutting down"; kill -TERM 1 ) &

# nginx runs in the foreground as PID 1's child so SIGTERM routes correctly
# when Docker stops the container.
exec nginx -g 'daemon off;'
