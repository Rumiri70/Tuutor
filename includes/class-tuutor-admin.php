<?php
/**
 * Admin Class for Tuutor Custom Manager
 */

if (!defined('ABSPATH')) {
    exit;
}

class Tuutor_Admin
{

    public function __construct()
    {
        add_action('admin_menu', array($this, 'register_admin_menu'));
        add_action('admin_enqueue_scripts', array($this, 'enqueue_admin_scripts'));
        add_action('save_post_courses', array($this, 'save_custom_training_data'));
    }

    /**
     * Register the admin menu for custom training management
     */
    public function register_admin_menu()
    {
        add_menu_page(
            __('Custom Trainings', 'tuutor'),
            __('Custom Trainings', 'tuutor'),
            'manage_options',
            'tuutor-custom-manager',
            array($this, 'render_admin_page'),
            'dashicons-welcome-learn-more',
            20
        );
    }

    /**
     * Render the custom admin page (The CRUD interface)
     */
    public function render_admin_page()
    {
        // This will be a React or Vue-like interface built with modern vanilla JS
        ?>
        <div id="tuutor-admin-app" class="wrap">
            <h1><?php _e('Custom Trainings Manager', 'tuutor'); ?></h1>
            <p><?php _e('Manage your trainings with a streamlined, modern UI using the same Tutor LMS database tables.', 'tuutor'); ?>
            </p>
            <div id="tuutor-app-root">
                <!-- JS will render the UI here -->
                <div class="tuutor-loading">
                    <span class="spinner is-active"></span>
                    Loading...
                </div>
            </div>
        </div>
        <?php
    }

    /**
     * Enqueue admin scripts and styles
     */
    public function enqueue_admin_scripts($hook)
    {
        if ('toplevel_page_tuutor-custom-manager' !== $hook) {
            return;
        }

        wp_enqueue_media();
        wp_enqueue_editor();

        wp_enqueue_style('tuutor-admin-css', TUUTOR_CUSTOM_URL . 'assets/css/admin.css', array(), '1.0.0');
        wp_enqueue_script('tuutor-admin-js', TUUTOR_CUSTOM_URL . 'assets/js/admin.js', array('jquery', 'wp-util'), '1.0.0', true);

        // Localize script for API access
        wp_localize_script('tuutor-admin-js', 'tuutorSettings', array(
            'apiUrl' => esc_url_raw(rest_url('tuutor/v1')),
            'nonce' => wp_create_nonce('wp_rest'),
        ));
    }

    /**
     * Save custom training data if needed
     */
    public function save_custom_training_data($post_id)
    {
        if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) {
            return;
        }
        // Custom save logic if using traditional meta boxes
    }
}
