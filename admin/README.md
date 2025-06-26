# 🎛️ FOR+NAP Admin Panel

Panel d'administration professionnel pour gérer les membres du festival FOR+NAP.

## 🚀 Fonctionnalités

### 📊 **Tableau de bord en temps réel**
- **Statistiques instantanées** : Total membres, inscriptions du jour, membres festival, membres actifs
- **Métriques automatiques** : Mise à jour en temps réel des données

### 🔍 **Recherche et filtrage avancés**
- **Recherche instantanée** : Par nom, email, type de billet
- **Filtres multiples** : Type de membre, plage de dates
- **Résultats en temps réel** : Affichage du nombre de résultats

### 📋 **Gestion des membres**
- **Vue détaillée** : Toutes les informations d'un membre
- **QR Code** : Affichage du code membre
- **Actions rapides** : Régénérer carte, renvoyer email
- **Tri intelligent** : Par colonne avec indicateurs visuels

### 📥 **Export de données**
- **Export CSV** : Données filtrées avec horodatage
- **Format professionnel** : Prêt pour Excel/Google Sheets
- **Nom automatique** : `fornap-membres-YYYYMMDD.csv`

### 📱 **Interface responsive**
- **Design moderne** : Thème sombre professionnel
- **Mobile-friendly** : Adaptation automatique
- **Animations fluides** : Micro-interactions optimisées

## 🔧 Installation et utilisation

### 1. **Structure des fichiers**
```
fornap-clean/admin/
├── index.html      # Interface principale
├── admin.js        # Logique métier
├── styles.css      # Styles modernes
└── README.md       # Documentation
```

### 2. **Lancement du panel**
```bash
# Serveur local simple
cd fornap-clean/admin
python -m http.server 8080

# Ou avec Node.js
npx serve . -p 8080
```

### 3. **Accès**
Ouvrir : `http://localhost:8080`

## 🎨 Fonctionnalités techniques

### **Architecture modulaire**
- **Classe AdminPanel** : POO propre et maintenable
- **Gestion d'état** : Filtres et pagination centralisés
- **Séparation des responsabilités** : Vue, logique, style

### **Sécurité**
- **Échappement HTML** : Protection XSS
- **Validation CSV** : Format sécurisé
- **Firestore direct** : Authentification Firebase

### **Performance**
- **Pagination** : 20 éléments par page
- **Debounce** : Recherche optimisée (300ms)
- **Tri en mémoire** : Pas de requêtes répétées
- **Loading states** : Feedback utilisateur

## 📊 Structure des données

### **Collection Firestore : `members`**
```javascript
{
    uid: "uuid-unique",
    email: "membre@email.com",
    firstName: "Jean",
    lastName: "Dupont", 
    ticketType: "Pass Festival",
    postalCode: "83500",
    birthDate: "1990-01-01",
    phone: "+33123456789",
    createdAt: Timestamp,
    "end-member": Timestamp, // 31/12/2025
    "member-type": "4nap-festival"
}
```

## 🎛️ Guide d'utilisation

### **1. Tableau de bord**
- **Total Membres** : Nombre total d'inscrits
- **Aujourd'hui** : Nouvelles inscriptions du jour
- **Festival 4NAP** : Membres du type festival
- **Actifs** : Adhésions valides jusqu'en 2025

### **2. Recherche**
- Saisir dans la barre de recherche
- Recherche instantanée dans : nom, email, type billet
- Effacer pour réinitialiser

### **3. Filtres**
- **Type de membre** : Filtrer par catégorie
- **Date** : Aujourd'hui / Cette semaine / Ce mois
- **Combinaisons** : Plusieurs filtres simultanés

### **4. Tableau des membres**
- **Tri** : Cliquer sur les en-têtes de colonnes
- **Actions** : 
  - 👁️ **Voir** : Détails complets du membre
  - 🆔 **Carte** : Régénérer la carte membre

### **5. Détails membre (Modal)**
- **Informations complètes** : Toutes les données
- **QR Code** : Format `FORNAP-MEMBER:{uid}`
- **Actions** : Régénérer carte, renvoyer email

### **6. Export CSV**
- Bouton **Exporter** dans l'en-tête
- Exporte les données **filtrées**
- Format : `fornap-membres-20241212.csv`

## 🔄 Intégration webhook

Le panel se connecte directement à Firestore pour afficher les données générées par le webhook Hello Asso.

### **Flux de données**
1. **Hello Asso** → Webhook → Cloud Function
2. **Cloud Function** → Firestore → Panel Admin
3. **Panel Admin** → Affichage temps réel

## 🎨 Personnalisation

### **Variables CSS** (dans `styles.css`)
```css
:root {
    --accent-color: #00ff88;     /* Couleur principale */
    --background-dark: #000;     /* Fond */
    --text-primary: #fff;        /* Texte principal */
    /* ... autres variables */
}
```

### **Configuration** (dans `admin.js`)
```javascript
class AdminPanel {
    constructor() {
        this.pageSize = 20;          // Éléments par page
        this.sortField = 'createdAt'; // Tri par défaut
        // ... autres configs
    }
}
```

## 🛠️ Maintenance

### **Logs et debugging**
- Console navigateur : Erreurs et états
- Toasts : Notifications utilisateur
- Loading states : Feedback visuel

### **Évolutivité**
- **Nouveau champ** : Ajouter dans la structure Firestore
- **Nouveau filtre** : Étendre `applyFilters()`
- **Nouvelle action** : Ajouter dans `renderTable()`

## 📞 Support

En cas de problème :
1. Vérifier la console navigateur (F12)
2. Confirmer la connexion Firestore
3. Valider la structure des données
4. Tester avec des données exemple

---

**Panel créé avec ❤️ pour FOR+NAP Social Club**  
*Fort Napoléon - La Seyne sur Mer* 