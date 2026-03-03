(function ($) {
    'use strict';

    const App = {
        state: {
            view: 'list', // 'list' | 'editor' | 'create'
            trainings: [],
            categories: [],
            currentTraining: null,
            loading: true
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
                self.removeBlock($(this).closest('.tuutor-block-item').index());
            });

            this.$root.on('click', '.tuutor-media-upload', function (e) {
                e.preventDefault();
                const $btn = $(this);
                const blockIdx = $btn.closest('.tuutor-block-item').index();
                self.openMediaLib(blockIdx);
            });

            this.$root.on('click', '.tuutor-add-accordion-item', function (e) {
                e.preventDefault();
                const blockIdx = $(this).closest('.tuutor-block-item').index();
                self.addAccordionItem(blockIdx);
            });

            this.$root.on('submit', '#tuutor-training-form', function (e) {
                e.preventDefault();
                self.saveTraining();
            });
        },

        fetchInitialData: function () {
            const self = this;
            this.renderLoading();

            Promise.all([
                this.apiGet('trainings'),
                this.apiGet('categories')
            ]).then(([trainings, categories]) => {
                self.state.trainings = trainings;
                self.state.categories = categories;
                self.state.loading = false;
                self.render();
            }).catch(err => {
                console.error('API Error:', err);
                self.renderError();
            });
        },

        handleAction: function (action, id) {
            switch (action) {
                case 'create':
                    this.state.view = 'create';
                    this.state.currentTraining = { title: '', content: '', categories: [], blocks: [] };
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
                    <h2>Available Trainings</h2>
                    <button class="tuutor-btn tuutor-btn-primary tuutor-btn-action" data-action="create">Add New Training</button>
                </div>
                <table class="tuutor-trainings-list">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Title</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            if (this.state.trainings.length === 0) {
                html += '<tr><td colspan="4">No trainings found.</td></tr>';
            } else {
                this.state.trainings.forEach(t => {
                    html += `
                        <tr>
                            <td>${t.id}</td>
                            <td><strong>${t.title}</strong></td>
                            <td>${t.status}</td>
                            <td class="tuutor-actions">
                                <a href="#" class="tuutor-btn-action" data-action="edit" data-id="${t.id}">Edit</a> | 
                                <a href="${t.permalink}" target="_blank">View</a> | 
                                <a href="#" class="tuutor-btn-action tuutor-btn-danger" data-action="delete" data-id="${t.id}">Delete</a>
                            </td>
                        </tr>
                    `;
                });
            }

            html += '</tbody></table>';
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
                            <label>Categories</label>
                            <div class="tuutor-categories-checklist">
                                ${this.state.categories.map(c => `
                                    <label style="display:inline-block; margin-right: 15px;">
                                        <input type="checkbox" name="categories[]" value="${c.term_id}" ${t.categories.includes(c.term_id) ? 'checked' : ''}>
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
            const block = { type: type };
            if (type === 'accordion') block.items = [{ title: '', content: '' }];
            if (type === 'image') { block.url = ''; block.width = '100%'; block.alt = ''; }
            if (type === 'text') block.content = '';

            this.state.currentTraining.blocks.push(block);
            this.render();
        },

        removeBlock: function (idx) {
            this.state.currentTraining.blocks.splice(idx, 1);
            this.render();
        },

        addAccordionItem: function (blockIdx) {
            if (!this.state.currentTraining.blocks[blockIdx].items) {
                this.state.currentTraining.blocks[blockIdx].items = [];
            }
            this.state.currentTraining.blocks[blockIdx].items.push({ title: '', content: '' });
            this.render();
        },

        openMediaLib: function (blockIdx) {
            const self = this;
            const frame = wp.media({
                title: 'Select or Upload Image',
                button: { text: 'Use this image' },
                multiple: false
            });

            frame.on('select', function () {
                const attachment = frame.state().get('selection').first().toJSON();
                self.state.currentTraining.blocks[blockIdx].url = attachment.url;
                self.render();
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
                categories: $form.find('input[name="categories[]"]:checked').map(function () { return $(this).val(); }).get(),
                blocks: []
            };

            // Scrap blocks from DOM to get current values
            $('.tuutor-block-item').each(function (idx) {
                const type = $(this).hasClass('tuutor-block-type-text') ? 'text' : ($(this).hasClass('tuutor-block-type-image') ? 'image' : 'accordion');
                const block = { type: type };

                if (type === 'text') {
                    block.content = $(this).find('.tuutor-block-input').val();
                } else if (type === 'image') {
                    block.url = $(this).find('.tuutor-block-input[data-field="url"]').val();
                    block.width = $(this).find('.tuutor-block-input[data-field="width"]').val();
                    block.alt = $(this).find('.tuutor-block-input[data-field="alt"]').val();
                } else if (type === 'accordion') {
                    block.items = [];
                    $(this).find('.tuutor-accordion-editor-item').each(function () {
                        block.items.push({
                            title: $(this).find('.tuutor-acc-input[data-field="title"]').val(),
                            content: $(this).find('.tuutor-acc-input[data-field="content"]').val()
                        });
                    });
                }
                data.blocks.push(block);
            });

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

        // API Helpers
        apiGet: function (endpoint) {
            return $.ajax({
                url: tuutorSettings.apiUrl + '/' + endpoint,
                method: 'GET',
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
