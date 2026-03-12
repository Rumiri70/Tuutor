# Tuutor Custom Manager

A custom lightweight manager for Tutor LMS trainings that provides a modern, fast, JavaScript-driven UI with a custom content block builder.

## Overview

The Tuutor Custom Manager plugin streamlines the process of managing content within the Tutor LMS ecosystem. Instead of using the traditional WordPress editor, it provides a custom interface built with Vanilla JS and WordPress REST APIs. It allows you to create trainings composed of specific content blocks, making it easier to maintain a premium and consistent design across your site.

## Features

-   **Modern Admin Interface**: A fast, AJAX-powered Single Page Application (SPA) for managing trainings without reloading the page.
-   **Custom Block Builder**: Build your training content using a predefined set of blocks:
    -   **Text**: Standard text and HTML content.
    -   **Image**: Resizable images with alignment and alt text support.
    -   **YouTube**: Embed responsive YouTube videos easily.
    -   **Accordion**: Create collapsible content sections.
    -   **Grid**: Create 2-column layouts containing text, images, videos, or accordions.
-   **Featured Media Support**: Easily attach a Featured Image and a Featured YouTube Video URL to any training.
-   **Custom Frontend Display**: The plugin overrides the default `the_content` filter for the `courses` post type, ensuring your custom blocks are rendered beautifully using the plugin's premium CSS.
-   **AJAX Trainings Archive**: Includes a comprehensive frontend archive page with dynamic filtering and search capabilities.

## Installation

1.  Upload the `Tuutor` folder to the `/wp-content/plugins/` directory, or upload the zip file via the WordPress Plugins screen.
2.  Activate the plugin through the 'Plugins' screen in WordPress.
3.  Ensure that Tutor LMS is installed and active, as this plugin manages the `courses` post type.

## Usage

### Managing Trainings

1.  Navigate to **Custom Trainings** in the WordPress admin sidebar.
2.  Click **+ Add Training** to create a new course.
3.  Fill in the Title, select Categories, and add a Featured Image and/or Featured YouTube Video.
4.  Use the **Content Blocks** builder to add your content sequentially.
5.  Click **Save Training**.

### Frontend Shortcodes

The plugin provides two primary shortcodes for displaying content on the frontend.

#### 1. The Trainings Archive `[tuutor_trainings]`

This shortcode renders the full AJAX-powered trainings archive, including a filtering sidebar and a responsive grid of courses.

**Usage:**
```html
[tuutor_trainings per_page="12"]
```

**Attributes:**
-   `per_page` (optional): The number of trainings to load per page. Default is `12`.

#### 2. Featured Video Embed `[tuutor_featured_video]`

This shortcode retrieves the URL saved in the "Featured YouTube Video URL" field for the current training and outputs a responsive iframe embed. This is useful for placing the featured video in a sidebar, custom template, or specific location within a page builder.

**Usage:**
```html
[tuutor_featured_video id="123"]
```

**Attributes:**
-   `id` (optional): The ID of the training post. If omitted, the shortcode will attempt to fetch the video for the current global post using `get_the_ID()`. Useful when placing the video outside the main loop.

## Folder Structure

-   `assets/`: Contains CSS and JS files for both the admin UI and frontend display.
-   `includes/`: Contains the core PHP classes.
    -   `class-tuutor-admin.php`: Handles the admin menu and script enqueuing.
    -   `class-tuutor-api.php`: Handles all custom REST API endpoints and AJAX requests.
    -   `class-tuutor-blocks.php`: Defines the supported custom blocks.
    -   `class-tuutor-display.php`: Handles frontend rendering, content filtering, and shortcodes.
-   `tuutor-custom-manager.php`: The main plugin file that initializes the classes.

## Development

The admin interface is driven by `assets/js/admin.js`, which interacts with the WordPress REST API endpoints defined in `includes/class-tuutor-api.php`. If you need to add new block types:
1.  Define the block structure and handling in `assets/js/admin.js` (in `renderBlocks` and `syncState`).
2.  Define how the block should render on the frontend in `includes/class-tuutor-display.php` (in the `render_blocks_ui` method).
3.  (Optional) Add it to the supported blocks list in `includes/class-tuutor-blocks.php`.
