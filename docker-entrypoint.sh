#!/bin/sh
set -e

# Validate required environment variables
if [ -z "$OPENAI_API_KEY" ]; then
  echo "[LeafScan] WARNING: OPENAI_API_KEY is not set! API proxy will not work."
fi

# Replace the API key placeholder in nginx config (use perl for safe escaping)
if command -v perl > /dev/null 2>&1; then
  perl -pi -e "s/REPLACE_OPENAI_KEY/\$ENV{OPENAI_API_KEY}/g" /etc/nginx/conf.d/default.conf
else
  # Fallback to sed with different delimiter to handle special chars
  ESCAPED_KEY=$(printf '%s' "$OPENAI_API_KEY" | sed 's/[&/\]/\\&/g')
  sed -i "s/REPLACE_OPENAI_KEY/${ESCAPED_KEY}/g" /etc/nginx/conf.d/default.conf
fi

# Start nginx
exec nginx -g 'daemon off;'
