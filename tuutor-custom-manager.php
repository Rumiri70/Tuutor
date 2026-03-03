<?php
/**
 * Plugin Name: Tuutor Custom Manager
 * Description: A custom manager for Tutor LMS trainings with a modern UI and custom content blocks (Text, Resizable Image, Accordion).
 * Version: 1.0.0
 * Author: Antigravity
 */

if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly.
}

// Define constants
define('TUUTOR_CUSTOM_PATH', plugin_dir_path(__FILE__));
define('TUUTOR_CUSTOM_URL', plugin_dir_url(__FILE__));

// Include required files
require_once TUUTOR_CUSTOM_PATH . 'includes/class-tuutor-admin.php';
require_once TUUTOR_CUSTOM_PATH . 'includes/class-tuutor-display.php';
require_once TUUTOR_CUSTOM_PATH . 'includes/class-tuutor-blocks.php';
require_once TUUTOR_CUSTOM_PATH . 'includes/class-tuutor-api.php';

/**
 * Initialize the plugin
 */
function tuutor_custom_init()
{
    new Tuutor_Admin();
    new Tuutor_Display();
    new Tuutor_Blocks();
    new Tuutor_API();
}
add_action('plugins_loaded', 'tuutor_custom_init');
