document.addEventListener('DOMContentLoaded', function() {
	// Accordion logic
	const triggers = document.querySelectorAll('.tuutor-accordion-trigger');
	
	triggers.forEach(trigger => {
		trigger.addEventListener('click', function() {
			const isExpanded = this.getAttribute('aria-expanded') === 'true';
			const content = this.nextElementSibling;
			
			// Close all other accordions in the same group (optional, let's keep it simple)
			const parentGroup = this.closest('.tuutor-accordion-group');
			const siblingItems = parentGroup.querySelectorAll('.tuutor-accordion-item');
			
			siblingItems.forEach(item => {
				const itTrigger = item.querySelector('.tuutor-accordion-trigger');
				const itContent = item.querySelector('.tuutor-accordion-content');
				
				if (itTrigger !== trigger) {
					itTrigger.setAttribute('aria-expanded', 'false');
					itContent.style.maxHeight = null;
				}
			});

			// Toggle the current accordion
			this.setAttribute('aria-expanded', !isExpanded);
			
			if (!isExpanded) {
				content.style.maxHeight = content.scrollHeight + 'px';
				// Smoothly ensure it's visible if it's large
				setTimeout(() => {
					content.style.maxHeight = 'none'; // Allow content to overflow if needed after animation
				}, 400);
			} else {
				// We need to set max-height to a pixel value before setting it to null for the transition to work
				content.style.maxHeight = content.scrollHeight + 'px';
				// Trigger reflow
				content.offsetHeight;
				content.style.maxHeight = null;
			}
		});
	});

	// Handle resizable images (if not handled by CSS alone)
	const resizableImages = document.querySelectorAll('.tuutor-block-image img');
	resizableImages.forEach(img => {
		img.addEventListener('load', function() {
			this.style.opacity = '1';
		});
	});
});
