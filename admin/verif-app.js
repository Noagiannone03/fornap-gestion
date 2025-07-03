import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import { getFirestore, collection, doc, getDoc } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";

// Configuration Firebase ForNap
const firebaseConfig = {
    apiKey: "AIzaSyALz161yfiLaOeHU82DQNJV4PkzAXO1wzM",
    authDomain: "nap-7aa80.firebaseapp.com",
    projectId: "nap-7aa80",
    storageBucket: "nap-7aa80.firebasestorage.app",
    messagingSenderId: "434731738248",
    appId: "1:434731738248:web:481644f3a6e809c06d2b3d",
    measurementId: "G-3HVC6HNG02"
};

// Initialiser Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

class ForNapVerifySystem {
    constructor() {
        this.codeReader = null;
        this.selectedDeviceId = null;
        this.isScanning = false;
        this.currentUser = null;
        this.currentView = 'scanner';
        this.scanHistory = [];
        this.settings = {
            sound: true,
            vibration: true,
            autoScan: false
        };
        
        this.loadSettings();
        this.loadHistory();
        this.initializeElements();
        this.setupEventListeners();
        this.initializeAuth();
    }

    initializeElements() {
        // Écrans
        this.authScreen = document.getElementById('auth-screen');
        this.mainInterface = document.getElementById('main-interface');
        
        // Authentification
        this.authForm = document.getElementById('auth-form');
        this.authEmail = document.getElementById('auth-email');
        this.authPassword = document.getElementById('auth-password');
        this.authBtn = document.getElementById('auth-btn');
        this.authError = document.getElementById('auth-error');
        
        // Interface principale
        this.userEmail = document.getElementById('user-email');
        this.logoutBtn = document.getElementById('logout-btn');
        
        // Scanner
        this.scannerVideo = document.getElementById('scanner-video');
        this.scannerToggle = document.getElementById('scanner-toggle');
        this.statusIndicator = document.getElementById('status-indicator');
        this.statusText = document.getElementById('status-text');
        
        // Messages
        this.errorMessage = document.getElementById('error-message');
        this.successMessage = document.getElementById('success-message');
        
        // Modal
        this.verificationModal = document.getElementById('verification-modal');
        this.verificationIcon = document.getElementById('verification-icon');
        this.verificationTitle = document.getElementById('verification-title');
        this.verificationSubtitle = document.getElementById('verification-subtitle');
        this.memberPhoto = document.getElementById('member-photo');
        this.memberInfo = document.getElementById('member-info');
        this.closeModal = document.getElementById('close-modal');
        
        // Actions rapides
        this.quickActions = document.getElementById('quick-actions');
        this.actionButtons = document.querySelectorAll('.action-btn');
        
        // Vues
        this.scannerCard = document.querySelector('.scanner-card');
        this.historyView = document.getElementById('history-view');
        this.settingsView = document.getElementById('settings-view');
        
        // Historique
        this.historyList = document.getElementById('history-list');
        this.totalScansEl = document.getElementById('total-scans');
        this.validScansEl = document.getElementById('valid-scans');
        this.invalidScansEl = document.getElementById('invalid-scans');
        this.clearHistoryBtn = document.getElementById('clear-history');
        
        // Paramètres
        this.soundToggle = document.getElementById('sound-toggle');
        this.vibrationToggle = document.getElementById('vibration-toggle');
        this.autoScanToggle = document.getElementById('auto-scan-toggle');
    }

