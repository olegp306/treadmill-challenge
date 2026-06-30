#!/usr/bin/env bash
set -euo pipefail

LOCAL_BACKEND_PORT="${LOCAL_BACKEND_PORT:-3001}"
LOCAL_FRONTEND_PORT="${LOCAL_FRONTEND_PORT:-5173}"
REMOTE_BACKEND_URL="${REMOTE_BACKEND_URL:-}"

print_help() {
  cat <<'EOF'
start-local-product.sh

Starts local backend + local frontend (kiosk product) only.

Options (or env):
  --local-backend-port <port>   (env: LOCAL_BACKEND_PORT, default: 3001)
  --local-frontend-port <port>  (env: LOCAL_FRONTEND_PORT, default: 5173)
  --remote-backend-url <url>    (env: REMOTE_BACKEND_URL, optional; informational only)
  -h, --help

Examples:
  ./scripts/start-local-product.sh
  LOCAL_BACKEND_PORT=3001 LOCAL_FRONTEND_PORT=5173 ./scripts/start-local-product.sh
  ./scripts/start-local-product.sh --local-backend-port 3001 --local-frontend-port 5173 --remote-backend-url https://remote.example.com
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --local-backend-port)
      LOCAL_BACKEND_PORT="$2"; shift 2;;
    --local-frontend-port)
      LOCAL_FRONTEND_PORT="$2"; shift 2;;
    --remote-backend-url)
      REMOTE_BACKEND_URL="$2"; shift 2;;
    -h|--help)
      print_help; exit 0;;
    *)
      echo "Unknown arg: $1" >&2
      print_help
      exit 2;;
  esac
done

export BACKEND_PORT="$LOCAL_BACKEND_PORT"
export FRONTEND_PORT="$LOCAL_FRONTEND_PORT"
export VITE_API_BASE_URL="http://localhost:${LOCAL_BACKEND_PORT}"

echo ""
echo "Local product URLs:"
echo "  Backend:  http://localhost:${LOCAL_BACKEND_PORT}"
echo "  Frontend: http://localhost:${LOCAL_FRONTEND_PORT}"
if [[ -n "$REMOTE_BACKEND_URL" ]]; then
  echo "  Remote backend (configured): ${REMOTE_BACKEND_URL}"
fi
echo ""
echo "Starting local backend + frontend..."
echo ""

# Do NOT start remote backend here.
# Use concurrently (preferred) if available via repo devDependencies.
pnpm exec concurrently -n be,fe -c blue,green \
  "pnpm run dev:backend" \
  "pnpm run dev:frontend"
