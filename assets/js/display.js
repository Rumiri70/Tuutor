document.addEventListener('DOMContentLoaded', function () {
	// Single Course: Accordion logic
	const triggers = document.querySelectorAll('.tuutor-accordion-trigger');
	triggers.forEach(trigger => {
		trigger.addEventListener('click', function () {
			const isExpanded = this.getAttribute('aria-expanded') === 'true';
			const content = this.nextElementSibling;
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

			this.setAttribute('aria-expanded', !isExpanded);
			if (!isExpanded) {
				content.style.maxHeight = content.scrollHeight + 'px';
				setTimeout(() => { if (this.getAttribute('aria-expanded') === 'true') content.style.maxHeight = 'none'; }, 400);
			} else {
				content.style.maxHeight = content.scrollHeight + 'px';
				content.offsetHeight; // force reflow
				content.style.maxHeight = null;
			}
		});
	});

	// --- Archive Logic ---
	const archiveResults = document.getElementById('tuutor-archive-results');
	if (archiveResults) {
		const searchInput = document.getElementById('tuutor-search-input');
		const catRadios = document.querySelectorAll('input[name="tuutor-cat"]');
		const paginationContainer = document.getElementById('tuutor-pagination');
		const filterToggle = document.getElementById('tuutor-filter-toggle');
		const closeSidebar = document.getElementById('tuutor-close-sidebar');
		const sidebar = document.getElementById('tuutor-sidebar');

		let currentPage = 1;

		const fetchTrainings = () => {
			archiveResults.style.opacity = '0.5';

			const category = document.querySelector('input[name="tuutor-cat"]:checked').value;
			const search = searchInput.value;
			const perPage = archiveResults.dataset.perPage;

			jQuery.ajax({
				url: tuutorData.ajaxUrl,
				type: 'POST',
				data: {
					action: 'tuutor_fetch_archive',
					nonce: tuutorData.nonce,
					category: category,
					search: search,
					page: currentPage,
					per_page: perPage
				},
				success: function (response) {
					if (response.success) {
						archiveResults.innerHTML = response.data.html;
						renderPagination(response.data.max_pages);
						archiveResults.style.opacity = '1';

						// Only scroll if we are on mobile and results were tucked under sidebar
						if (window.innerWidth <= 900 && sidebar.classList.contains('active')) {
							sidebar.classList.remove('active');
						}

						window.scrollTo({ top: archiveResults.offsetTop - 100, behavior: 'smooth' });
					}
				}
			});
		};

		const renderPagination = (maxPages) => {
			paginationContainer.innerHTML = '';
			if (maxPages <= 1) return;

			// Previous Button
			const prevBtn = document.createElement('button');
			prevBtn.innerText = '← Previous';
			prevBtn.className = 'tuutor-page-link tuutor-page-prev';
			if (currentPage === 1) prevBtn.disabled = true;
			prevBtn.addEventListener('click', () => {
				if (currentPage > 1) {
					currentPage--;
					fetchTrainings();
				}
			});
			paginationContainer.appendChild(prevBtn);

			// Current Page indicator
			const currentBtn = document.createElement('button');
			currentBtn.innerText = currentPage;
			currentBtn.className = 'tuutor-page-link active';
			paginationContainer.appendChild(currentBtn);

			// Next Button
			const nextBtn = document.createElement('button');
			nextBtn.innerText = 'Next →';
			nextBtn.className = 'tuutor-page-link tuutor-page-next';
			if (currentPage === maxPages) nextBtn.disabled = true;
			nextBtn.addEventListener('click', () => {
				if (currentPage < maxPages) {
					currentPage++;
					fetchTrainings();
				}
			});
			paginationContainer.appendChild(nextBtn);
		};

		// Event Listeners
		let searchTimeout;
		searchInput.addEventListener('input', () => {
			clearTimeout(searchTimeout);
			searchTimeout = setTimeout(() => {
				currentPage = 1;
				fetchTrainings();
			}, 500);
		});

		catRadios.forEach(radio => {
			radio.addEventListener('change', () => {
				currentPage = 1;
				fetchTrainings();
			});
		});

		if (filterToggle) {
			filterToggle.addEventListener('click', () => {
				sidebar.classList.toggle('active');
			});
		}

		if (closeSidebar) {
			closeSidebar.addEventListener('click', () => {
				sidebar.classList.remove('active');
			});
		}

		// Initial load
		fetchTrainings();
	}
});
