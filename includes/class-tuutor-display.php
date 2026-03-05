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
                        echo $content;
                    }
                } else {
                    echo $content;
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
                        echo wp_kses_post($block['content']);
                        break;
                    case 'image':
                        $width = !empty($block['width']) ? $block['width'] : '100%';
                        $align = !empty($block['align']) ? 'align' . $block['align'] : 'aligncenter';
                        echo '<img src="' . esc_url($block['url']) . '" style="width:' . esc_attr($width) . ';" class="' . esc_attr($align) . '" alt="' . esc_attr($block['alt']) . '">';
                        break;
                    case 'accordion':
                        $this->render_accordion($block['items']);
                        break;
                    case 'grid':
                        echo '<div class="tuutor-grid-row">';
                        foreach ($block['columns'] as $col) {
                            echo '<div class="tuutor-grid-col">';
                            if ($col['type'] === 'text') {
                                echo wp_kses_post($col['content']);
                            } else if ($col['type'] === 'image') {
                                echo '<img src="' . esc_url($col['url']) . '" alt="' . esc_attr($col['alt'] ?? '') . '">';
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
        if (!is_singular('courses')) {
            return;
        }

        wp_enqueue_style('tuutor-fonts', 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        wp_enqueue_style('tuutor-display-css', TUUTOR_CUSTOM_URL . 'assets/css/display.css', array(), '1.0.0');
        wp_enqueue_script('tuutor-display-js', TUUTOR_CUSTOM_URL . 'assets/js/display.js', array('jquery'), '1.0.0', true);
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
}
