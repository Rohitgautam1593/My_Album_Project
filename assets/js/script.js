class MyAlbum {
    constructor() {
        this.currentUser = null;
        this.currentAlbum = null;
        this.init();
    }

    init() {
        this.bindEvents();
        this.checkSession();
    }

    bindEvents() {
        // Album Form
        document.getElementById('createAlbumForm').addEventListener('submit', (e) => this.handleCreateAlbum(e));

        // Drop Area
        const dropArea = document.getElementById('drop-area');
        if (dropArea) {
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                dropArea.addEventListener(eventName, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                }, false);
            });

            dropArea.addEventListener('dragenter', () => dropArea.classList.add('highlight'));
            dropArea.addEventListener('dragover', () => dropArea.classList.add('highlight'));
            dropArea.addEventListener('dragleave', () => dropArea.classList.remove('highlight'));
            dropArea.addEventListener('drop', (e) => {
                dropArea.classList.remove('highlight');
                this.handleFileUpload(e.dataTransfer.files);
            });
            dropArea.addEventListener('click', () => document.getElementById('fileElem').click());
            document.getElementById('fileElem').addEventListener('change', (e) => this.handleFileUpload(e.target.files));
        }
    }

    async checkSession() {
        try {
            const res = await fetch('api/api.php?action=check_session');
            const data = await res.json();
            if (data.status === 'success') {
                this.currentUser = data.user;
                document.getElementById('user-display-name').textContent = this.currentUser.name;
                this.loadAlbums();
            } else {
                window.location.href = 'login.html';
            }
        } catch (err) {
            window.location.href = 'login.html';
        }
    }

    async loadAlbums() {
        this.currentAlbum = null;
        document.getElementById('add-album-btn').style.display = 'block';
        document.getElementById('upload-media-btn').style.display = 'none';
        document.getElementById('breadcrumb').innerHTML = '<span>Albums</span>';
        
        const grid = document.getElementById('album-grid');
        grid.innerHTML = '<p>Loading albums...</p>';

        try {
            const res = await fetch('api/api.php?action=list_albums');
            const data = await res.json();
            
            grid.innerHTML = '';
            if (data.albums && data.albums.length > 0) {
                data.albums.forEach(album => {
                    const card = document.createElement('div');
                    card.className = 'album-card';
                    let thumbnailHtml = '<span class="folder-icon">📁</span>';
                    if (album.thumbnail) {
                        thumbnailHtml = `<img src="${album.thumbnail}" class="album-thumbnail" alt="Cover">`;
                    }
                    card.innerHTML = `
                        ${thumbnailHtml}
                        <div class="album-info">
                            <h3>${album.title}</h3>
                            <p>${album.description || ''}</p>
                        </div>
                        <button class="btn-delete" onclick="myAlbum.deleteAlbum(event, ${album.id})" title="Delete Album">🗑️</button>
                    `;
                    card.onclick = () => this.loadMedia(album);
                    grid.appendChild(card);
                });
            } else {
                grid.innerHTML = '<p>No albums yet. Create one!</p>';
            }
        } catch (err) {
            grid.innerHTML = '<p>Error loading albums</p>';
        }
    }

    async loadMedia(album) {
        this.currentAlbum = album;
        document.getElementById('add-album-btn').style.display = 'none';
        document.getElementById('upload-media-btn').style.display = 'block';
        document.getElementById('breadcrumb').innerHTML = `
            <a href="#" onclick="myAlbum.loadAlbums()">Albums</a> &nbsp;/&nbsp; <span>${album.title}</span>
        `;

        const grid = document.getElementById('album-grid');
        grid.innerHTML = '<p>Loading media...</p>';

        try {
            const res = await fetch(`api/api.php?action=list_media&album_id=${album.id}`);
            const data = await res.json();
            
            grid.innerHTML = '';
            if (data.media && data.media.length > 0) {
                data.media.forEach(item => {
                    const card = document.createElement('div');
                    card.className = 'media-card';
                    if (item.file_type === 'image') {
                        card.innerHTML = `<img src="${item.file_path}" class="media-preview">
                                          <button class="btn-delete-media" onclick="myAlbum.deleteMedia(event, ${item.id})" title="Delete">✖</button>`;
                        card.onclick = () => showLightbox(item.file_path, 'image');
                    } else {
                        card.innerHTML = `<span class="folder-icon">🎬</span><p>Video</p>
                                          <button class="btn-delete-media" onclick="myAlbum.deleteMedia(event, ${item.id})" title="Delete">✖</button>`;
                        card.onclick = () => showLightbox(item.file_path, 'video');
                    }
                    grid.appendChild(card);
                });
            } else {
                grid.innerHTML = '<p>No media in this album. Upload some!</p>';
            }
        } catch (err) {
            grid.innerHTML = '<p>Error loading media</p>';
        }
    }

    showDashboardError(message) {
        showToast(message, 'error');
    }

    async deleteAlbum(e, id) {
        e.stopPropagation();
        const confirmed = await window.confirmAction('Are you sure you want to delete this album?');
        if (!confirmed) return;
        
        const body = new FormData();
        body.append('album_id', id);
        try {
            const res = await fetch('api/api.php?action=delete_album', { method: 'POST', body: body });
            const data = await res.json();
            if (data.status === 'success') {
                this.loadAlbums();
            } else {
                this.showDashboardError(data.message);
            }
        } catch (err) {
            this.showDashboardError('Error deleting album.');
        }
    }

    async deleteMedia(e, id) {
        e.stopPropagation();
        const confirmed = await window.confirmAction('Are you sure you want to delete this media?');
        if (!confirmed) return;
        
        const body = new FormData();
        body.append('media_id', id);
        try {
            const res = await fetch('api/api.php?action=delete_media', { method: 'POST', body: body });
            const data = await res.json();
            if (data.status === 'success') {
                this.loadMedia(this.currentAlbum);
            } else {
                this.showDashboardError(data.message);
            }
        } catch (err) {
            this.showDashboardError('Error deleting media.');
        }
    }

    async handleCreateAlbum(e) {
        e.preventDefault();
        const title = document.getElementById('album-title').value;
        const desc = document.getElementById('album-desc').value;

        const body = new FormData();
        body.append('title', title);
        body.append('description', desc);

        try {
            const res = await fetch('api/api.php?action=create_album', {
                method: 'POST',
                body: body
            });
            const data = await res.json();
            if (data.status === 'success') {
                closeModal('albumModal');
                this.loadAlbums();
                showToast('Album created successfully', 'success');
            } else {
                showToast(data.message, 'error');
            }
        } catch (err) {
            showToast('Error creating album', 'error');
        }
    }

    async handleFileUpload(files) {
        if (!this.currentAlbum) return;

        for (let file of files) {
            if (file.size > 10 * 1024 * 1024) {
                this.showDashboardError(`File ${file.name} is too large (max 10MB)`);
                continue;
            }
            if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
                this.showDashboardError(`File ${file.name} is not a valid image or video`);
                continue;
            }

            const formData = new FormData();
            formData.append('media', file);
            formData.append('album_id', this.currentAlbum.id);

            try {
                const res = await fetch('api/api.php?action=upload_media', {
                    method: 'POST',
                    body: formData
                });
                const data = await res.json();
                if (data.status === 'success') {
                    this.loadMedia(this.currentAlbum);
                    showToast('Media uploaded successfully', 'success');
                } else {
                    showToast(data.message, 'error');
                }
            } catch (err) {
                showToast('Error uploading file', 'error');
            }
        }
        closeModal('uploadModal');
    }

    async logout() {
        await fetch('api/api.php?action=logout');
        this.currentUser = null;
        window.location.href = 'login.html';
    }
}

