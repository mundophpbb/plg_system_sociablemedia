# Sociable Emoji & GIF

A lightweight Joomla system plugin that adds Emoji and optional GIF support to Sociable without modifying Sociable core files.

## Why this plugin exists

Sociable provides posting, commenting, and reply functionality, but does not include a built-in Emoji picker or an integrated GIF search interface.

This plugin was created to extend the Sociable composer while keeping the original component untouched.

The main design goal is simple:

> Add useful interaction features without modifying the Sociable core.

This makes the plugin easier to maintain and reduces the risk of custom changes being overwritten by future Sociable updates.

## Features

- Integrated Emoji picker
- Works with posts
- Works with comments
- Works with replies
- Emoji support does not require any external API
- Optional GIF support
- Direct GIF URL fallback
- Emoji and GIF features can be enabled independently
- Responsive interface
- Joomla plugin configuration
- No Sociable core modifications

## Emoji Support

Emoji support works independently from external services.

Users can open the Emoji picker directly from the Sociable composer and insert Unicode emojis into posts, comments, and replies.

Because standard Unicode characters are used, no external API or third-party service is required.

## GIF Support

GIF support is optional.

Depending on the plugin configuration, GIFs can be handled through:

- a supported external GIF provider;
- direct GIF URLs.

Administrators can disable GIF functionality completely while keeping Emoji support enabled.

This is useful when a site administrator prefers not to depend on an external API, rate limits, third-party terms, or external content providers.

## Core-Safe Design

The plugin does not modify Sociable core files.

Instead, it detects the Sociable interface on the frontend and injects the additional controls independently.

This approach provides several advantages:

- Sociable updates are less likely to overwrite custom functionality;
- the plugin can be disabled at any time;
- maintenance is easier;
- troubleshooting remains isolated from the main component.

## Installation

1. Download the plugin ZIP package.
2. Log in to the Joomla Administrator panel.
3. Go to:

   `System → Install → Extensions`

4. Upload the ZIP package.
5. Go to:

   `System → Manage → Plugins`

6. Find:

   `System - Sociable Emoji & GIF`

7. Enable the plugin.

## Configuration

Open the plugin settings from the Joomla Plugin Manager.

Available options may include:

- Enable Emoji
- Enable GIF
- GIF provider settings
- GIF API key
- Content rating
- Number of GIF results
- GIF display size

If you only want Emoji functionality, simply disable GIF support.

No external configuration is required for Emoji.

## Recommended Setup

For a simple and dependency-free installation:

- Emoji: Enabled
- GIF: Disabled

This provides the Emoji picker without requiring API keys or external services.

GIF functionality can be enabled later if required.

## Usage

When creating a post, comment, or reply in Sociable, additional controls are displayed in the composer.

Click the Emoji icon to open the Emoji picker.

Select an Emoji and it will be inserted into the active text field.

If GIF support is enabled, the GIF control can also be used according to the configured provider or insertion method.

## Compatibility

This plugin was developed specifically for Sociable on Joomla.

Because Sociable uses a dynamic frontend interface, compatibility can depend on changes made to Sociable's composer structure in future versions.

The plugin intentionally remains independent from the Sociable core so that compatibility fixes can be applied without modifying the original component.

## Troubleshooting

If the Emoji controls do not appear:

1. Confirm that the plugin is enabled.
2. Clear Joomla cache.
3. Clear browser cache.
4. Reload the Sociable page.
5. Confirm that the user is logged in.
6. Check that Emoji support is enabled in the plugin settings.

If GIF search is enabled but does not work, verify the external provider configuration and API credentials.

## Philosophy

This plugin follows a non-invasive extension approach.

Instead of patching Sociable directly, additional functionality is provided through a standalone Joomla plugin.

This keeps the solution modular, reversible, and easier to maintain.

## Version

Current development branch:

`1.x`

## License

Use and distribution should follow the license terms of this project and any applicable Joomla or Sociable requirements.
