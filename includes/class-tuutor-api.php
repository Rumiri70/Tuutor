<?php
/**
 * REST API for Tuutor Custom Manager
 */

if (!defined('ABSPATH')) {
    exit;
}

class Tuutor_API
{

    protected $namespace = 'tuutor/v1';

    public function __construct()
    {
        add_action('rest_api_init', array($this, 'register_routes'));

        // AJAX handlers for archive filtering
        add_action('wp_ajax_tuutor_fetch_archive', array($this, 'ajax_fetch_trainings'));
        add_action('wp_ajax_nopriv_tuutor_fetch_archive', array($this, 'ajax_fetch_trainings'));
    }

    /**
     * Register REST API routes
     */
    public function register_routes()
    {
        register_rest_route($this->namespace, '/trainings', array(
            array(
                'methods' => 'GET',
                'callback' => array($this, 'get_trainings'),
                'permission_callback' => array($this, 'check_permissions'),
            ),
            array(
                'methods' => 'POST',
                'callback' => array($this, 'create_training'),
                'permission_callback' => array($this, 'check_permissions'),
            ),
        ));

        register_rest_route($this->namespace, '/trainings/(?P<id>\d+)', array(
            array(
                'methods' => 'GET',
                'callback' => array($this, 'get_training'),
                'permission_callback' => array($this, 'check_permissions'),
            ),
            array(
                'methods' => 'PUT',
                'callback' => array($this, 'update_training'),
                'permission_callback' => array($this, 'check_permissions'),
            ),
            array(
                'methods' => 'DELETE',
                'callback' => array($this, 'delete_training'),
                'permission_callback' => array($this, 'check_permissions'),
            ),
        ));

        register_rest_route($this->namespace, '/categories', array(
            array(
                'methods' => 'GET',
                'callback' => array($this, 'get_categories'),
                'permission_callback' => array($this, 'check_permissions'),
            ),
            array(
                'methods' => 'POST',
                'callback' => array($this, 'create_category'),
                'permission_callback' => array($this, 'check_permissions'),
            ),
        ));
    }

    /**
     * Check if user has permission to manage trainings
     */
    public function check_permissions()
    {
        return current_user_can('manage_options');
    }

    /**
     * Get all trainings (courses) from Tutor LMS tables
     */
    public function get_trainings($request)
    {
        $per_page = $request->get_param('per_page') ? (int) $request->get_param('per_page') : 10;
        $page = $request->get_param('page') ? (int) $request->get_param('page') : 1;

        $args = array(
            'post_type' => 'courses',
            'post_status' => 'any',
            'posts_per_page' => $per_page,
            'paged' => $page,
            'orderby' => 'ID',
            'order' => 'DESC',
        );

        $query = new WP_Query($args);
        $trainings = array();

        if ($query->have_posts()) {
            while ($query->have_posts()) {
                $query->the_post();
                $trainings[] = $this->prepare_item_for_response(get_post());
            }
            wp_reset_postdata();
        }

        $data = array(
            'items' => $trainings,
            'total' => (int) $query->found_posts,
            'totalPages' => (int) $query->max_num_pages,
        );

        return rest_ensure_response($data);
    }

    /**
     * Get a single training
     */
    public function get_training($request)
    {
        $post = get_post($request['id']);
        if (!$post || 'courses' !== $post->post_type) {
            return new WP_Error('tuutor_not_found', __('Training not found', 'tuutor'), array('status' => 404));
        }
        return rest_ensure_response($this->prepare_item_for_response($post));
    }

    /**
     * Create a new training
     */
    public function create_training($request)
    {
        $data = $request->get_params();

        $new_post = array(
            'post_title' => sanitize_text_field($data['title']),
            'post_content' => wp_kses_post($data['content']),
            'post_status' => 'publish',
            'post_type' => 'courses',
        );

        $post_id = wp_insert_post($new_post);

        if (is_wp_error($post_id)) {
            return $post_id;
        }

        if (!empty($data['categories'])) {
            wp_set_object_terms($post_id, array_map('intval', $data['categories']), 'course-category');
        }

        // Save custom blocks JSON to meta
        if (isset($data['blocks'])) {
            update_post_meta($post_id, '_tuutor_custom_blocks', json_encode($data['blocks']));
        }

        // Handle featured image
        if (!empty($data['featured_image_id'])) {
            set_post_thumbnail($post_id, (int) $data['featured_image_id']);
        }

        return rest_ensure_response($this->prepare_item_for_response(get_post($post_id)));
    }

