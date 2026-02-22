#!/usr/bin/with-contenv bashio
# ==============================================================================
# Home Assistant Add-on: Homepage
# Starts the Homepage application
# ==============================================================================

# Read add-on configuration
PORT=$(bashio::config 'port' '3000')
ALLOWED_HOSTS=$(bashio::config 'allowed_hosts')
EDITOR_PASSWORD=$(bashio::config 'password')

bashio::log.info "Starting Homepage on port ${PORT}..."

# Automatically determine the config directory using the container hostname.
# In Home Assistant, the container hostname matches the add-on slug, which is
# also the folder name under /addon_configs/.  This makes the path dynamic so
# it works regardless of how the add-on was installed (local or repository).
HOSTNAME=$(hostname)
CONFIG_DIR="/addon_configs/${HOSTNAME}"
mkdir -p "${CONFIG_DIR}"

bashio::log.info "Detected hostname: ${HOSTNAME}"
bashio::log.info "Using config directory: ${CONFIG_DIR}"

# Create default config files with working defaults on first start.
if [ ! -f "${CONFIG_DIR}/settings.yaml" ]; then
    bashio::log.info "Creating default settings.yaml..."
    cat > "${CONFIG_DIR}/settings.yaml" << 'EOF'
# Homepage Settings
# Full reference: https://gethomepage.dev/configs/settings/

title: Homepage
theme: dark
color: slate
headerStyle: clean
EOF
fi

if [ ! -f "${CONFIG_DIR}/services.yaml" ]; then
    bashio::log.info "Creating default services.yaml..."
    # Unquoted EOF so ${HOSTNAME} is expanded to the detected hostname
    cat > "${CONFIG_DIR}/services.yaml" << EOF
# Homepage Services
# Full reference: https://gethomepage.dev/configs/services/
# Note: adjust the href below if your Home Assistant uses a different port or hostname.

- My Home:
    - Home Assistant:
        icon: home-assistant.png
        href: http://${HOSTNAME}:8123
        description: Home automation
EOF
fi

if [ ! -f "${CONFIG_DIR}/widgets.yaml" ]; then
    bashio::log.info "Creating default widgets.yaml..."
    cat > "${CONFIG_DIR}/widgets.yaml" << 'EOF'
# Homepage Widgets
# Full reference: https://gethomepage.dev/configs/widgets/

- search:
    provider: duckduckgo
    target: _blank
EOF
fi

if [ ! -f "${CONFIG_DIR}/bookmarks.yaml" ]; then
    bashio::log.info "Creating default bookmarks.yaml..."
    cat > "${CONFIG_DIR}/bookmarks.yaml" << 'EOF'
# Homepage Bookmarks
# Full reference: https://gethomepage.dev/configs/bookmarks/

- Links:
    - GitHub:
        - abbr: GH
          href: https://github.com
    - Homepage Docs:
        - abbr: HD
          href: https://gethomepage.dev
EOF
fi

bashio::log.info "Config files are located in ${CONFIG_DIR}/ inside the container."

# Tell Homepage where to find its configuration
export HOMEPAGE_CONFIG_DIR="${CONFIG_DIR}"

# Set the port Homepage should listen on
export PORT

# Allow requests from any host by default so the add-on works regardless of
# the host IP or port mapping chosen by the user.  The user can override this
# with the allowed_hosts config option.
if bashio::config.has_value 'allowed_hosts'; then
    export HOMEPAGE_ALLOWED_HOSTS="${ALLOWED_HOSTS}"
else
    export HOMEPAGE_ALLOWED_HOSTS="*"
fi

# ── Start the Config Editor (if a password is configured) ──────────────────
if [ -n "${EDITOR_PASSWORD}" ]; then
    bashio::log.info "Starting Config Editor on port 3001..."
    EDITOR_PASSWORD="${EDITOR_PASSWORD}" \
    EDITOR_PORT=3001 \
    HOMEPAGE_CONFIG_DIR="${CONFIG_DIR}" \
    node /editor/server.js &
else
    bashio::log.warning "No password set – Config Editor is disabled."
    bashio::log.warning "Set a password in the add-on configuration to enable the editor on port 3001."
fi

# Replace the shell process with Node so that signals (SIGTERM) are forwarded
# correctly and the add-on shuts down cleanly
exec node /app/server.js
