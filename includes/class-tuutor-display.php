<?php
/**
 * Display Class for Tuutor Custom Manager
 */

if (!defined('ABSPATH')) {
    exit;
}

class Tuutor_Display
{

    public function __construct()
    {
        add_filter('the_content', array($this, 'filter_course_content'));
        add_action('wp_enqueue_scripts', array($this, 'enqueue_frontend_assets'));
        add_shortcode('tuutor_trainings', array($this, 'render_trainings_archive'));
        add_shortcode('tuutor_featured_video', array($this, 'render_featured_video_shortcode'));
    }

    /**
     * Filter the content of courses to use our custom block layout
     */
    public function filter_course_content($content)
    {
        if (!is_singular('courses')) {
            return $content;
        }

        $post_id = get_the_ID();
        $blocks_json = get_post_meta($post_id, '_tuutor_custom_blocks', true);

        ob_start();
        ?>
        <div class="tuutor-premium-display">
            <header class="tuutor-header">
                <div class="tuutor-category-badges">
                    <?php
                    $terms = get_the_terms($post_id, 'course-category');
                    if ($terms && !is_wp_error($terms)) {
                        foreach ($terms as $term) {
                            echo '<span class="tuutor-badge">' . esc_html($term->name) . '</span>';
                        }
                    }
                    ?>
                </div>
                <?php if (has_post_thumbnail()): ?>
                    <div class="tuutor-featured-image">
                        <?php the_post_thumbnail('large'); ?>
                    </div>
                <?php endif; ?>
                <h1>
                    <?php the_title(); ?>
                </h1>
            </header>

            <div class="tuutor-content-blocks">
                <?php
                if (!empty($blocks_json)) {
                    $blocks = json_decode($blocks_json, true);
                    if (is_array($blocks)) {
                        $this->render_blocks_ui($blocks);
                    } else {
                        echo do_shortcode($content);
                    }
                } else {
                    echo do_shortcode($content);
                }
                ?>
            </div>

            <?php $this->render_navigation(); ?>
        </div>
        <?php
        return ob_get_clean();
    }

    /**
     * Render blocks only
     */
    protected function render_blocks_ui($blocks)
    {
        foreach ($blocks as $block): ?>
            <div class="tuutor-block tuutor-block-<?php echo esc_attr($block['type']); ?>">
                <?php
                switch ($block['type']) {
                    case 'text':
                        echo do_shortcode(wp_kses_post($block['content']));
                        break;
                    case 'image':
                        $width = !empty($block['width']) ? $block['width'] : '100%';
                        $align = !empty($block['align']) ? 'align' . $block['align'] : 'aligncenter';
                        echo '<img src="' . esc_url($block['url']) . '" style="width:' . esc_attr($width) . ';" class="' . esc_attr($align) . '" alt="' . esc_attr($block['alt']) . '">';
                        break;
                    case 'youtube':
                        $url = esc_url($block['url'] ?? '');
                        preg_match('%(?:youtube(?:-nocookie)?\.com/(?:[^/]+/.+/|(?:v|e(?:mbed)?)/|.*[?&]v=)|youtu\.be/)([^"&?/\s]{11})%i', $url, $match);
                        $youtube_id = isset($match[1]) ? $match[1] : '';
                        if ($youtube_id) {
                            echo '<div class="tuutor-youtube-embed"><iframe width="100%" height="400" src="https://www.youtube.com/embed/' . esc_attr($youtube_id) . '" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>';
                        }
                        break;
                    case 'accordion':
                        $this->render_accordion($block['items']);
                        break;
                    case 'grid':
                        echo '<div class="tuutor-grid-row">';
                        foreach ($block['columns'] as $col) {
                            echo '<div class="tuutor-grid-col">';
                            if ($col['type'] === 'text') {
                                echo do_shortcode(wp_kses_post($col['content']));
                            } else if ($col['type'] === 'image') {
                                echo '<img src="' . esc_url($col['url']) . '" alt="' . esc_attr($col['alt'] ?? '') . '">';
                            } else if ($col['type'] === 'youtube') {
                                $url = esc_url($col['url'] ?? '');
                                preg_match('%(?:youtube(?:-nocookie)?\.com/(?:[^/]+/.+/|(?:v|e(?:mbed)?)/|.*[?&]v=)|youtu\.be/)([^"&?/\s]{11})%i', $url, $match);
                                $youtube_id = isset($match[1]) ? $match[1] : '';
                                if ($youtube_id) {
                                    echo '<div class="tuutor-youtube-embed"><iframe width="100%" height="300" src="https://www.youtube.com/embed/' . esc_attr($youtube_id) . '" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>';
                                }
                            } else if ($col['type'] === 'accordion' && !empty($col['items'])) {
                                $this->render_accordion($col['items']);
                            }
                            echo '</div>';
                        }
                        echo '</div>';
                        break;
                }
                ?>
            </div>
        <?php endforeach;
    }

    /**
     * Render Accordion Component
     */
    protected function render_accordion($items)
    {
        if (empty($items))
            return;
        ?>
        <div class="tuutor-accordion-group">
            <?php foreach ($items as $index => $item): ?>
                <div class="tuutor-accordion-item">
                    <button class="tuutor-accordion-trigger" aria-expanded="false">
                        <?php echo esc_html($item['title']); ?>
                        <span class="tuutor-accordion-icon"></span>
                    </button>
                    <div class="tuutor-accordion-content">
                        <div class="tuutor-accordion-inner">
                            <?php echo wp_kses_post($item['content']); ?>
                        </div>
                    </div>
                </div>
            <?php endforeach; ?>
        </div>
        <?php
    }

