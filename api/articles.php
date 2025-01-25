<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('error_log', __DIR__ . '/debug.log');

error_log("Requête reçue sur /api/articles.php");
error_log("Méthode: " . $_SERVER['REQUEST_METHOD']);

// Configuration du logging
ini_set('log_errors', 1);
ini_set('error_log', '../php-error.log');

// Headers CORS pour permettre l'accès depuis n'importe quelle origine
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Access-Control-Max-Age: 3600');

// Content-Type header
header('Content-Type: application/json; charset=UTF-8');

// Gérer les requêtes OPTIONS (pre-flight)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../config/database.php';
require_once '../models/Article.php';

try {
    $article = new Article($pdo);
    $method = $_SERVER['REQUEST_METHOD'];

    switch($method) {
        case 'GET':
            if (isset($_GET['id'])) {
                $result = $article->getById($_GET['id']);
                if ($result) {
                    echo json_encode($result);
                } else {
                    http_response_code(404);
                    echo json_encode(['error' => 'Article non trouvé']);
                }
            } else {
                $articles = $article->getAll();
                echo json_encode($articles);
            }
            break;
        
        case 'POST':
            $data = json_decode(file_get_contents('php://input'), true);
            if (!$data || !isset($data['nom']) || !isset($data['prix']) || !isset($data['categorie'])) {
                http_response_code(400);
                echo json_encode(['error' => 'Données invalides']);
                break;
            }
            
            $id = $article->create($data);
            http_response_code(201);
            echo json_encode(['message' => 'Article créé', 'id' => $id]);
            break;
        
        case 'PUT':
            if (!isset($_GET['id'])) {
                http_response_code(400);
                echo json_encode(['error' => 'ID manquant']);
                break;
            }
            
            $data = json_decode(file_get_contents('php://input'), true);
            if ($article->update($_GET['id'], $data)) {
                echo json_encode(['message' => 'Article mis à jour']);
            } else {
                http_response_code(404);
                echo json_encode(['error' => 'Article non trouvé']);
            }
            break;
        
        case 'DELETE':
            if (!isset($_GET['id'])) {
                http_response_code(400);
                echo json_encode(['error' => 'ID manquant']);
                break;
            }
            
            if ($article->delete($_GET['id'])) {
                echo json_encode(['message' => 'Article supprimé']);
            } else {
                http_response_code(404);
                echo json_encode(['error' => 'Article non trouvé']);
            }
            break;
    }
} catch (Exception $e) {
    error_log("Erreur: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
} 