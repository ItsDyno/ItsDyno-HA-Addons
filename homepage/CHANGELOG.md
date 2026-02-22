# Changelog

## 1.2.0

- Add built-in **Config Editor** web panel on port 3001 — edit all Homepage configuration files (`settings.yaml`, `services.yaml`, `widgets.yaml`, `bookmarks.yaml`, `custom.css`, `custom.js`, `docker.yaml`) directly from your browser
- New `password` configuration option — set a password to enable the Config Editor; leave empty to keep it disabled
- Password-protected login with rate limiting (max 5 attempts per 15 minutes) and 24-hour session expiry
- Dark-themed editor UI with file tabs, Ctrl+S / Cmd+S save shortcut, and Tab-key indentation
- Editor uses only built-in Node.js modules (zero external dependencies)

## 1.1.0

- Automatically determine the config directory using the container hostname instead of a hardcoded path — in Home Assistant the container hostname matches the add-on slug (the folder name under `/addon_configs/`), so the path is now always correct regardless of how the add-on was installed
- Default config files are now created with working (uncommented) defaults on first start: dark theme, a Home Assistant service tile using the detected hostname, a DuckDuckGo search widget, and starter bookmarks
- Log the detected hostname and resolved config directory at startup for easier debugging

## 1.0.4

- Fix config files not being written: `CONFIG_DIR` was incorrectly set to `/homeassistant` (the HA config mount). It is now set to `/addon_configs/homepage/`, the correct in-container path for the `addon_config:rw` volume with slug `homepage`
- Remove incorrect reference to `/addon_configs/local_homepage/` in log messages and documentation; the in-container path is always `/addon_configs/homepage/` regardless of how the add-on was installed
- Update documentation to document both the in-container path and how to navigate to it with the File Editor, Studio Code Server, or the Terminal & SSH add-on

## 1.0.3

- Fix config files not being found: switch volume map from `data:rw` to `addon_config:rw` so config files are stored at `/addon_configs/local_homepage/` on the host (directly accessible via File Editor or Studio Code Server)
- Config files (`settings.yaml`, `services.yaml`, `widgets.yaml`, `bookmarks.yaml`) are now created with commented-out examples on first start instead of empty files
- Update documentation to clarify correct host path for config files

## 1.0.2

- Add `port` configuration option so the internal listening port can be changed without modifying the Network tab alone
- Add `allowed_hosts` configuration option (defaults to `*` — all hosts allowed) to fix the "Host validation failed" error that appears when accessing Homepage via a local IP address or a non-default port
- Set `HOMEPAGE_ALLOWED_HOSTS` automatically at startup based on the `allowed_hosts` option
- Update documentation with guidance on where config files are stored (`/addon_configs/local_homepage/`) and how to fix host-validation errors

## 1.0.1

- Fix `s6-overlay-suexec: fatal: can only run as pid 1` by disabling s6-overlay init (`init: false`)
- Remove duplicate port option from add-on configuration (port is fixed at 3000 via the ports mapping)

## 1.0.0

- Initial release
- Homepage application based on the official `ghcr.io/gethomepage/homepage` Docker image
- Configurable port (default: 3000)
- Watchdog enabled by default
- Start on boot enabled by default
- Configuration stored in the add-on's private `/data` directory (removed on uninstall)