    /**
     * Enqueue frontend scripts and styles
     */
    public function enqueue_frontend_assets()
    {
        if (!is_singular('courses') && !has_shortcode(get_post()->post_content ?? '', 'tuutor_trainings')) {
            return;
        }

        wp_enqueue_style('tuutor-fonts', 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        wp_enqueue_style('tuutor-display-css', TUUTOR_CUSTOM_URL . 'assets/css/display.css', array(), '1.1.0');
        wp_enqueue_script('tuutor-display-js', TUUTOR_CUSTOM_URL . 'assets/js/display.js', array('jquery'), '1.1.0', true);

        // Localize for AJAX filtering
        wp_localize_script('tuutor-display-js', 'tuutorData', array(
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('tuutor_archive_nonce'),
        ));
    }

    /**
     * Render Responsive Trainings Archive via Shortcode
     */
    public function render_trainings_archive($atts)
    {
        $atts = shortcode_atts(array(
            'per_page' => 12,
        ), $atts);

        $categories = get_terms(array(
            'taxonomy' => 'course-category',
            'hide_empty' => true,
        ));

        ob_start();
        ?>
        <div class="tuutor-archive-wrapper">
            <!-- Mobile Filter Toggle -->
            <button class="tuutor-mobile-filter-btn" id="tuutor-filter-toggle">
                <span class="dashicons dashicons-filter"></span>
                <?php _e('Filters', 'tuutor'); ?>
            </button>

            <div class="tuutor-archive-container">
                <!-- Sidebar Filters -->
                <aside class="tuutor-archive-sidebar" id="tuutor-sidebar">
                    <div class="tuutor-sidebar-header">
                        <h3><?php _e('Filters', 'tuutor'); ?></h3>
                        <button id="tuutor-close-sidebar" class="tuutor-close-btn">&times;</button>
                    </div>

                    <div class="tuutor-filter-group">
                        <h3><?php _e('Search', 'tuutor'); ?></h3>
                        <div class="tuutor-search-box">
                            <input type="text" id="tuutor-search-input"
                                placeholder="<?php _e('Search trainings...', 'tuutor'); ?>">
                        </div>
                    </div>

                    <div class="tuutor-filter-group">
                        <h3><?php _e('Categories', 'tuutor'); ?></h3>
                        <ul class="tuutor-filter-list">
                            <li>
                                <label>
                                    <input type="radio" name="tuutor-cat" value="all" checked>
                                    <span><?php _e('All Trainings', 'tuutor'); ?></span>
                                </label>
                            </li>
                            <?php foreach ($categories as $cat): ?>
                                <li>
                                    <label>
                                        <input type="radio" name="tuutor-cat" value="<?php echo esc_attr($cat->term_id); ?>">
                                        <span><?php echo esc_html($cat->name); ?></span>
                                    </label>
                                </li>
                            <?php endforeach; ?>
                        </ul>
                    </div>
                </aside>

                <!-- Results Area -->
                <main class="tuutor-archive-main">
                    <div id="tuutor-archive-results" class="tuutor-training-grid"
                        data-per-page="<?php echo esc_attr($atts['per_page']); ?>">
                        <!-- Trainings will be loaded here via AJAX -->
                        <div class="tuutor-loading-placeholder">
                            <span class="spinner is-active"></span>
                        </div>
                    </div>

                    <div id="tuutor-pagination" class="tuutor-pagination">
                        <!-- Pagination will be rendered here -->
                    </div>
                </main>
            </div>
        </div>
        <?php
        return ob_get_clean();
    }

    /**
     * Render Next/Previous Training Navigation
     */
    protected function render_navigation()
    {
        $prev_post = get_previous_post();
        $next_post = get_next_post();

        if (!$prev_post && !$next_post) {
            return;
        }
        ?>
        <nav class="tuutor-navigation">
            <div class="tuutor-nav-links">
                <?php if ($prev_post): ?>
                    <a href="<?php echo get_permalink($prev_post); ?>" class="tuutor-nav-link tuutor-nav-prev">
                        <span class="tuutor-nav-label">Previous Training</span>
                        <span class="tuutor-nav-title"><?php echo esc_html(get_the_title($prev_post)); ?></span>
                    </a>
                <?php else: ?>
                    <div class="tuutor-nav-empty"></div>
                <?php endif; ?>

                <?php if ($next_post): ?>
                    <a href="<?php echo get_permalink($next_post); ?>" class="tuutor-nav-link tuutor-nav-next">
                        <span class="tuutor-nav-label">Next Training</span>
                        <span class="tuutor-nav-title"><?php echo esc_html(get_the_title($next_post)); ?></span>
                    </a>
                <?php else: ?>
                    <div class="tuutor-nav-empty"></div>
                <?php endif; ?>
            </div>
        </nav>
        <?php
    }

    /**
     * Render Featured Video Shortcode
     */
    public function render_featured_video_shortcode($atts)
    {
        $atts = shortcode_atts(array(
            'id' => '',
        ), $atts, 'tuutor_featured_video');

        $post_id = !empty($atts['id']) ? intval($atts['id']) : get_the_ID();
        
        if (!$post_id) {
            return '';
        }

        $video_url = get_post_meta($post_id, '_tuutor_featured_video', true);
        if (empty($video_url)) {
            return '';
        }

        preg_match('%(?:youtube(?:-nocookie)?\.com/(?:[^/]+/.+/|(?:v|e(?:mbed)?)/|.*[?&]v=)|youtu\.be/)([^"&?/\s]{11})%i', $video_url, $match);
        $youtube_id = isset($match[1]) ? $match[1] : '';

        if ($youtube_id) {
            return '<div class="tuutor-youtube-embed"><iframe width="100%" height="400" src="https://www.youtube.com/embed/' . esc_attr($youtube_id) . '" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>';
        }

        return '';
    }
}
