<?php
session_start();
if (!isset($_SESSION['user_id'])) {
    header('Location: login.html');
    exit();
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Album | Personal Highlights</title>
    <link rel="stylesheet" href="assets/css/style.css">
</head>
<body>
    <div class="bg-blobs">
        <div class="blob blob-1"></div>
        <div class="blob blob-2"></div>
    </div>

    <!-- Dashboard Section -->
    <div id="dashboard-container" class="dashboard-wrapper">
        <header class="dashboard-header">
            <div class="header-left">
                <h1>My Album</h1>
            </div>
            <div class="header-right">
                <span id="user-display-name">User Name</span>
                <button onclick="myAlbum.logout()" class="btn-logout">Logout</button>
            </div>
        </header>

        <main class="dashboard-content">
            <div class="content-header">
                <nav id="breadcrumb" class="breadcrumb">
                    <a href="#" onclick="myAlbum.loadAlbums()">Albums</a>
                </nav>
                <button id="add-album-btn" onclick="showModal('albumModal')" class="btn-add">+ New Album</button>
                <button id="upload-media-btn" onclick="showModal('uploadModal')" class="btn-add" style="display:none;">+ Upload Media</button>
            </div>
            
            <div id="dashboard-error" class="dashboard-error"></div>

            <div id="album-grid" class="grid-container">
                <!-- Albums or Images will be loaded here -->
            </div>
        </main>
    </div>

    <!-- Modals -->
    <div id="albumModal" class="modal">
        <div class="modal-content auth-card">
            <h2>Create New Album</h2>
            <form id="createAlbumForm">
                <div class="form-group">
                    <label>Album Title</label>
                    <input type="text" id="album-title" placeholder="Vacation 2024">
                </div>
                <div class="form-group">
                    <label>Description</label>
                    <textarea id="album-desc" placeholder="Memories from the trip..."></textarea>
                </div>
                <button type="submit" class="btn-primary">Create</button>
                <button type="button" onclick="closeModal('albumModal')" class="btn-secondary">Cancel</button>
            </form>
        </div>
    </div>

    <div id="uploadModal" class="modal">
        <div class="modal-content auth-card">
            <h2>Upload Media</h2>
            <div id="drop-area" class="drop-area">
                <p>Drag and drop images/videos here or click to select</p>
                <input type="file" id="fileElem" multiple accept="image/*,video/mp4" style="display:none">
            </div>
            <div id="file-list"></div>
            <button onclick="closeModal('uploadModal')" class="btn-secondary">Close</button>
        </div>
    </div>

    <div id="confirmModal" class="modal">
        <div class="modal-content auth-card" style="text-align: center;">
            <h2 id="confirm-message">Are you sure?</h2>
            <div style="display: flex; gap: 15px; margin-top: 25px;">
                <button id="btn-confirm-yes" class="btn-primary" style="margin-top: 0;">Yes, Delete</button>
                <button id="btn-confirm-no" class="btn-secondary" style="margin-top: 0;">Cancel</button>
            </div>
        </div>
    </div>

    <!-- Lightbox -->
    <div id="lightbox" class="lightbox" onclick="closeLightbox()">
        <span class="close-lightbox">&times;</span>
        <img id="lightbox-img" src="" alt="">
        <video id="lightbox-video" controls style="display:none;"></video>
    </div>

    <script src="assets/js/script.js"></script>
</body>
</html>
