<?php
/**
 * Blocks Class for Tuutor Custom Manager
 */

if (!defined('ABSPATH')) {
    exit;
}

class Tuutor_Blocks
{

    public function __construct()
    {
        // Placeholder for block-specific logic if needed
    }

    /**
     * Get the supported block types
     */
    public static function get_supported_blocks()
    {
        return array(
            'text' => __('Text Editor', 'tuutor'),
            'image' => __('Resizable Image', 'tuutor'),
            'accordion' => __('Accordion Group', 'tuutor'),
            'grid' => __('Grid (2 Columns)', 'tuutor'),
        );
    }
}
