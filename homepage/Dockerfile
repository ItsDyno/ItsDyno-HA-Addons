ARG BUILD_FROM

# Stage 1: pull the pre-built Homepage application from the official image
FROM ghcr.io/gethomepage/homepage:latest AS homepage_source

# Stage 2: build the final HA add-on image on top of the HA base
FROM $BUILD_FROM

# Install Node.js (compatible with the pre-built Homepage app)
RUN apk add --no-cache nodejs

# Copy the pre-built Homepage application from the official image
COPY --from=homepage_source /app /app

# Copy the config editor
COPY editor/ /editor/

# Copy the startup script
COPY run.sh /run.sh
RUN chmod a+x /run.sh

CMD ["/run.sh"]
