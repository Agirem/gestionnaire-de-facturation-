<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Configuration du logging
ini_set('log_errors', 1);
ini_set('error_log', '../php-error.log');

error_log("Requête reçue sur /api/factures.php");
error_log("Méthode: " . $_SERVER['REQUEST_METHOD']);

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
require_once '../models/Facture.php';

try {
    error_log("Tentative de connexion à la base de données");
    $facture = new Facture($pdo);
    $method = $_SERVER['REQUEST_METHOD'];
    error_log("Connexion à la base de données réussie");

    switch($method) {
        case 'GET':
            error_log("Traitement d'une requête GET");
            if (isset($_GET['id'])) {
                $result = $facture->getById($_GET['id']);
                if ($result) {
                    echo json_encode($result);
                } else {
                    http_response_code(404);
                    echo json_encode(['error' => 'Facture non trouvée']);
                }
            } else {
                $factures = $facture->getAll();
                echo json_encode($factures);
            }
            break;
        
        case 'POST':
            try {
                error_log("Traitement d'une requête POST");
                $rawData = file_get_contents('php://input');
                error_log("Données brutes reçues : " . $rawData);
                
                $data = json_decode($rawData, true);
                error_log("Données décodées : " . print_r($data, true));
                
                if (!$data) {
                    throw new Exception("Erreur de décodage des données");
                }
                
                if (!isset($data['numero_table']) || !isset($data['articles']) || empty($data['articles'])) {
                    throw new Exception("Données invalides : numéro de table ou articles manquants");
                }
                
                $id = $facture->create($data);
                
                http_response_code(201);
                echo json_encode([
                    'success' => true,
                    'message' => 'Facture créée avec succès',
                    'id' => $id
                ]);
                
            } catch (Exception $e) {
                error_log("Erreur lors de la création de la facture: " . $e->getMessage());
                error_log("Stack trace: " . $e->getTraceAsString());
                http_response_code(500);
                echo json_encode([
                    'success' => false,
                    'error' => $e->getMessage()
                ]);
            }
            break;
            
        default:
            http_response_code(405);
            echo json_encode(['error' => 'Méthode non autorisée']);
            break;
    }
} catch (Exception $e) {
    error_log("Erreur générale: " . $e->getMessage());
    error_log("Stack trace: " . $e->getTraceAsString());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
} 