    /**
     * Update an existing training
     */
    public function update_training($request)
    {
        $post_id = (int) $request['id'];
        $data = $request->get_params();

        $update_post = array(
            'ID' => $post_id,
            'post_title' => sanitize_text_field($data['title']),
            'post_content' => wp_kses_post($data['content']),
        );

        wp_update_post($update_post);

        if (!empty($data['categories'])) {
            wp_set_object_terms($post_id, array_map('intval', $data['categories']), 'course-category');
        }

        if (isset($data['blocks'])) {
            update_post_meta($post_id, '_tuutor_custom_blocks', json_encode($data['blocks']));
        }

        // Handle featured image
        if (isset($data['featured_image_id'])) {
            if (empty($data['featured_image_id'])) {
                delete_post_thumbnail($post_id);
            } else {
                set_post_thumbnail($post_id, (int) $data['featured_image_id']);
            }
        }

        return rest_ensure_response($this->prepare_item_for_response(get_post($post_id)));
    }

    /**
     * Delete a training
     */
    public function delete_training($request)
    {
        $post_id = (int) $request['id'];
        $post = get_post($post_id);

        if (!$post || 'courses' !== $post->post_type) {
            return new WP_Error('tuutor_not_found', __('Training not found', 'tuutor'), array('status' => 404));
        }

        wp_delete_post($post_id);
        return rest_ensure_response(array('success' => true));
    }

    /**
     * Get categories
     */
    public function get_categories($request)
    {
        $categories = get_terms(array(
            'get' => 'all',
            'taxonomy' => 'course-category',
        ));
        return rest_ensure_response($categories);
    }

    /**
     * Create a category
     */
    public function create_category($request)
    {
        $name = sanitize_text_field($request->get_param('name'));
        $term = wp_insert_term($name, 'course-category');
        if (is_wp_error($term)) {
            return $term;
        }
        return rest_ensure_response(get_term($term['term_id'], 'course-category'));
    }

    /**
     * AJAX Fetch Trainings for Archive
     */
    public function ajax_fetch_trainings()
    {
        check_ajax_referer('tuutor_archive_nonce', 'nonce');

        $paged = isset($_POST['page']) ? intval($_POST['page']) : 1;
        $cat = isset($_POST['category']) && $_POST['category'] !== 'all' ? intval($_POST['category']) : '';
        $search = isset($_POST['search']) ? sanitize_text_field($_POST['search']) : '';
        $per_page = isset($_POST['per_page']) ? intval($_POST['per_page']) : 12;

        $args = array(
            'post_type' => 'courses',
            'posts_per_page' => $per_page,
            'paged' => $paged,
            'post_status' => 'publish',
            's' => $search,
        );

        if ($cat) {
            $args['tax_query'] = array(
                array(
                    'taxonomy' => 'course-category',
                    'field' => 'term_id',
                    'terms' => $cat,
                ),
            );
        }

        $query = new WP_Query($args);
        $html = '';

        if ($query->have_posts()) {
            while ($query->have_posts()) {
                $query->the_post();
                $post_id = get_the_ID();
                $thumb = get_the_post_thumbnail_url($post_id, 'medium_large') ?: TUUTOR_CUSTOM_URL . 'assets/images/placeholder.jpg';

                $html .= '<article class="tuutor-card">';
                $html .= '  <div class="tuutor-card-image"><img src="' . esc_url($thumb) . '" alt="' . esc_attr(get_the_title()) . '"></div>';
                $html .= '  <div class="tuutor-card-body">';
                $html .= '    <h4 class="tuutor-card-title"><a href="' . get_permalink() . '">' . get_the_title() . '</a></h4>';
                $html .= '    <div class="tuutor-card-meta">' . wp_trim_words(get_the_excerpt(), 15) . '</div>';
                $html .= '    <a href="' . get_permalink() . '" class="tuutor-card-btn">' . __('View Training', 'tuutor') . '</a>';
                $html .= '  </div>';
                $html .= '</article>';
            }
        } else {
            $html = '<div class="tuutor-no-results">' . __('No trainings found matching your criteria.', 'tuutor') . '</div>';
        }

        $data = array(
            'html' => $html,
            'max_pages' => $query->max_num_pages,
            'found_posts' => $query->found_posts,
            'current_page' => $paged
        );

        wp_send_json_success($data);
    }

    /**
     * Prepare item for API response
     */
    protected function prepare_item_for_response($post)
    {
        $blocks_json = get_post_meta($post->ID, '_tuutor_custom_blocks', true);
        $blocks = !empty($blocks_json) ? json_decode($blocks_json, true) : array();

        return array(
            'id' => $post->ID,
            'title' => $post->post_title,
            'content' => $post->post_content,
            'status' => $post->post_status,
            'categories' => wp_get_object_terms($post->ID, 'course-category', array('fields' => 'ids')),
            'blocks' => $blocks,
            'permalink' => get_permalink($post->ID),
            'featured_image' => array(
                'id' => get_post_thumbnail_id($post->ID),
                'url' => get_the_post_thumbnail_url($post->ID, 'large'),
            ),
        );
    }
}
