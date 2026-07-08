#!/bin/sh
set -eu

if [ -n "${NGROK_AUTHTOKEN:-}" ] && [ -n "${NGROK_DOMAIN:-}" ]; then
  ngrok config add-authtoken "$NGROK_AUTHTOKEN" --config /tmp/ngrok.yml >/dev/null 2>&1
  exec ngrok http --config /tmp/ngrok.yml --log=stderr --log-level=info --url "https://$NGROK_DOMAIN" "${NGROK_TARGET:-frontend:80}"
fi

echo "ngrok tunnel disabled: set NGROK_AUTHTOKEN and NGROK_DOMAIN"
tail -f /dev/null
