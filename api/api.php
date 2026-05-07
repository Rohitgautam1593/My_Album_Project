<?php
// api/api.php - RESTful API Handler
session_start();
header('Content-Type: application/json');

require_once __DIR__ . '/../config/db.php';

$action = $_GET['action'] ?? '';
$response = ['status' => 'error', 'message' => 'Invalid action'];

try {
    switch ($action) {
        case 'check_session':
            if (isset($_SESSION['user_id'])) {
                $response = [
                    'status' => 'success',
                    'user' => [
                        'id' => $_SESSION['user_id'],
                        'name' => $_SESSION['user_name'],
                        'email' => $_SESSION['user_email']
                    ]
                ];
            } else {
                $response = ['status' => 'error', 'message' => 'Not logged in'];
            }
            break;

        case 'register':
            if ($_SERVER['REQUEST_METHOD'] === 'POST') {
                $name = $_POST['name'] ?? '';
                $email = $_POST['email'] ?? '';
                $password = $_POST['password'] ?? '';

                if (empty($name) || empty($email) || empty($password)) {
                    throw new Exception('All fields are required');
                }

                if (strlen($password) < 6) {
                    throw new Exception('Password must be at least 6 characters');
                }

                // Check for duplicate email
                $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
                $stmt->execute([$email]);
                if ($stmt->fetch()) {
                    throw new Exception('Email already in use');
                }

                $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
                $stmt = $pdo->prepare("INSERT INTO users (name, email, password) VALUES (?, ?, ?)");
                $stmt->execute([$name, $email, $hashedPassword]);

                $response = ['status' => 'success', 'message' => 'User registered successfully'];
            }
            break;

        case 'login':
            if ($_SERVER['REQUEST_METHOD'] === 'POST') {
                $email = $_POST['email'] ?? '';
                $password = $_POST['password'] ?? '';

                $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
                $stmt->execute([$email]);
                $user = $stmt->fetch();

                if ($user && password_verify($password, $user['password'])) {
                    $_SESSION['user_id'] = $user['id'];
                    $_SESSION['user_name'] = $user['name'];
                    $_SESSION['user_email'] = $user['email'];
                    $response = [
                        'status' => 'success',
                        'message' => 'Login successful',
                        'user' => [
                            'id' => $user['id'],
                            'name' => $user['name']
                        ]
                    ];
                } else {
                    throw new Exception('Invalid email or password');
                }
            }
            break;

        case 'logout':
            session_destroy();
            $response = ['status' => 'success', 'message' => 'Logged out'];
            break;

        case 'create_album':
            if (!isset($_SESSION['user_id'])) throw new Exception('Unauthorized');
            $title = $_POST['title'] ?? '';
            $desc = $_POST['description'] ?? '';

            if (empty(trim($title))) throw new Exception('Title is required');

            $safeTitle = preg_replace('/[^a-zA-Z0-9_\- ]/', '', $title);
            if (empty(trim($safeTitle))) {
                throw new Exception('Album title must contain alphanumeric characters');
            }

            $stmt = $pdo->prepare("INSERT INTO albums (user_id, title, description) VALUES (?, ?, ?)");
            $stmt->execute([$_SESSION['user_id'], $title, $desc]);

            // Create physical folder
            $albumDir = __DIR__ . "/../uploads/" . $_SESSION['user_id'] . "/" . $safeTitle;
            if (!file_exists($albumDir)) {
                mkdir($albumDir, 0777, true);
            }

            $response = ['status' => 'success', 'message' => 'Album created'];
            break;

        case 'list_albums':
            if (!isset($_SESSION['user_id'])) throw new Exception('Unauthorized');
            $stmt = $pdo->prepare("
                SELECT a.*, 
                       (SELECT file_path FROM media m WHERE m.album_id = a.id AND m.file_type = 'image' ORDER BY m.created_at DESC LIMIT 1) as thumbnail 
                FROM albums a 
                WHERE a.user_id = ? 
                ORDER BY a.created_at DESC
            ");
            $stmt->execute([$_SESSION['user_id']]);
            $albums = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $response = ['status' => 'success', 'albums' => $albums];
            break;

        case 'list_media':
            $albumId = $_GET['album_id'] ?? 0;
            if (!$albumId) throw new Exception('Album ID required');
            
            $stmt = $pdo->prepare("SELECT * FROM media WHERE album_id = ? ORDER BY created_at DESC");
            $stmt->execute([$albumId]);
            $media = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $response = ['status' => 'success', 'media' => $media];
            break;

        case 'upload_media':
            if (!isset($_SESSION['user_id'])) throw new Exception('Unauthorized');
            $albumId = $_POST['album_id'] ?? 0;
            if (!$albumId) throw new Exception('Album ID required');

            // Get album title for folder path
            $stmt = $pdo->prepare("SELECT title FROM albums WHERE id = ? AND user_id = ?");
            $stmt->execute([$albumId, $_SESSION['user_id']]);
            $album = $stmt->fetch();
            if (!$album) throw new Exception('Album not found');

            if (!isset($_FILES['media'])) throw new Exception('No file uploaded');

            $file = $_FILES['media'];
            $finfo = new finfo(FILEINFO_MIME_TYPE);
            $mimeType = $finfo->file($file['tmp_name']);

            $allowedTypes = [
                'image/jpeg' => 'image',
                'image/png' => 'image',
                'image/gif' => 'image',
                'image/webp' => 'image',
                'video/mp4' => 'video'
            ];

            if (!isset($allowedTypes[$mimeType])) {
                throw new Exception('Invalid file type: ' . $mimeType);
            }

            if ($file['size'] > 10 * 1024 * 1024) {
                throw new Exception('File too large (max 10MB)');
            }

            $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
            $fileName = uniqid() . '.' . $extension;
            $userDir = "uploads/" . $_SESSION['user_id'] . "/" . preg_replace('/[^a-zA-Z0-9_\- ]/', '', $album['title']);
            $targetPath = __DIR__ . "/../" . $userDir . "/" . $fileName;

            if (!file_exists(__DIR__ . "/../" . $userDir)) {
                mkdir(__DIR__ . "/../" . $userDir, 0777, true);
            }

            if (move_uploaded_file($file['tmp_name'], $targetPath)) {
                $stmt = $pdo->prepare("INSERT INTO media (album_id, file_path, file_type) VALUES (?, ?, ?)");
                $stmt->execute([$albumId, $userDir . "/" . $fileName, $allowedTypes[$mimeType]]);
                $response = ['status' => 'success', 'message' => 'Media uploaded'];
            } else {
                throw new Exception('Failed to move uploaded file');
            }
            break;

        case 'delete_album':
            if (!isset($_SESSION['user_id'])) throw new Exception('Unauthorized');
            $albumId = $_POST['album_id'] ?? 0;
            if (!$albumId) throw new Exception('Album ID required');

            // Verify album belongs to user
            $stmt = $pdo->prepare("SELECT title FROM albums WHERE id = ? AND user_id = ?");
            $stmt->execute([$albumId, $_SESSION['user_id']]);
            $album = $stmt->fetch();
            if (!$album) throw new Exception('Album not found');

            // Check if album is empty
            $stmt = $pdo->prepare("SELECT COUNT(*) FROM media WHERE album_id = ?");
            $stmt->execute([$albumId]);
            $mediaCount = $stmt->fetchColumn();

            if ($mediaCount > 0) {
                throw new Exception('Album is not empty. Please delete all media inside it first.');
            }

            // Delete from DB
            $stmt = $pdo->prepare("DELETE FROM albums WHERE id = ?");
            $stmt->execute([$albumId]);

            // Attempt to remove folder
            $safeTitle = preg_replace('/[^a-zA-Z0-9_\- ]/', '', $album['title']);
            $albumDir = __DIR__ . "/../uploads/" . $_SESSION['user_id'] . "/" . $safeTitle;
            if (is_dir($albumDir)) {
                @rmdir($albumDir);
            }

            $response = ['status' => 'success', 'message' => 'Album deleted'];
            break;

        case 'delete_media':
            if (!isset($_SESSION['user_id'])) throw new Exception('Unauthorized');
            $mediaId = $_POST['media_id'] ?? 0;
            if (!$mediaId) throw new Exception('Media ID required');

            // Verify media belongs to user's album
            $stmt = $pdo->prepare("SELECT m.file_path FROM media m JOIN albums a ON m.album_id = a.id WHERE m.id = ? AND a.user_id = ?");
            $stmt->execute([$mediaId, $_SESSION['user_id']]);
            $media = $stmt->fetch();
            if (!$media) throw new Exception('Media not found');

            // Delete from DB
            $stmt = $pdo->prepare("DELETE FROM media WHERE id = ?");
            $stmt->execute([$mediaId]);

            // Delete file
            $filePath = __DIR__ . "/../" . $media['file_path'];
            if (file_exists($filePath)) {
                @unlink($filePath);
            }

            $response = ['status' => 'success', 'message' => 'Media deleted'];
            break;
    }
} catch (Exception $e) {
    $response = ['status' => 'error', 'message' => $e->getMessage()];
}

echo json_encode($response);
?>
