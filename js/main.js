// URL de base de l'API (backend)
const API_BASE_URL = 'https://seagreen-wasp-711925.hostingersite.com';

// Fonction utilitaire pour les requêtes fetch
async function fetchAPI(endpoint, options = {}) {
    // Construction de l'URL complète
    const url = `${API_BASE_URL}${endpoint}`;
    
    const config = {
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        ...options,
    };
    
    try {
        console.log('Envoi requête à:', url, 'avec config:', config);
        const response = await fetch(url, config);
        console.log('Status HTTP:', response.status);
        
        const responseData = await response.json();
        console.log('Réponse complète:', responseData);
        
        // On considère les statuts 2xx comme des succès
        if (response.status >= 200 && response.status < 300) {
            return responseData;
        } else {
            throw new Error(responseData.error || `Erreur HTTP: ${response.status}`);
        }
    } catch (error) {
        console.error('Erreur fetch détaillée:', error);
        throw error;
    }
}

// Initialisation des données dans le localStorage
if (!localStorage.getItem('articles')) {
    localStorage.setItem('articles', JSON.stringify([]));
}
if (!localStorage.getItem('factures')) {
    localStorage.setItem('factures', JSON.stringify([]));
}
if (!localStorage.getItem('dernierNumeroFacture')) {
    localStorage.setItem('dernierNumeroFacture', '0');
}

// Gestion du panier actuel
let panierActuel = [];

// Fonctions de gestion des articles
async function ajouterArticle() {
    const nom = document.getElementById('article-name').value;
    const prix = parseFloat(document.getElementById('article-price').value);
    const categorie = document.getElementById('article-category').value;

    if (!nom || !prix) {
        showToast("Veuillez remplir tous les champs", "error");
        return;
    }

    try {
        await fetchAPI('/api/articles.php', {
            method: 'POST',
            body: JSON.stringify({ nom, prix, categorie })
        });

        document.getElementById('article-name').value = '';
        document.getElementById('article-price').value = '';
        
        showToast("Article ajouté avec succès", "success");
        chargerArticles();
    } catch (error) {
        console.error('Erreur:', error);
        showToast("Erreur lors de l'ajout de l'article", "error");
    }
}

async function supprimerArticle(id) {
    try {
        await fetchAPI(`/api/articles.php?id=${id}`, {
            method: 'DELETE'
        });

        chargerArticles();
        showToast("Article supprimé avec succès", "success");
    } catch (error) {
        console.error('Erreur:', error);
        showToast("Erreur lors de la suppression", "error");
    }
}

