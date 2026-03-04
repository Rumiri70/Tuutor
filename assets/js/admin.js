(function ($) {
    'use strict';

    const App = {
        state: {
            view: 'list', // 'list' | 'editor' | 'create'
            trainings: [],
            categories: [],
            currentTraining: null,
            loading: true,
            currentPage: 1,
            totalPages: 1,
            perPage: 10
        },

        init: function () {
            this.cacheElements();
            this.bindEvents();
            this.fetchInitialData();
        },

        cacheElements: function () {
            this.$root = $('#tuutor-app-root');
        },

        bindEvents: function () {
            const self = this;

            // Global click handler (delegation)
            this.$root.on('click', '.tuutor-btn-action', function (e) {
                e.preventDefault();
                const action = $(this).data('action');
                const id = $(this).data('id');
                self.handleAction(action, id);
            });

            // Block builder actions
            this.$root.on('click', '.tuutor-add-block', function (e) {
                e.preventDefault();
                self.addBlock($(this).data('type'));
            });

            this.$root.on('click', '.tuutor-remove-block', function (e) {
                e.preventDefault();
                self.syncState();
                self.removeBlock($(this).closest('.tuutor-block-item').index());
            });

            this.$root.on('click', '.tuutor-media-upload', function (e) {
                e.preventDefault();
                const $btn = $(this);
                const blockIdx = $btn.closest('.tuutor-block-item').index();

                // Check if it's inside a grid column
                const $col = $btn.closest('.tuutor-grid-col-editor');
                self.syncState();
                if ($col.length) {
                    const colIdx = $col.index();
                    self.openMediaLib(blockIdx, colIdx);
                } else {
                    self.openMediaLib(blockIdx);
                }
            });

            this.$root.on('click', '.tuutor-add-accordion-item', function (e) {
                e.preventDefault();
                const $btn = $(this);
                const blockIdx = $btn.closest('.tuutor-block-item').index();
                const $col = $btn.closest('.tuutor-grid-col-editor');
                self.syncState();

                if ($col.length) {
                    const colIdx = $col.index();
                    self.addAccordionItem(blockIdx, colIdx);
                } else {
                    self.addAccordionItem(blockIdx);
                }
            });

            this.$root.on('click', '.tuutor-remove-accordion-item', function (e) {
                e.preventDefault();
                // We'll let syncState handle the removal indirectly or just re-render
                $(this).closest('.tuutor-accordion-editor-item').remove();
                self.syncState();
                self.render();
            });

            this.$root.on('click', '.tuutor-media-upload-featured', function (e) {
                e.preventDefault();
                self.syncState();
                self.openMediaLib('featured');
            });

            this.$root.on('click', '.tuutor-remove-featured', function (e) {
                e.preventDefault();
                self.state.currentTraining.featured_image = { id: 0, url: '' };
                self.render();
            });

            this.$root.on('click', '.tuutor-page-link', function (e) {
                e.preventDefault();
                const page = $(this).data('page');
                self.fetchInitialData(page);
            });

            this.$root.on('change', '.tuutor-grid-type-select', function () {
                // We don't necessarily need to re-render for every change if we scrape the DOM on save,
                // but for grid type, we need to show/hide inputs.
                const $block = $(this).closest('.tuutor-block-item');
                const $col = $(this).closest('.tuutor-grid-col-editor');
                const type = $(this).val();

                if (type === 'text') {
                    $col.find('.tuutor-grid-col-text-area').show();
                    $col.find('.tuutor-grid-col-image-area').hide();
                    $col.find('.tuutor-grid-col-accordion-area').hide();
                } else if (type === 'image') {
                    $col.find('.tuutor-grid-col-text-area').hide();
                    $col.find('.tuutor-grid-col-image-area').show();
                    $col.find('.tuutor-grid-col-accordion-area').hide();
                } else {
                    $col.find('.tuutor-grid-col-text-area').hide();
                    $col.find('.tuutor-grid-col-image-area').hide();
                    $col.find('.tuutor-grid-col-accordion-area').show();
                }
            });

            this.$root.on('submit', '#tuutor-training-form', function (e) {
                e.preventDefault();
                self.saveTraining();
            });
        },

        fetchInitialData: function (page = 1) {
            const self = this;
            this.state.currentPage = page;
            this.renderLoading();

            const trainingsPromise = this.apiGet('trainings', { page: page, per_page: this.state.perPage });

            // Use jQuery Deferred for consistency with $.when
            let categoriesPromise;
            if (this.state.categories && this.state.categories.length) {
                categoriesPromise = $.Deferred().resolve([this.state.categories]).promise();
            } else {
                categoriesPromise = this.apiGet('categories');
            }

            $.when(trainingsPromise, categoriesPromise).done((trainingsResult, categoriesResult) => {
                // If AJAX, result is [data, status, xhr]. If our manual deferred, it's [data].
                const trainingsData = trainingsResult[0] || trainingsResult;
                const categoriesData = categoriesResult[0] || categoriesResult;

                if (trainingsData.items) {
                    self.state.trainings = trainingsData.items;
                    self.state.totalPages = parseInt(trainingsData.totalPages) || 1;
                } else {
                    // Fallback if structure is old
                    self.state.trainings = trainingsData;
                    self.state.totalPages = 1;
                }

                self.state.categories = categoriesData;
                self.state.loading = false;
                self.render();
            }).fail(err => {
                console.error('API Error:', err);
                self.renderError();
            });
        },

        handleAction: function (action, id) {
            switch (action) {
                case 'create':
                    this.state.view = 'create';
                    this.state.currentTraining = { title: '', content: '', categories: [], blocks: [], featured_image: { id: 0, url: '' } };
                    this.render();
                    break;
                case 'edit':
                    this.editTraining(id);
                    break;
                case 'delete':
                    if (confirm('Are you sure you want to delete this training?')) {
                        this.deleteTraining(id);
                    }
                    break;
                case 'list':
                    this.state.view = 'list';
                    this.render();
                    break;
            }
        },

        render: function () {
            if (this.state.loading) {
                this.renderLoading();
                return;
            }

            switch (this.state.view) {
                case 'list':
                    this.renderList();
                    break;
                case 'editor':
                case 'create':
                    this.renderEditor();
                    break;
            }
        },

        renderLoading: function () {
            this.$root.html('<div class="tuutor-loading"><span class="spinner is-active"></span> Loading...</div>');
        },

        renderList: function () {
            let html = `
                <div class="tuutor-admin-header">
                    <h2>Trainings Management</h2>
                    <button class="tuutor-btn tuutor-btn-primary tuutor-btn-action" data-action="create">+ Add Training</button>
                </div>
                <div class="tuutor-list-container">
                    <div class="tuutor-list-header">
                        <div class="tuutor-col-id">ID</div>
                        <div class="tuutor-col-title">Training Title</div>
                        <div class="tuutor-col-status">Status</div>
                        <div class="tuutor-col-actions">Actions</div>
                    </div>
                    <div class="tuutor-list-body">
            `;

            if (this.state.trainings.length === 0) {
                html += '<div class="tuutor-list-row-empty">No trainings found. Create your first one above!</div>';
            } else {
                this.state.trainings.forEach(t => {
                    const statusClass = t.status === 'publish' ? 'tuutor-status-published' : 'tuutor-status-draft';
                    html += `
                        <div class="tuutor-list-row">
                            <div class="tuutor-col-id">#${t.id}</div>
                            <div class="tuutor-col-title">
                                <strong>${t.title}</strong>
                                <div class="tuutor-row-meta">Tutor LMS Course</div>
                            </div>
                            <div class="tuutor-col-status">
                                <span class="tuutor-status-badge ${statusClass}">${t.status}</span>
                            </div>
                            <div class="tuutor-col-actions">
                                <a href="#" class="tuutor-btn-action tuutor-icon-btn" data-action="edit" data-id="${t.id}" title="Edit">✎</a>
                                <a href="${t.permalink}" target="_blank" class="tuutor-icon-btn" title="View">👁</a>
                                <a href="#" class="tuutor-btn-action tuutor-icon-btn tuutor-btn-danger" data-action="delete" data-id="${t.id}" title="Delete">🗑</a>
                            </div>
                        </div>
                    `;
                });
            }

            html += '</div></div>';

            // Pagination UI
            if (this.state.totalPages > 1) {
                html += '<div class="tuutor-pagination" style="margin-top: 20px; display: flex; gap: 5px;">';
                for (let i = 1; i <= this.state.totalPages; i++) {
                    const isCurrent = i === this.state.currentPage;
                    const activeStyle = isCurrent ? 'background: var(--tuutor-admin-primary); color: #fff;' : 'background: #fff;';
                    html += `<button class="tuutor-btn tuutor-page-link" data-page="${i}" style="${activeStyle}">${i}</button>`;
                }
                html += '</div>';
            }

            this.$root.html(html);
        },

        renderEditor: function () {
            const t = this.state.currentTraining;
            let html = `
                <div class="tuutor-admin-header">
                    <h2>${t.id ? 'Edit Training: ' + t.title : 'Create New Training'}</h2>
                    <button class="tuutor-btn tuutor-btn-action" data-action="list">Back to List</button>
                </div>
                <div class="tuutor-editor-container">
                    <form id="tuutor-training-form">
                        <div class="tuutor-form-group">
                            <label>Training Title</label>
                            <input type="text" name="title" value="${t.title}" required>
                        </div>
                        <div class="tuutor-form-group">
                            <label>Featured Image</label>
                            <div class="tuutor-featured-image-preview-container">
                                <img src="${t.featured_image ? t.featured_image.url : ''}" class="tuutor-featured-preview" style="${t.featured_image && t.featured_image.url ? '' : 'display:none;'} max-width: 200px; display: block; margin-bottom: 10px; border-radius: 8px;">
                                <input type="hidden" name="featured_image_id" value="${t.featured_image ? t.featured_image.id : 0}">
                                <button type="button" class="tuutor-btn tuutor-media-upload-featured">Select Featured Image</button>
                                <button type="button" class="tuutor-btn tuutor-btn-danger tuutor-remove-featured" style="${t.featured_image && t.featured_image.id ? '' : 'display:none'}">Remove</button>
                            </div>
                        </div>

                        <div class="tuutor-form-group">
                            <label>Categories</label>
                            <div class="tuutor-categories-checklist">
                                ${this.state.categories.map(c => `
                                    <label style="display:inline-block; margin-right: 15px;">
                                        <input type="checkbox" name="categories[]" value="${c.term_id}" ${t.categories.includes(parseInt(c.term_id)) ? 'checked' : ''}>
                                        ${c.name}
                                    </label>
                                `).join('')}
                            </div>
                        </div>

                        <div class="tuutor-blocks-builder" id="tuutor-blocks-container">
                            <h3>Content Blocks</h3>
                            <div class="tuutor-blocks-list">
                                ${this.renderBlocks(t.blocks)}
                            </div>
                            
                            <div class="tuutor-builder-footer">
                                <span>Add Block:</span>
                                <button type="button" class="tuutor-btn tuutor-add-block" data-type="text">+ Text</button>
                                <button type="button" class="tuutor-btn tuutor-add-block" data-type="image">+ Image</button>
                                <button type="button" class="tuutor-btn tuutor-add-block" data-type="grid">+ Grid (2 Col)</button>
                                <button type="button" class="tuutor-btn tuutor-add-block" data-type="accordion">+ Accordion</button>
                                <div class="tuutor-save-controls" style="margin-left: auto;">
                                    <button type="submit" class="tuutor-btn tuutor-btn-primary">Save Training</button>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
            `;
            this.$root.html(html);
        },

        renderBlocks: function (blocks) {
            if (!blocks || blocks.length === 0) return '<p>No content blocks added yet. Use the buttons below to add some.</p>';

            return blocks.map((b, idx) => {
                let blockHtml = `
                    <div class="tuutor-block-item tuutor-block-type-${b.type}">
                        <div class="tuutor-block-item-header">
                            <strong>${b.type.toUpperCase()} Block</strong>
                            <button type="button" class="tuutor-btn tuutor-btn-danger tuutor-remove-block">Remove</button>
                        </div>
                        <div class="tuutor-block-content-area">
                `;

                if (b.type === 'text') {
                    blockHtml += `<textarea class="tuutor-block-input" data-field="content" placeholder="Enter text here...">${b.content || ''}</textarea>`;
                } else if (b.type === 'image') {
                    blockHtml += `
                        <div class="tuutor-image-uploader">
                            <img src="${b.url || ''}" class="tuutor-image-preview" style="${b.url ? '' : 'display:none'}">
                            <input type="hidden" class="tuutor-block-input" data-field="url" value="${b.url || ''}">
                            <button type="button" class="tuutor-btn tuutor-media-upload">Choose Image</button>
                            <div style="margin-top:10px;">
                                <label>Width: <input type="text" class="tuutor-block-input" data-field="width" value="${b.width || '100%'}"> (e.g. 100%, 300px)</label>
                                <label style="margin-left:10px;">Alt: <input type="text" class="tuutor-block-input" data-field="alt" value="${b.alt || ''}"></label>
                            </div>
                        </div>
                    `;
                } else if (b.type === 'grid') {
                    blockHtml += `
                        <div class="tuutor-grid-editor">
                            <div class="tuutor-grid-columns" style="display:flex; gap:15px;">
                                ${(b.columns || [{ type: 'text' }, { type: 'image' }]).map((col, cIdx) => `
                                    <div class="tuutor-grid-col-editor" style="flex:1; border:1px solid #eee; padding:10px; border-radius:4px; background:#fff;">
                                        <div style="margin-bottom:10px;">
                                            <label>Column ${cIdx + 1} Type:</label>
                                            <select class="tuutor-grid-type-select">
                                                <option value="text" ${col.type === 'text' ? 'selected' : ''}>Text</option>
                                                <option value="image" ${col.type === 'image' ? 'selected' : ''}>Image</option>
                                                <option value="accordion" ${col.type === 'accordion' ? 'selected' : ''}>Accordion</option>
                                            </select>
                                        </div>
                                        
                                        <div class="tuutor-grid-col-text-area" style="${col.type === 'text' ? '' : 'display:none'}">
                                            <textarea class="tuutor-grid-input" data-field="content" placeholder="Text for column ${cIdx + 1}">${col.content || ''}</textarea>
                                        </div>
                                        
                                        <div class="tuutor-grid-col-image-area" style="${col.type === 'image' ? '' : 'display:none'}">
                                            <img src="${col.url || ''}" class="tuutor-image-preview" style="${col.url ? '' : 'display:none'}">
                                            <input type="hidden" class="tuutor-grid-input" data-field="url" value="${col.url || ''}">
                                            <button type="button" class="tuutor-btn tuutor-media-upload">Choose Image</button>
                                            <div style="margin-top:5px;">
                                                <input type="text" class="tuutor-grid-input" data-field="alt" placeholder="Alt text" value="${col.alt || ''}">
                                            </div>
                                        </div>

                                        <div class="tuutor-grid-col-accordion-area" style="${col.type === 'accordion' ? '' : 'display:none'}">
                                            <div class="tuutor-accordion-items-container">
                                                ${(col.items || []).map((item, iIdx) => `
                                                    <div class="tuutor-accordion-editor-item">
                                                        <input type="text" class="tuutor-grid-acc-input" data-field="title" value="${item.title || ''}" placeholder="Title" style="width:100%; margin-bottom:5px;">
                                                        <textarea class="tuutor-grid-acc-input" data-field="content" placeholder="Content" style="width:100%">${item.content || ''}</textarea>
                                                        <button type="button" class="tuutor-btn tuutor-btn-danger tuutor-remove-accordion-item" style="margin-top:5px; padding:2px 5px;">Remove</button>
                                                    </div>
                                                `).join('')}
                                            </div>
                                            <button type="button" class="tuutor-btn tuutor-add-accordion-item">+ Add Item</button>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `;
                } else if (b.type === 'accordion') {
                    blockHtml += `
                        <div class="tuutor-accordion-editor">
                            <div class="tuutor-accordion-items-container">
                                ${(b.items || []).map((item, iIdx) => `
                                    <div class="tuutor-accordion-editor-item">
                                        <input type="text" class="tuutor-acc-input" data-field="title" value="${item.title || ''}" placeholder="Accordion Title" style="width:100%; margin-bottom:5px;">
                                        <textarea class="tuutor-acc-input" data-field="content" placeholder="Accordion Content" style="width:100%">${item.content || ''}</textarea>
                                        <button type="button" class="tuutor-btn tuutor-btn-danger tuutor-remove-accordion-item" style="margin-top:5px; padding:2px 5px;">Remove Item</button>
                                    </div>
                                `).join('')}
                            </div>
                            <button type="button" class="tuutor-btn tuutor-add-accordion-item">+ Add Item</button>
                        </div>
                    `;
                }

                blockHtml += `</div></div>`;
                return blockHtml;
            }).join('');
        },

        // Action Logic
        addBlock: function (type) {
            this.syncState();
            const block = { type: type };
            if (type === 'accordion') block.items = [{ title: '', content: '' }];
            if (type === 'grid') block.columns = [{ type: 'text', content: '' }, { type: 'image', url: '', alt: '' }];
            if (type === 'image') { block.url = ''; block.width = '100%'; block.alt = ''; }
            if (type === 'text') block.content = '';

            this.state.currentTraining.blocks.push(block);
            this.render();
        },

        removeBlock: function (idx) {
            // Already synced in event handler
            this.state.currentTraining.blocks.splice(idx, 1);
            this.render();
        },

        addAccordionItem: function (blockIdx, colIdx = null) {
            let block = this.state.currentTraining.blocks[blockIdx];
            if (colIdx !== null) {
                if (!block.columns[colIdx].items) block.columns[colIdx].items = [];
                block.columns[colIdx].items.push({ title: '', content: '' });
            } else {
                if (!block.items) block.items = [];
                block.items.push({ title: '', content: '' });
            }
            this.render();
        },

        openMediaLib: function (blockIdx, colIdx = null) {
            const self = this;
            const frame = wp.media({
                title: 'Select or Upload Image',
                button: { text: 'Use this image' },
                multiple: false
            });

            frame.on('select', function () {
                const attachment = frame.state().get('selection').first().toJSON();

                if (blockIdx === 'featured') {
                    self.state.currentTraining.featured_image = {
                        id: attachment.id,
                        url: attachment.url
                    };
                    self.render();
                    return;
                }

                if (colIdx !== null) {
                    // Update grid column
                    const $block = $('.tuutor-block-item').eq(blockIdx);
                    const $col = $block.find('.tuutor-grid-col-editor').eq(colIdx);
                    $col.find('input[data-field="url"]').val(attachment.url);
                    $col.find('.tuutor-image-preview').attr('src', attachment.url).show();
                } else {
                    self.state.currentTraining.blocks[blockIdx].url = attachment.url;
                    self.render();
                }
            });

            frame.open();
        },

        editTraining: function (id) {
            const training = this.state.trainings.find(t => t.id == id);
            if (training) {
                this.state.currentTraining = JSON.parse(JSON.stringify(training)); // Deep clone
                this.state.view = 'editor';
                this.render();
            }
        },

        saveTraining: function () {
            // Collect data from DOM
            const $form = $('#tuutor-training-form');
            const data = {
                title: $form.find('input[name="title"]').val(),
                featured_image_id: $form.find('input[name="featured_image_id"]').val(),
                categories: $form.find('input[name="categories[]"]:checked').map(function () { return $(this).val(); }).get(),
                blocks: []
            };

            // Scrap blocks from DOM to get current values (Always sync before saving)
            this.syncState();
            data.blocks = this.state.currentTraining.blocks;

            this.state.loading = true;
            this.renderLoading();

            const isUpdate = this.state.currentTraining.id;
            const method = isUpdate ? 'PUT' : 'POST';
            const endpoint = isUpdate ? `trainings/${this.state.currentTraining.id}` : 'trainings';

            this.apiCall(endpoint, method, data).then(resp => {
                alert('Training saved successfully!');
                this.state.view = 'list';
                this.fetchInitialData();
            }).catch(err => {
                alert('Error saving training. Check console.');
                this.state.loading = false;
                this.render();
            });
        },

        deleteTraining: function (id) {
            this.apiCall(`trainings/${id}`, 'DELETE')
                .then(() => this.fetchInitialData())
                .catch(err => console.error(err));
        },

        syncState: function () {
            if (this.state.view === 'list') return;

            const $form = $('#tuutor-training-form');
            if (!$form.length) return;

            this.state.currentTraining.title = $form.find('input[name="title"]').val();
            this.state.currentTraining.categories = $form.find('input[name="categories[]"]:checked').map(function () { return parseInt($(this).val()); }).get();

            const newBlocks = [];
            $('.tuutor-block-item').each(function () {
                const $block = $(this);
                const type = $block.hasClass('tuutor-block-type-text') ? 'text' :
                    ($block.hasClass('tuutor-block-type-image') ? 'image' :
                        ($block.hasClass('tuutor-block-type-grid') ? 'grid' : 'accordion'));

                const block = { type: type };

                if (type === 'text') {
                    block.content = $block.find('.tuutor-block-input').val();
                } else if (type === 'image') {
                    block.url = $block.find('.tuutor-block-input[data-field="url"]').val();
                    block.width = $block.find('.tuutor-block-input[data-field="width"]').val();
                    block.alt = $block.find('.tuutor-block-input[data-field="alt"]').val();
                } else if (type === 'grid') {
                    block.columns = [];
                    $block.find('.tuutor-grid-col-editor').each(function () {
                        const colType = $(this).find('.tuutor-grid-type-select').val();
                        const col = { type: colType };
                        if (colType === 'text') {
                            col.content = $(this).find('.tuutor-grid-input[data-field="content"]').val();
                        } else if (colType === 'image') {
                            col.url = $(this).find('.tuutor-grid-input[data-field="url"]').val();
                            col.alt = $(this).find('.tuutor-grid-input[data-field="alt"]').val();
                        } else {
                            col.items = [];
                            $(this).find('.tuutor-accordion-editor-item').each(function () {
                                col.items.push({
                                    title: $(this).find('.tuutor-grid-acc-input[data-field="title"]').val(),
                                    content: $(this).find('.tuutor-grid-acc-input[data-field="content"]').val()
                                });
                            });
                        }
                        block.columns.push(col);
                    });
                } else if (type === 'accordion') {
                    block.items = [];
                    $block.find('.tuutor-accordion-editor-item').each(function () {
                        block.items.push({
                            title: $(this).find('.tuutor-acc-input[data-field="title"]').val(),
                            content: $(this).find('.tuutor-acc-input[data-field="content"]').val()
                        });
                    });
                }
                newBlocks.push(block);
            });
            this.state.currentTraining.blocks = newBlocks;
        },

        // API Helpers
        apiGet: function (endpoint, data = {}) {
            return $.ajax({
                url: tuutorSettings.apiUrl + '/' + endpoint,
                method: 'GET',
                data: data,
                beforeSend: function (xhr) {
                    xhr.setRequestHeader('X-WP-Nonce', tuutorSettings.nonce);
                }
            });
        },

        apiCall: function (endpoint, method, data = null) {
            return $.ajax({
                url: tuutorSettings.apiUrl + '/' + endpoint,
                method: method,
                data: data,
                beforeSend: function (xhr) {
                    xhr.setRequestHeader('X-WP-Nonce', tuutorSettings.nonce);
                }
            });
        }
    };

    $(document).ready(() => App.init());

})(jQuery);