// Global UI functions
function showModal(id) {
    document.getElementById(id).style.display = 'flex';
}

function closeModal(id) {
    document.getElementById(id).style.display = 'none';
}

function showLightbox(path, type) {
    const lb = document.getElementById('lightbox');
    const img = document.getElementById('lightbox-img');
    const video = document.getElementById('lightbox-video');

    lb.style.display = 'flex';
    if (type === 'image') {
        img.src = path;
        img.style.display = 'block';
        video.style.display = 'none';
    } else {
        video.src = path;
        video.style.display = 'block';
        img.style.display = 'none';
    }
}

function closeLightbox() {
    document.getElementById('lightbox').style.display = 'none';
    document.getElementById('lightbox-video').pause();
}

window.showToast = function(message, type = 'error') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${message}</span>`;
    
    container.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 10);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
};

window.confirmAction = function(message) {
    return new Promise((resolve) => {
        const modal = document.getElementById('confirmModal');
        const msgEl = document.getElementById('confirm-message');
        const btnYes = document.getElementById('btn-confirm-yes');
        const btnNo = document.getElementById('btn-confirm-no');

        msgEl.textContent = message;
        modal.style.display = 'flex';

        const cleanup = () => {
            modal.style.display = 'none';
            btnYes.removeEventListener('click', onYes);
            btnNo.removeEventListener('click', onNo);
        };

        const onYes = () => { cleanup(); resolve(true); };
        const onNo = () => { cleanup(); resolve(false); };

        btnYes.addEventListener('click', onYes);
        btnNo.addEventListener('click', onNo);
    });
};

const myAlbum = new MyAlbum();
