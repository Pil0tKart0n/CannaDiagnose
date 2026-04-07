FROM node:20-alpine AS build

WORKDIR /app

# Build args for Expo (EXPO_PUBLIC_* vars needed at build time)
ARG EXPO_PUBLIC_API_PROXY_URL=https://leafscan.de
ENV EXPO_PUBLIC_API_PROXY_URL=$EXPO_PUBLIC_API_PROXY_URL

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy source code
COPY . .

# Build PWA
RUN npx expo export --platform web

# Copy PWA extras into dist (BEFORE inject-seo so SW versioning works)
RUN cp public/manifest.json dist/ && cp public/sw.js dist/ && \
    cp -r public/reference_images dist/reference_images && \
    mkdir -p dist/download

# Inject SEO meta tags + auto-version service worker
COPY inject-seo.sh ./
RUN chmod +x inject-seo.sh && sh inject-seo.sh

# ── Production image ──
FROM nginx:alpine

# Copy built PWA files
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx config and entrypoint
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh && \
    chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    touch /var/run/nginx.pid && chown nginx:nginx /var/run/nginx.pid

EXPOSE 80 443

ENTRYPOINT ["/docker-entrypoint.sh"]