    setupEventListeners() {
        // Authentification
        this.authForm.addEventListener('submit', (e) => this.handleAuth(e));
        this.logoutBtn.addEventListener('click', () => this.handleLogout());
        
        // Scanner
        this.scannerToggle.addEventListener('click', () => this.toggleScanner());
        
        // Modal
        this.closeModal.addEventListener('click', () => this.closeVerificationModal());
        this.verificationModal.addEventListener('click', (e) => {
            if (e.target === this.verificationModal) {
                this.closeVerificationModal();
            }
        });
        
        // Navigation
        this.actionButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.currentTarget.dataset.view;
                this.switchView(view);
            });
        });
        
        // Historique
        this.clearHistoryBtn.addEventListener('click', () => this.clearHistory());
        
        // Paramètres
        this.soundToggle.addEventListener('change', () => this.updateSettings());
        this.vibrationToggle.addEventListener('change', () => this.updateSettings());
        this.autoScanToggle.addEventListener('change', () => this.updateSettings());
    }

    initializeAuth() {
        onAuthStateChanged(auth, (user) => {
            if (user) {
                this.currentUser = user;
                this.showMainInterface();
            } else {
                this.currentUser = null;
                this.showAuthScreen();
            }
        });
    }

    async handleAuth(e) {
        e.preventDefault();
        
        const email = this.authEmail.value.trim();
        const password = this.authPassword.value;
        
        if (!email || !password) {
            this.showError('Veuillez remplir tous les champs', this.authError);
            return;
        }

        this.setLoadingState(this.authBtn, true);
        
        try {
            await signInWithEmailAndPassword(auth, email, password);
            this.hideError(this.authError);
        } catch (error) {
            console.error('Erreur d\'authentification:', error);
            this.showError('Identifiants incorrects', this.authError);
        } finally {
            this.setLoadingState(this.authBtn, false);
        }
    }

    async handleLogout() {
        try {
            await signOut(auth);
            this.stopScanner();
        } catch (error) {
            console.error('Erreur de déconnexion:', error);
            this.showError('Erreur lors de la déconnexion');
        }
    }

    showAuthScreen() {
        this.authScreen.style.display = 'flex';
        this.mainInterface.style.display = 'none';
        this.quickActions.classList.add('hidden');
        this.authEmail.value = '';
        this.authPassword.value = '';
    }

    showMainInterface() {
        this.authScreen.style.display = 'none';
        this.mainInterface.style.display = 'block';
        this.quickActions.classList.remove('hidden');
        this.userEmail.textContent = this.currentUser.email;
        this.initializeScanner();
        
        // Initialiser les toggles des paramètres
        if (this.soundToggle) this.soundToggle.checked = this.settings.sound;
        if (this.vibrationToggle) this.vibrationToggle.checked = this.settings.vibration;
        if (this.autoScanToggle) this.autoScanToggle.checked = this.settings.autoScan;
    }

    async initializeScanner() {
        try {
            this.codeReader = new ZXing.BrowserQRCodeReader();
            const devices = await this.codeReader.getVideoInputDevices();
            
            if (devices.length > 0) {
                // Préférer la caméra arrière pour mobile
                this.selectedDeviceId = devices.find(device => 
                    device.label.toLowerCase().includes('back') || 
                    device.label.toLowerCase().includes('rear')
                )?.deviceId || devices[0].deviceId;
                
                this.updateScannerStatus('Scanner prêt', false);
            } else {
                this.updateScannerStatus('Aucune caméra détectée', false);
                this.scannerToggle.disabled = true;
            }
        } catch (error) {
            console.error('Erreur d\'initialisation du scanner:', error);
            this.updateScannerStatus('Erreur d\'initialisation', false);
            this.scannerToggle.disabled = true;
        }
    }

    async toggleScanner() {
        if (this.isScanning) {
            this.stopScanner();
        } else {
            await this.startScanner();
        }
    }

    async startScanner() {
        if (!this.codeReader || this.isScanning) return;
        
        try {
            this.isScanning = true;
            this.setLoadingState(this.scannerToggle, true);
            this.updateScannerStatus('Activation du scanner...', true);
            
            await this.codeReader.decodeFromVideoDevice(
                this.selectedDeviceId,
                this.scannerVideo,
                (result, err) => {
                    if (result) {
                        this.processQRCode(result.text);
                    }
                    if (err && !(err instanceof ZXing.NotFoundException)) {
                        console.error('Erreur de scan:', err);
                    }
                }
            );
            
            this.setLoadingState(this.scannerToggle, false);
            this.scannerToggle.querySelector('.btn-text').textContent = 'Désactiver le scanner';
            this.updateScannerStatus('Scanner actif - En attente', true);
            
        } catch (error) {
            console.error('Erreur du scanner:', error);
            this.showError('Erreur: ' + error.message);
            this.stopScanner();
        }
    }

    stopScanner() {
        if (this.codeReader && this.isScanning) {
            this.codeReader.reset();
            this.isScanning = false;
        }
        
        this.setLoadingState(this.scannerToggle, false);
        this.scannerToggle.querySelector('.btn-text').textContent = 'Activer le scanner';
        this.updateScannerStatus('Scanner inactif', false);
    }

    async processQRCode(qrText) {
        console.log('QR Code détecté:', qrText);
        
        // Animation de scan
        this.updateScannerStatus('Analyse en cours...', true);
        
        // Vérifier le format: FORNAP-MEMBER:{memberDocumentId}
        if (!qrText.startsWith('FORNAP-MEMBER:')) {
            this.showError('QR Code invalide');
            this.updateScannerStatus('Scanner actif - En attente', true);
            return;
        }
        
        const memberId = qrText.replace('FORNAP-MEMBER:', '');
        if (!memberId) {
            this.showError('ID membre invalide');
            this.updateScannerStatus('Scanner actif - En attente', true);
            return;
        }
        
        await this.verifyMember(memberId);
    }

    async verifyMember(memberId) {
        this.updateScannerStatus('Vérification en cours...', true);
        
        try {
            // Récupérer les données du membre depuis Firebase
            const memberDoc = await getDoc(doc(db, 'members', memberId));
            
            if (!memberDoc.exists()) {
                this.showVerificationResult(false, 'Membre non trouvé', 'Aucun membre avec cet identifiant', null);
                return;
            }
            
            const memberData = memberDoc.data();
            console.log('Données membre:', memberData);
            
            // Vérifier le statut d'abonnement
            const isActive = this.checkMembershipStatus(memberData);
            
            if (isActive) {
                this.showVerificationResult(true, 'Membre vérifié', 'Abonnement actif jusqu\'à fin 2025', memberData);
                this.showSuccess('✓ Membre vérifié avec succès');
                this.addToHistory(true, memberData);
                if (this.settings.sound) this.playSuccessSound();
                if (this.settings.vibration) this.triggerVibration();
            } else {
                this.showVerificationResult(false, 'Abonnement expiré', 'Le membre doit renouveler son abonnement', memberData);
                this.addToHistory(false, memberData);
                if (this.settings.sound) this.playErrorSound();
            }
            
        } catch (error) {
            console.error('Erreur de vérification:', error);
            this.showError('Erreur de vérification: ' + error.message);
        } finally {
            this.updateScannerStatus('Scanner actif - En attente', true);
        }
    }

    checkMembershipStatus(memberData) {
        // Pour ForNap, l'abonnement est valide jusqu'à fin 2025
        const expirationDate = new Date('2025-12-31');
        const today = new Date();
        
        // Vérifier si le membre a un statut de paiement réussi
        const hasValidPayment = memberData.paymentStatus === 'success' || 
                               memberData.status === 'confirmed';
        
        return hasValidPayment && today <= expirationDate;
    }

    showVerificationResult(isValid, title, subtitle, memberData) {
        // Configurer l'icône et les couleurs
        if (isValid) {
            this.verificationIcon.className = 'verification-icon success';
            this.verificationIcon.textContent = '✓';
        } else {
            this.verificationIcon.className = 'verification-icon error';
            this.verificationIcon.textContent = '✗';
        }
        
        this.verificationTitle.textContent = title;
        this.verificationSubtitle.textContent = subtitle;
        
        // Afficher les informations du membre
        if (memberData) {
            // Photo avec initiales
            const initials = (memberData.firstname?.[0] || '') + (memberData.lastname?.[0] || '');
            this.memberPhoto.textContent = initials || '👤';
            
            // Construire la grille d'informations
            const birthdate = memberData.birthdate ? new Date(memberData.birthdate) : null;
            const age = memberData.age || (birthdate ? this.calculateAge(birthdate) : null);
            const registrationDate = memberData.timestamp ? 
                new Date(memberData.timestamp).toLocaleDateString('fr-FR') : 'Non disponible';
            
            const statusBadge = isValid ? 
                '<span class="status-badge-large active">✓ Actif</span>' :
                '<span class="status-badge-large expired">✗ Expiré</span>';
            
            this.memberInfo.innerHTML = `
                <div class="info-item">
                    <span class="info-label">Prénom</span>
                    <span class="info-value">${memberData.firstname || 'Non renseigné'}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Nom</span>
                    <span class="info-value">${memberData.lastname || 'Non renseigné'}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Email</span>
                    <span class="info-value">${memberData.email || 'Non renseigné'}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Âge</span>
                    <span class="info-value">${age ? age + ' ans' : 'Non renseigné'}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Code postal</span>
                    <span class="info-value">${memberData.zipcode || 'Non renseigné'}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Membre depuis</span>
                    <span class="info-value">${registrationDate}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Statut</span>
                    <span class="info-value">${statusBadge}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Type de compte</span>
                    <span class="info-value">${memberData.type === 'member' ? 'Membre adhérent' : 'Intéressé'}</span>
                </div>
            `;
        } else {
            this.memberPhoto.textContent = '❌';
            this.memberInfo.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">Aucune donnée disponible</p>';
        }
        
        // Afficher la modal
        this.verificationModal.classList.add('active');
    }

    calculateAge(birthdate) {
        const today = new Date();
        const birth = new Date(birthdate);
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        
        return age;
    }

    closeVerificationModal() {
        this.verificationModal.classList.remove('active');
        
        // Redémarrer le scanner si auto-scan activé
        if (this.settings.autoScan && this.currentView === 'scanner') {
            setTimeout(() => {
                if (!this.isScanning) {
                    this.startScanner();
                }
            }, 1000);
        }
    }

    updateScannerStatus(message, isActive) {
        this.statusText.textContent = message;
        if (isActive) {
            this.statusIndicator.classList.add('active');
            this.statusText.classList.add('active');
        } else {
            this.statusIndicator.classList.remove('active');
            this.statusText.classList.remove('active');
        }
    }

    setLoadingState(button, isLoading) {
        if (isLoading) {
            button.classList.add('loading');
            button.disabled = true;
        } else {
            button.classList.remove('loading');
            button.disabled = false;
        }
    }

    showError(message, element = null) {
        const errorEl = element || this.errorMessage;
        errorEl.textContent = message;
        errorEl.style.display = 'block';
        
        setTimeout(() => {
            errorEl.style.display = 'none';
        }, 5000);
    }

    hideError(element) {
        element.style.display = 'none';
    }

    showSuccess(message) {
        this.successMessage.textContent = message;
        this.successMessage.style.display = 'block';
        
        setTimeout(() => {
            this.successMessage.style.display = 'none';
        }, 3000);
    }

    // Nouvelles méthodes pour la navigation
    switchView(view) {
        // Mettre à jour les boutons actifs
        this.actionButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });

        // Masquer toutes les vues
        this.scannerCard.classList.add('hidden');
        this.historyView.classList.add('hidden');
        this.settingsView.classList.add('hidden');

        // Afficher la vue sélectionnée
        switch(view) {
            case 'scanner':
                this.scannerCard.classList.remove('hidden');
                break;
            case 'history':
                this.historyView.classList.remove('hidden');
                this.updateHistoryDisplay();
                break;
            case 'settings':
                this.settingsView.classList.remove('hidden');
                break;
        }

        this.currentView = view;
    }

    // Gestion de l'historique
    addToHistory(isValid, memberData) {
        const historyEntry = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            isValid: isValid,
            memberData: memberData || {}
        };

        this.scanHistory.unshift(historyEntry);
        
        // Limiter à 50 entrées
        if (this.scanHistory.length > 50) {
            this.scanHistory = this.scanHistory.slice(0, 50);
        }

        this.saveHistory();
        this.updateHistoryDisplay();
    }

    updateHistoryDisplay() {
        // Mettre à jour les statistiques
        const totalScans = this.scanHistory.length;
        const validScans = this.scanHistory.filter(s => s.isValid).length;
        const invalidScans = totalScans - validScans;

        this.totalScansEl.textContent = totalScans;
        this.validScansEl.textContent = validScans;
        this.invalidScansEl.textContent = invalidScans;

        // Afficher la liste
        if (this.scanHistory.length === 0) {
            this.historyList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📋</div>
                    <div class="empty-text">Aucun scan dans l'historique</div>
                </div>
            `;
            return;
        }

        this.historyList.innerHTML = this.scanHistory.map(entry => {
            const time = new Date(entry.timestamp);
            const timeStr = time.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
            const dateStr = time.toLocaleDateString('fr-FR');
            const member = entry.memberData;
            
            return `
                <div class="history-item">
                    <div class="history-status">${entry.isValid ? '✅' : '❌'}</div>
                    <div class="history-details">
                        <div class="history-name">
                            ${member.firstname || 'Inconnu'} ${member.lastname || ''}
                        </div>
                        <div class="history-meta">
                            ${member.email || 'Pas d\'email'} ${member.zipcode ? `• ${member.zipcode}` : ''}
                        </div>
                    </div>
                    <div class="history-time">
                        ${timeStr}<br>
                        <small>${dateStr}</small>
                    </div>
                </div>
            `;
        }).join('');
    }

    clearHistory() {
        if (confirm('Êtes-vous sûr de vouloir effacer tout l\'historique ?')) {
            this.scanHistory = [];
            this.saveHistory();
            this.updateHistoryDisplay();
            this.showSuccess('Historique effacé');
        }
    }

    // Gestion des paramètres
    updateSettings() {
        this.settings = {
            sound: this.soundToggle.checked,
            vibration: this.vibrationToggle.checked,
            autoScan: this.autoScanToggle.checked
        };
        this.saveSettings();
    }

    loadSettings() {
        const saved = localStorage.getItem('fornap-verify-settings');
        if (saved) {
            this.settings = JSON.parse(saved);
        }
    }

    saveSettings() {
        localStorage.setItem('fornap-verify-settings', JSON.stringify(this.settings));
    }

    loadHistory() {
        const saved = localStorage.getItem('fornap-verify-history');
        if (saved) {
            this.scanHistory = JSON.parse(saved);
        }
    }

    saveHistory() {
        localStorage.setItem('fornap-verify-history', JSON.stringify(this.scanHistory));
    }

    // Effets sonores et vibration
    playSuccessSound() {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBj2Gy/DWhDMFHm7A7OOZRwwUXrTp66hVFApGn+DyvmwhBj2Gy/DWhDMFHm7A7OOZRwwRWrbq7Z1SGwk7k9kGhQ');
        audio.play().catch(() => {});
    }

    playErrorSound() {
        const audio = new Audio('data:audio/wav;base64,UklGRiIGAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAGAACBiYuFfn59jZSRhHZzeJCZk3ZvbneUmZN2b253kZmVeHJyeY+Uj3x6fY+Sj317fJCSj317fJCSj317fJCSkH1+f5CRjn19gJGSkH1+f5CRjn19gJGSkH1+f5CRjn19gJGSkH1+f5CRjn19gJGRkH5/gZGQjn5/g5GRj39/hJGQjn+AhJGQjn');
        audio.play().catch(() => {});
    }

    triggerVibration() {
        if ('vibrate' in navigator) {
            navigator.vibrate(200);
        }
    }
}

// Initialiser l'application
document.addEventListener('DOMContentLoaded', () => {
    new ForNapVerifySystem();
}); 