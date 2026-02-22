# Homepage Add-on Documentation

## About

[Homepage](https://gethomepage.dev) is a modern, fully static, fast, secure, fully proxied, highly customizable application dashboard with integrations for over 100 services and translations for over 40 languages.

## Installation

1. Navigate to **Settings → Add-ons → Add-on Store** in Home Assistant.
2. Click the menu (⋮) in the top-right corner and choose **Repositories**.
3. Add `https://github.com/ItsDyno/ItsDyno-HA-Addons` and click **Add**.
4. Find the **Homepage** add-on and click **Install**.

## Configuration

### Option: `port` (default: `3000`)

The port on which Homepage will listen inside the container. You can also change the external (host) port by going to the **Network** tab of the add-on.

```yaml
port: 3000
```

> **Note:** When you change the external port in the **Network** tab, make sure the `allowed_hosts` value below reflects the new port (or leave it empty to allow all).

### Option: `allowed_hosts` (default: `""` — allows all)

A comma-separated list of `host` or `host:port` values that Homepage's built-in Next.js server will accept requests from. Leave this empty (the default) to allow requests from any host or IP — this is the recommended setting for a local Home Assistant installation.

If you see the error **"Host validation failed for: 192.168.x.x:3000"**, either leave `allowed_hosts` empty or add your Home Assistant IP and port here:

```yaml
allowed_hosts: "192.168.0.90:3000"
```

You can add multiple entries separated by commas:

```yaml
allowed_hosts: "192.168.0.90:3000,homeassistant.local:3000"
```

### Option: `password` (default: `""` — editor disabled)

The password for the built-in Config Editor. When set, a lightweight web editor starts on port **3001** that lets you edit all Homepage configuration files (settings, services, widgets, bookmarks, custom CSS/JS) directly from your browser.

Leave this empty to disable the Config Editor entirely.

```yaml
password: "my-secret-password"
```

> **Important:** Choose a strong password — anyone who can reach port 3001 on your Home Assistant host can edit your Homepage configuration if they know the password.

## Config Editor

When a `password` is set in the add-on configuration the Config Editor is available at:

```
http://<your-home-assistant-ip>:3001
```

Features:
- **Password-protected** – login required before you can view or edit any file
- **File tabs** – switch between `settings.yaml`, `services.yaml`, `widgets.yaml`, `bookmarks.yaml`, `custom.css`, `custom.js`, and `docker.yaml`
- **Save with Ctrl+S / Cmd+S** – keyboard shortcut for quick saving
- **Dark theme** – matches Homepage's default look
- **No external dependencies** – runs on Node.js built-in modules only
- **Rate limiting** – blocks brute-force login attempts
- **Session expiry** – sessions automatically expire after 24 hours

After saving a file in the editor, **restart the add-on** (or wait for Homepage to pick up changes) for your edits to take effect.

## Storage

Homepage stores all its configuration files (services, widgets, bookmarks, settings) in the add-on's config directory, which is directly accessible from the Home Assistant file system.

### Where are the config files?

The add-on automatically detects the correct config directory using the container hostname. Inside the container the path is:

```
/addon_configs/<hostname>/
```

The hostname is determined at startup and logged in the add-on log output. In Home Assistant the container hostname matches the add-on slug, so this typically resolves to `/addon_configs/homepage/`.

On the **host** filesystem the same directory is available under `/addon_configs/<addon_id>/`. The exact folder name depends on how Home Assistant resolved the add-on ID (e.g. a hash prefix when installed from a repository). The easiest ways to find and edit the files:

- **File Editor / Studio Code Server** – open the add-on, navigate to `/addon_configs/` and look for the folder matching the hostname shown in the add-on log.
- **Terminal & SSH add-on** – run `ls /addon_configs/` to list all add-on config folders, then `cd` into the correct one.

> **Tip:** Use the [File Editor](https://my.home-assistant.io/redirect/supervisor_addon/?addon=core_configurator) or [Studio Code Server](https://my.home-assistant.io/redirect/supervisor_addon/?addon=a0d7b954_vscode) add-on to browse to the config directory and edit the files there. Check the add-on log for the exact path.

### Configuration files

The following YAML files are created automatically on first start with working defaults to help you get started:

| File | Purpose |
|------|---------|
| `settings.yaml` | General settings (title, theme, color, layout …) |
| `services.yaml` | Service tiles displayed on the dashboard |
| `widgets.yaml` | Information widgets in the top bar |
| `bookmarks.yaml` | Bookmark groups |

See the [Homepage documentation](https://gethomepage.dev/configs/) for the full configuration reference.

## Watchdog

The watchdog is enabled by default. Home Assistant will automatically restart the add-on if it becomes unresponsive.

## Start on Boot

The add-on is configured to start automatically when Home Assistant boots (`boot: auto`). You can change this behaviour on the **Info** tab of the add-on.

## Support

- [Homepage documentation](https://gethomepage.dev)
- [Add-on repository issues](https://github.com/ItsDyno/ItsDyno-HA-Addons/issues)
