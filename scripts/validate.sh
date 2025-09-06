#!/usr/bin/env bash
set -euo pipefail

echo "🔧 Unified MCP Validation"
echo "=========================="

# Build
echo "📦 Building..."
npm run build || { echo "❌ Build failed"; exit 1; }

# Create temp file
TMPFILE=$(mktemp)
# Remove temp file on exit or error
cleanup() { rm -f "$TMPFILE"; }
trap cleanup EXIT ERR

# Start server
echo "🚀 Starting server (mock mode)..."
EASYPOST_API_KEY=mock VEEQO_API_KEY=mock LOG_LEVEL=silent node dist/server.js > "$TMPFILE" 2>/dev/null &
PID=$!
trap "kill $PID 2>/dev/null || true; rm -f $TMPFILE" EXIT

# Helper to send commands
send() { printf '%s\n' "$1" > "/proc/$PID/fd/0"; }

sleep 0.4

echo "📡 Sending test requests..."
send '{"jsonrpc":"2.0","id":1,"method":"initialize"}'
send '{"jsonrpc":"2.0","id":2,"method":"tools/list"}'
send '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"ep.health","arguments":{}}}'
send '{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"ep.parcel_presets","arguments":{}}}'
send '{"jsonrpc":"2.0","id":5,"method":"tools/call","params":{"name":"ep.weight_to_oz","arguments":{"pounds":5,"ounces":3}}}'

sleep 0.6

echo "📋 Checking responses..."
if grep -q '"capabilities"' "$TMPFILE" && \
   grep -q '"tools"' "$TMPFILE" && \
   grep -q '"healthy"' "$TMPFILE" && \
   grep -q '"weight_oz":83' "$TMPFILE"; then
  echo "✅ All tests passed!"
  head -n 3 "$TMPFILE" || true
else
  echo "❌ Some tests failed. Output:"
  cat "$TMPFILE"
  exit 1
fi
