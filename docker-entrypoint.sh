#!/bin/sh
# Replace the API key placeholder in nginx config
sed -i "s|REPLACE_OPENAI_KEY|${OPENAI_API_KEY}|g" /etc/nginx/conf.d/default.conf

# Start nginx
exec nginx -g 'daemon off;'