async function chargerArticles() {
    try {
        const articles = await fetchAPI('/api/articles.php');
        window.articlesDisponibles = articles;

        const tableBody = document.querySelector('#articles-list tbody');
        const articlesTable = document.querySelector('#articles-table tbody');

        // Mise à jour de la liste des articles dans l'onglet gestion
        tableBody.innerHTML = articles.map(article => `
            <tr>
                <td>${article.nom}</td>
                <td>${parseFloat(article.prix).toFixed(2)} €</td>
                <td>${article.categorie}</td>
                <td class="article-actions">
                    <button class="btn btn-edit" onclick="ouvrirModalEdition(${article.id})" title="Modifier">
                        <i class="fas fa-edit"></i>
                        <span>Modifier</span>
                    </button>
                    <button class="btn btn-delete" onclick="confirmerSuppression(${article.id})" title="Supprimer">
                        <i class="fas fa-trash"></i>
                        <span>Supprimer</span>
                    </button>
                </td>
            </tr>
        `).join('');

        // Mise à jour de la liste des articles disponibles
        articlesTable.innerHTML = articles.map(article => `
            <tr data-article-id="${article.id}">
                <td>${article.nom}</td>
                <td>${parseFloat(article.prix).toFixed(2)} €</td>
                <td>
                    <div class="quantity-controls">
                        <button class="quantity-btn" onclick="setQuantiteTemp(${article.id}, Math.max(1, (document.querySelector('tr[data-article-id=\\'${article.id}\\'] .quantity-input').value - 1)))">
                            <i class="fas fa-minus"></i>
                        </button>
                        <input type="number" class="quantity-input" value="1" 
                               min="1" onchange="setQuantiteTemp(${article.id}, this.value)">
                        <button class="quantity-btn" onclick="setQuantiteTemp(${article.id}, parseInt(document.querySelector('tr[data-article-id=\\'${article.id}\\'] .quantity-input').value) + 1)">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                </td>
                <td>
                    <button class="btn btn-add" onclick="ajouterAuPanierAvecQuantite(${article.id})">
                        <i class="fas fa-plus"></i>
                        Ajouter
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Erreur:', error);
        showToast("Erreur lors du chargement des articles", "error");
    }
}

// Gestion du panier
async function ajouterAuPanier(id) {
    try {
        const article = await fetchAPI(`/api/articles.php?id=${id}`);
        
        if (!article || !article.id) {
            throw new Error('Article non trouvé');
        }
        
        const articleExistant = panierActuel.find(item => item.id === article.id);
        
        if (articleExistant) {
            articleExistant.quantite++;
        } else {
            panierActuel.push({
                id: article.id,
                nom: article.nom,
                prix: article.prix,
                quantite: 1
            });
        }
        
        mettreAJourPanier();
        showToast("Article ajouté au panier", "success");
    } catch (error) {
        console.error('Erreur:', error);
        showToast("Erreur lors de l'ajout au panier", "error");
    }
}

function retirerDuPanier(index) {
    panierActuel.splice(index, 1);
    mettreAJourPanier();
}

function mettreAJourPanier() {
    const cartContainer = document.getElementById('current-cart');
    const cartItems = cartContainer.querySelector('.cart-items');
    const total = panierActuel.reduce((sum, item) => sum + (item.prix * item.quantite), 0);
    
    if (panierActuel.length === 0) {
        cartItems.innerHTML = '<div class="cart-empty">Panier vide</div>';
    } else {
        cartItems.innerHTML = panierActuel.map(item => `
            <div class="cart-item" data-id="${item.id}">
                <div class="cart-item-details">
                    <span class="cart-item-name">${item.nom}</span>
                    <div class="cart-item-price">
                        <span class="price-unit">${item.prix.toFixed(2)} € / unité</span>
                        <span class="price-total">${(item.prix * item.quantite).toFixed(2)} €</span>
                    </div>
                </div>
                <div class="quantity-controls">
                    <button class="quantity-btn" onclick="modifierQuantite(${item.id}, -1)">
                        <i class="fas fa-minus"></i>
                    </button>
                    <input type="number" class="quantity-input" value="${item.quantite}" 
                           onchange="mettreAJourQuantite(${item.id}, this.value)" min="1">
                    <button class="quantity-btn" onclick="modifierQuantite(${item.id}, 1)">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
                <button class="btn btn-remove" onclick="supprimerDuPanier(${item.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `).join('');
    }
    
    document.getElementById('cart-total').textContent = total.toFixed(2);
}

function modifierQuantite(articleId, delta) {
    const article = panierActuel.find(item => item.id === articleId);
    if (article) {
        article.quantite = Math.max(1, article.quantite + delta);
        mettreAJourPanier();
    }
}

function mettreAJourQuantite(articleId, nouvelleQuantite) {
    const article = panierActuel.find(item => item.id === articleId);
    if (article) {
        article.quantite = Math.max(1, parseInt(nouvelleQuantite) || 1);
        mettreAJourPanier();
    }
}

function supprimerDuPanier(articleId) {
    const index = panierActuel.findIndex(item => item.id === articleId);
    if (index !== -1) {
        const itemElement = document.querySelector(`.cart-item[data-id="${articleId}"]`);
        itemElement.classList.add('removing');
        
        setTimeout(() => {
            panierActuel.splice(index, 1);
            mettreAJourPanier();
            showToast("Article supprimé du panier", "info");
        }, 300);
    }
}

// Gestion des factures
async function finaliserFacture() {
    const tableNumber = document.getElementById('table-number').value;
    if (!tableNumber) {
        showToast("Veuillez entrer un numéro de table", "error");
        return;
    }
    if (panierActuel.length === 0) {
        showToast("Le panier est vide", "error");
        return;
    }

    try {
        // Calculer le total
        const total = panierActuel.reduce((sum, item) => sum + (parseFloat(item.prix) * item.quantite), 0);
        
        // Préparer les données de la facture
        const factureData = {
            numero_table: parseInt(tableNumber),
            articles: panierActuel.map(article => ({
                id: parseInt(article.id),
                quantite: parseInt(article.quantite),
                prix_unitaire: parseFloat(article.prix)
            })),
            total: parseFloat(total.toFixed(2))
        };

        console.log("Données de la facture à envoyer:", factureData);

        const response = await fetchAPI('/api/factures.php', {
            method: 'POST',
            body: JSON.stringify(factureData)
        });

        console.log("Réponse du serveur:", response);

        // Vérifier si la réponse est un succès
        if (response.success === true) {
            // Réinitialisation du panier
            panierActuel = [];
            mettreAJourPanier();
            document.getElementById('table-number').value = '';
            
            showToast(response.message || "Facture créée avec succès", "success");
            chargerHistorique();
        } else {
            throw new Error(response.error || "Erreur lors de la création de la facture");
        }
    } catch (error) {
        console.error('Erreur détaillée:', error);
        showToast(error.message, "error");
    }
}

async function chargerHistorique() {
    try {
        const factures = await fetchAPI('/api/factures.php');
        
        const tableBody = document.querySelector('#historique-table tbody');
        tableBody.innerHTML = factures.map(facture => `
            <tr onclick="afficherDetailFacture(${facture.id})" data-facture-id="${facture.id}">
                <td>#${facture.id}</td>
                <td>Table ${facture.numero_table}</td>
                <td>${moment(facture.date_creation).format('DD/MM/YYYY HH:mm')}</td>
                <td class="montant">${parseFloat(facture.total).toFixed(2)} €</td>
                <td class="actions-cell">
                    <button class="btn btn-view" onclick="event.stopPropagation(); afficherDetailFacture(${facture.id})" title="Voir les détails">
                        <i class="fas fa-receipt"></i>
                        <span>Détails</span>
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Erreur:', error);
        showToast("Erreur lors du chargement de l'historique", "error");
    }
}

async function afficherDetailFacture(id) {
    try {
        const facture = await fetchAPI(`/api/factures.php?id=${id}`);
        
        if (!facture || !facture.articles) {
            throw new Error('Données de facture invalides');
        }
        
        const modal = document.getElementById('factureModal');
        const modalContent = document.getElementById('modalContent');
        
        modalContent.innerHTML = `
            <div class="facture-header">
                <h2><i class="fas fa-receipt"></i> Facture N°${facture.id}</h2>
                <div class="facture-info">
                    <p><i class="fas fa-table"></i> Table ${facture.numero_table}</p>
                    <p><i class="far fa-clock"></i> ${moment(facture.date_creation).format('DD/MM/YYYY HH:mm')}</p>
                </div>
            </div>
            <div class="facture-content">
                <table class="facture-articles">
                    <thead>
                        <tr>
                            <th>Article</th>
                            <th>Quantité</th>
                            <th>Prix unitaire</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${facture.articles.map(article => `
                            <tr>
                                <td>${article.nom}</td>
                                <td class="text-center">${article.quantite}</td>
                                <td class="text-right">${parseFloat(article.prix_unitaire).toFixed(2)} €</td>
                                <td class="text-right">${(article.prix_unitaire * article.quantite).toFixed(2)} €</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <div class="facture-total">
                    <div class="total-line">
                        <span>Total</span>
                        <span class="montant">${parseFloat(facture.total).toFixed(2)} €</span>
                    </div>
                </div>
            </div>
            <div class="facture-actions">
                <button class="btn btn-secondary" onclick="document.getElementById('factureModal').style.display='none'">
                    <i class="fas fa-times"></i>
                    Fermer
                </button>
                <button class="btn btn-primary" onclick="imprimerFacture(${facture.id})">
                    <i class="fas fa-print"></i>
                    Imprimer
                </button>
            </div>
        `;
        
        modal.style.display = "block";
    } catch (error) {
        console.error('Erreur:', error);
        showToast("Erreur lors du chargement des détails de la facture", "error");
    }
}

// Ajout de la fonction d'impression
function imprimerFacture(id) {
    const contenuFacture = document.getElementById('modalContent').innerHTML;
    const fenetreImpression = window.open('', '', 'height=600,width=800');
    
    fenetreImpression.document.write(`
        <html>
            <head>
                <title>Facture N°${id}</title>
                <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    .facture-header { margin-bottom: 30px; }
                    .facture-articles { width: 100%; border-collapse: collapse; margin: 20px 0; }
                    .facture-articles th, .facture-articles td { padding: 10px; border-bottom: 1px solid #ddd; }
                    .text-right { text-align: right; }
                    .text-center { text-align: center; }
                    .facture-total { margin-top: 30px; text-align: right; font-weight: bold; }
                    .montant { font-size: 1.2em; color: #2d3748; }
                    @media print {
                        .facture-actions { display: none; }
                    }
                </style>
            </head>
            <body>
                ${contenuFacture}
            </body>
        </html>
    `);
    
    fenetreImpression.document.close();
    fenetreImpression.focus();
    setTimeout(() => {
        fenetreImpression.print();
        fenetreImpression.close();
    }, 250);
}

// Gestion des modales
async function ouvrirModalEdition(id) {
    try {
        const article = await fetchAPI(`/api/articles.php?id=${id}`);
        
        if (!article || !article.id) {
            throw new Error('Article non trouvé');
        }
        
        document.getElementById('edit-article-id').value = article.id;
        document.getElementById('edit-article-name').value = article.nom;
        document.getElementById('edit-article-price').value = article.prix;
        document.getElementById('edit-article-category').value = article.categorie;
        
        document.getElementById('editArticleModal').style.display = "block";
    } catch (error) {
        console.error('Erreur:', error);
        showToast("Erreur lors du chargement de l'article", "error");
    }
}

function closeEditModal() {
    document.getElementById('editArticleModal').style.display = "none";
}

async function sauvegarderArticle() {
    const id = parseInt(document.getElementById('edit-article-id').value);
    const nom = document.getElementById('edit-article-name').value;
    const prix = parseFloat(document.getElementById('edit-article-price').value);
    const categorie = document.getElementById('edit-article-category').value;

    try {
        await fetchAPI(`/api/articles.php?id=${id}`, {
            method: 'PUT',
            body: JSON.stringify({ nom, prix, categorie })
        });

        closeEditModal();
        chargerArticles();
        showToast("Article modifié avec succès", "success");
    } catch (error) {
        console.error('Erreur:', error);
        showToast("Erreur lors de la modification de l'article", "error");
    }
}

// Gestion des onglets
function showTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    
    document.getElementById(tabId).classList.add('active');
    document.querySelector(`button[onclick="showTab('${tabId}')"]`).classList.add('active');
    
    if (tabId === 'historique') {
        chargerHistorique();
    }
}

// Fonction utilitaire pour afficher les notifications
function showToast(message, type = "info") {
    Toastify({
        text: message,
        duration: 3000,
        gravity: "top",
        position: "right",
        backgroundColor: type === "error" ? "#ff4444" : "#00C851",
    }).showToast();
}

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    chargerArticles();
    chargerHistorique();
    
    // Gestion de la fermeture des modales
    window.onclick = function(event) {
        const factureModal = document.getElementById('factureModal');
        const editModal = document.getElementById('editArticleModal');
        const deleteModal = document.getElementById('deleteConfirmModal');
        
        if (event.target === factureModal) {
            factureModal.style.display = "none";
        }
        if (event.target === editModal) {
            editModal.style.display = "none";
        }
        if (event.target === deleteModal) {
            deleteModal.style.display = "none";
        }
    }
    
    document.querySelectorAll('.modal .close').forEach(closeBtn => {
        closeBtn.onclick = function() {
            this.closest('.modal').style.display = "none";
        }
    });
});

function setQuantiteTemp(articleId, quantite) {
    const input = document.querySelector(`tr[data-article-id='${articleId}'] .quantity-input`);
    if (input) {
        input.value = Math.max(1, parseInt(quantite) || 1);
    }
}

async function ajouterAuPanierAvecQuantite(id) {
    try {
        const article = window.articlesDisponibles.find(a => a.id === id);
        if (!article) {
            throw new Error('Article non trouvé');
        }

        const quantiteInput = document.querySelector(`tr[data-article-id='${id}'] .quantity-input`);
        const quantite = parseInt(quantiteInput?.value || 1);
        
        const articleExistant = panierActuel.find(item => item.id === article.id);
        
        if (articleExistant) {
            articleExistant.quantite += quantite;
        } else {
            panierActuel.push({
                id: article.id,
                nom: article.nom,
                prix: parseFloat(article.prix),
                quantite: quantite
            });
        }
        
        mettreAJourPanier();
        showToast("Article ajouté au panier", "success");
        
        // Réinitialiser la quantité à 1
        setQuantiteTemp(id, 1);
    } catch (error) {
        console.error('Erreur:', error);
        showToast("Erreur lors de l'ajout au panier", "error");
    }
}

// Ajouter cette nouvelle fonction pour la confirmation de suppression
function confirmerSuppression(id) {
    const article = window.articlesDisponibles.find(a => a.id === id);
    if (!article) return;

    const modal = document.getElementById('deleteConfirmModal');
    const nomSpan = document.getElementById('deleteArticleName');
    const confirmBtn = document.getElementById('confirmDeleteBtn');

    nomSpan.textContent = article.nom;
    modal.style.display = "block";

    // Retirer l'ancien event listener s'il existe
    confirmBtn.replaceWith(confirmBtn.cloneNode(true));
    const newConfirmBtn = document.getElementById('confirmDeleteBtn');
    
    // Ajouter le nouvel event listener
    newConfirmBtn.addEventListener('click', async () => {
        await supprimerArticle(id);
        closeDeleteModal();
    });
}

function closeDeleteModal() {
    const modal = document.getElementById('deleteConfirmModal');
    modal.style.display = "none";
}


