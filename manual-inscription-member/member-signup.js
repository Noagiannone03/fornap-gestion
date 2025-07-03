class MemberSignup {
    constructor() {
        this.currentMode = null;
        this.currentFormData = null;
        this.memberDocumentId = null; // Stocker l'ID du document Firebase
        this.selectedSupportOption = null; // Nouvelle propriété pour le choix de soutien
        this.selectedAmount = null; // Montant sélectionné
        
        // Configuration Square - Mode Sandbox (vos credentials ForNap)
        this.squareConfig = {
            applicationId: 'sandbox-sq0idb-emB5qLjloYgpPbdIpBWftw', // Votre Application ID
            locationId: 'LK0RQAQMW1YA4', // Votre Location ID  
            environment: 'sandbox' // Mode sandbox pour les tests
        };
        
        this.payments = null; // Instance Square Payments
        this.card = null; // Instance Square Card
        
        this.init();
    }

    async init() {
        await this.initializeSquarePayments();
        this.setupEventListeners();
        this.handleUrlParams(); // Pour gérer les retours de paiement
    }

    async initializeSquarePayments() {
        try {
            // Initialiser Square Payments
            this.payments = Square.payments(
                this.squareConfig.applicationId, 
                this.squareConfig.locationId
            );
            
            // Créer l'instance de carte
            this.card = await this.payments.card();
            
            console.log('Square Payments initialisé avec succès');
        } catch (error) {
            console.error('Erreur lors de l\'initialisation de Square Payments:', error);
            this.showError('Erreur d\'initialisation du système de paiement');
        }
    }

    setupEventListeners() {
        // Boutons de soutien (2€ et 12€)
        const supportButtons = document.querySelectorAll('.support-button');
        supportButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const amount = parseFloat(button.dataset.amount);
                const type = button.dataset.type;
                this.handleSupportSelection(amount, type, button);
            });
        });

        // Input montant personnalisé
        const customAmountInput = document.getElementById('custom-amount');
        if (customAmountInput) {
            customAmountInput.addEventListener('input', (e) => {
                this.handleCustomAmountInput(e.target.value);
            });
            
            // Validation en temps réel
            customAmountInput.addEventListener('keyup', (e) => {
                this.validateCustomAmount(e.target.value);
            });
        }

        // Bouton "page suivante>>"
        const proceedButton = document.getElementById('proceed-button');
        if (proceedButton) {
            proceedButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleProceedToNext();
            });
        }

        // Formulaires existants (garder pour les phases suivantes)
        const adhesionForm = document.getElementById('adhesion-signup-form');
        const contactForm = document.getElementById('contact-signup-form');

        if (adhesionForm) {
            adhesionForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleAdhesionSubmit();
            });
        }

        if (contactForm) {
            contactForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleContactSubmit();
            });
        }

        // Initialiser l'état du bouton
        this.updateProceedButton();
    }

    handleSupportSelection(amount, type, buttonElement) {
        console.log('=== Sélection option de soutien ===');
        console.log('Montant:', amount, 'Type:', type);
        
        // Déselectionner tous les autres boutons
        document.querySelectorAll('.support-button').forEach(btn => {
            btn.classList.remove('selected');
        });
        
        // Sélectionner le bouton cliqué
        buttonElement.classList.add('selected');
        
        // Vider l'input personnalisé si une option prédéfinie est sélectionnée
        const customInput = document.getElementById('custom-amount');
        if (customInput) {
            customInput.value = '';
        }
        
        // Sauvegarder la sélection
        this.selectedSupportOption = type;
        this.selectedAmount = amount;
        
        console.log('Sélection sauvegardée:', {
            option: this.selectedSupportOption,
            amount: this.selectedAmount
        });
        
        // Mettre à jour le bouton suivant
        this.updateProceedButton();
    }

    handleCustomAmountInput(value) {
        console.log('=== Input montant personnalisé ===');
        console.log('Valeur:', value);
        
        // Déselectionner tous les boutons prédéfinis
        document.querySelectorAll('.support-button').forEach(btn => {
            btn.classList.remove('selected');
        });
        
        if (value && parseFloat(value) > 0) {
            // Sauvegarder le montant personnalisé
            this.selectedSupportOption = 'custom';
            this.selectedAmount = parseFloat(value);
            
            console.log('Montant personnalisé sauvegardé:', {
                option: this.selectedSupportOption,
                amount: this.selectedAmount
            });
        } else {
            // Réinitialiser si le champ est vide ou invalide
            this.selectedSupportOption = null;
            this.selectedAmount = null;
        }
        
        // Mettre à jour le bouton suivant
        this.updateProceedButton();
    }

    validateCustomAmount(value) {
        const customInput = document.getElementById('custom-amount');
        if (!customInput) return;
        
        const amount = parseFloat(value);
        
        // Supprimer les classes d'erreur précédentes
        customInput.classList.remove('error');
        
        if (value && (isNaN(amount) || amount < 1)) {
            customInput.classList.add('error');
            this.showError('Le montant doit être d\'au moins 1€');
        }
    }

    updateProceedButton() {
        const proceedButton = document.getElementById('proceed-button');
        if (!proceedButton) return;
        
        const isValidSelection = this.selectedSupportOption && this.selectedAmount && this.selectedAmount > 0;
        
        proceedButton.disabled = !isValidSelection;
        
        if (isValidSelection) {
            proceedButton.classList.remove('disabled');
            proceedButton.style.opacity = '1';
        } else {
            proceedButton.classList.add('disabled');
            proceedButton.style.opacity = '0.5';
        }
        
        console.log('Bouton "suivant" mis à jour:', isValidSelection ? 'activé' : 'désactivé');
    }

    handleProceedToNext() {
        console.log('=== Procéder à l\'étape suivante ===');
        console.log('Option sélectionnée:', this.selectedSupportOption);
        console.log('Montant sélectionné:', this.selectedAmount);
        
        if (!this.selectedSupportOption || !this.selectedAmount) {
            this.showError('Veuillez sélectionner un montant de soutien');
            return;
        }
        
        // Sauvegarder les données de soutien
        this.currentFormData = {
            supportType: this.selectedSupportOption,
            amount: this.selectedAmount,
            timestamp: new Date().toISOString()
        };
        
        // Toutes les options redirigent vers le formulaire d'adhésion
        console.log('Redirection vers formulaire d\'adhésion...');
            this.showAdhesionFormPhase();
    }

    showAdhesionFormPhase() {
        console.log('=== showAdhesionFormPhase appelé ===');
        
        document.body.classList.add('adhesion-phase-active');
        
        const adhesionPhase = document.getElementById('adhesion-form-phase');
        if (adhesionPhase) {
            adhesionPhase.classList.add('active');
        }
        
        this.clearAndPrepareAdhesionForm();
    }

    showContactFormPhase() {
        console.log('=== showContactFormPhase appelé ===');
        
        document.body.classList.add('contact-phase-active');
        
        const contactPhase = document.getElementById('contact-form-phase');
        if (contactPhase) {
            contactPhase.classList.add('active');
            
            // Mettre à jour le titre avec le montant sélectionné
            const formTitle = contactPhase.querySelector('.contact-form-title');
            if (formTitle && this.selectedAmount) {
                formTitle.textContent = `Soutien de ${this.selectedAmount}€ - Merci !`;
            }
        }
    }

    clearAndPrepareAdhesionForm() {
        console.log('🔧 Nettoyage du formulaire d\'adhésion...');
        
        const form = document.getElementById('adhesion-signup-form');
        if (!form) return;
        
        // Vider tous les champs
        const fields = form.querySelectorAll('input');
        fields.forEach(field => {
            field.value = '';
            field.removeAttribute('value');
        });
        
        // Désactiver l'autocomplétion
        form.setAttribute('autocomplete', 'off');
        fields.forEach(field => {
            field.setAttribute('autocomplete', 'off');
        });
        
        // Marquer le formulaire comme "non-prêt"
        form.setAttribute('data-user-filled', 'false');
        
        // Ajouter des événements pour détecter quand l'utilisateur tape
        fields.forEach(field => {
            field.addEventListener('input', () => {
                form.setAttribute('data-user-filled', 'true');
            });
        });
        
        console.log('✅ Formulaire nettoyé et préparé pour l\'utilisateur');
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

    generateMemberUid() {
        // Générer un UUID v4 comme dans index.js
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    async handleAdhesionSubmit() {
        console.log('=== DEBUT handleAdhesionSubmit ===');
        
        const form = document.getElementById('adhesion-signup-form');
        if (!form) {
            console.error('Formulaire adhesion-signup-form non trouvé !');
            this.showError('Erreur: formulaire non trouvé');
            return;
        }

        // Vérification anti-soumission automatique
        const userHasFilled = form.getAttribute('data-user-filled') === 'true';
        if (!userHasFilled) {
            console.log('⚠️ SOUMISSION BLOQUÉE: L\'utilisateur n\'a pas encore rempli le formulaire');
            return;
        }
        
        const formData = new FormData(form);
        const birthdate = formData.get('birthdate');
        const age = this.calculateAge(birthdate);
        
        // Générer un UID unique
        const memberUid = this.generateMemberUid();
        
        const memberData = {
            uid: memberUid,
            email: formData.get('email'),
            firstName: formData.get('firstname'),
            lastName: formData.get('lastname'),
            birthdate: birthdate,
            age: age,
            postalCode: formData.get('zipcode'),
            phone: formData.get('phone'),
            supportAmount: this.selectedAmount,
            supportType: this.selectedSupportOption,
            createdAt: new Date().toISOString(),
            "end-member": new Date("2025-12-31").toISOString(),
            "member-type": "fornap-soutien-manuel",
            ticketType: `Soutien ${this.selectedAmount}€`,
            paymentStatus: 'pending'
        };

        try {
            // Validation
            if (!this.validateEmail(memberData.email)) {
                this.showError('Veuillez saisir un email valide');
                return;
            }

            if (!this.validateZipCode(memberData.postalCode)) {
                this.showError('Veuillez saisir un code postal valide (5 chiffres)');
                return;
            }

            if (age < 16) {
                this.showError('Vous devez avoir au moins 16 ans pour adhérer');
                return;
            }
            
            // Sauvegarder les données dans Firebase avec l'UID généré
            console.log('💾 Sauvegarde membre dans Firebase:', memberData);
            await this.saveToFirebase('members', memberData, memberUid);
            
            // Stocker l'ID du document
            this.memberDocumentId = memberUid;
            this.currentFormData = memberData;
            
            // Afficher écran de succès directement (simulation du paiement)
            console.log('✅ Membre sauvegardé avec succès, ID:', memberUid);
            this.showMemberSuccessScreen();

        } catch (error) {
            console.error('ERREUR dans handleAdhesionSubmit:', error);
            this.showError('Une erreur est survenue. Veuillez réessayer.');
        }
    }

    async handleContactSubmit() {
        const form = document.getElementById('contact-signup-form');
        const formData = new FormData(form);
        
        const contactData = {
            type: 'supporter',
            firstname: formData.get('firstname'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            supportAmount: this.selectedAmount, // Inclure le montant de soutien
            supportType: this.selectedSupportOption,
            timestamp: new Date().toISOString()
        };

        try {
            // Validation
            if (!this.validateEmail(contactData.email)) {
                this.showError('Veuillez saisir un email valide');
                return;
            }

            // Sauvegarder en base
            await this.saveToFirebase('supporters', contactData);
            
            // Afficher l'écran de succès
            this.showContactSuccessPhase();

        } catch (error) {
            console.error('Erreur lors de l\'inscription:', error);
            this.showError('Une erreur est survenue. Veuillez réessayer.');
        }
    }

    showContactSuccessPhase() {
        // Masquer la phase de contact
        document.body.classList.remove('contact-phase-active');
        const contactPhase = document.getElementById('contact-form-phase');
        contactPhase.classList.remove('active');
        
        // Afficher la phase de succès
        document.body.classList.add('success-phase-active');
        const successPhase = document.getElementById('contact-success-phase');
        successPhase.classList.add('active');
        
        // Mettre à jour le message de succès avec le montant
        const successSubtitle = successPhase.querySelector('.success-subtitle');
        if (successSubtitle && this.selectedAmount) {
            successSubtitle.textContent = `Votre soutien de ${this.selectedAmount}€ est confirmé`;
        }
    }

    showMemberSuccessScreen() {
        // Masquer la phase d'adhésion
        document.body.classList.remove('adhesion-phase-active');
        const adhesionPhase = document.getElementById('adhesion-form-phase');
        adhesionPhase.classList.remove('active');
        
        // Afficher la phase de succès
        document.body.classList.add('success-phase-active');
        const successPhase = document.getElementById('contact-success-phase');
        successPhase.classList.add('active');
        
        console.log('🎉 Affichage écran de succès membre - Design exact reproduit');
    }

    goBackToChoice() {
        // Nettoyer toutes les phases actives
        document.body.classList.remove('adhesion-phase-active', 'contact-phase-active', 'success-phase-active');
        
        const adhesionPhase = document.getElementById('adhesion-form-phase');
        const contactPhase = document.getElementById('contact-form-phase');
        const successPhase = document.getElementById('contact-success-phase');
        
        if (adhesionPhase) adhesionPhase.classList.remove('active');
        if (contactPhase) contactPhase.classList.remove('active');
        if (successPhase) successPhase.classList.remove('active');
        
        // Réinitialiser la sélection
        this.selectedSupportOption = null;
        this.selectedAmount = null;
        this.currentFormData = null;
        
        // Déselectionner tous les boutons
        document.querySelectorAll('.support-button').forEach(btn => {
            btn.classList.remove('selected');
        });
        
        // Vider l'input personnalisé
        const customInput = document.getElementById('custom-amount');
        if (customInput) {
            customInput.value = '';
        }
        
        // Mettre à jour le bouton
        this.updateProceedButton();
    }

    async initializeSquarePayment(formData) {
        try {
            console.log('=== DEBUT initializeSquarePayment ===');
            
            const memberDocId = await this.saveToFirebase('members', {
                ...formData,
                paymentStatus: 'pending'
            });
            
            this.memberDocumentId = memberDocId;
            
            await this.showSquarePaymentForm(formData, memberDocId);
            
        } catch (error) {
            console.error('ERREUR dans initializeSquarePayment:', error);
            this.hideLoadingState();
            this.showError(`Erreur lors de l'initialisation du paiement: ${error.message}`);
        }
    }

    async showSquarePaymentForm(formData, memberDocId) {
        try {
            this.hideAllForms();
            this.hideLoadingState();
            
            let paymentContainer = document.getElementById('square-payment-form');
            if (!paymentContainer) {
                const container = document.createElement('div');
                container.id = 'square-payment-form';
                container.className = 'square-payment-container';
                container.innerHTML = `
                    <div class="payment-form-header">
                        <h2>💳 Finaliser votre soutien</h2>
                        <p>Montant : <strong>${formData.supportAmount || formData.amount || 12},00 €</strong></p>
                        <p>Supporter: ${formData.firstname} ${formData.lastname}</p>
                    </div>
                    <div id="card-container" class="card-input-container"></div>
                    <div class="payment-buttons">
                        <button id="card-button" class="payment-button" type="button" disabled>
                            💳 Payer ${formData.supportAmount || formData.amount || 12},00 €
                        </button>
                        <button id="cancel-payment" class="secondary-button" type="button">
                            ❌ Annuler
                        </button>
                    </div>
                    <div id="payment-status" class="payment-status">
                        <p>🔒 Paiement sécurisé par Square</p>
                    </div>
                `;
                
                document.body.appendChild(container);
                paymentContainer = container;
            }
        
            paymentContainer.classList.remove('hidden');
            
            // Détruire l'ancienne instance de carte
            try {
                if (this.card) {
                    await this.card.destroy();
                }
            } catch (error) {
                console.log('Aucune carte à détruire:', error.message);
            }
            
            // Créer une nouvelle instance de carte
            this.card = await this.payments.card();
            await this.card.attach('#card-container');
            
            // Activer le bouton de paiement
            const cardButton = document.getElementById('card-button');
            cardButton.disabled = false;
            
            // Configurer les événements
            this.setupSquarePaymentEvents(formData, memberDocId);
            
        } catch (error) {
            console.error('❌ Erreur lors de l\'affichage du formulaire Square:', error);
            this.showError(`Erreur d'affichage du paiement: ${error.message}`);
            throw error;
        }
    }

    setupSquarePaymentEvents(formData, memberDocId) {
        const cardButton = document.getElementById('card-button');
        const cancelButton = document.getElementById('cancel-payment');
        const statusDiv = document.getElementById('payment-status');
        
        cardButton.addEventListener('click', async () => {
            try {
                cardButton.disabled = true;
                cardButton.textContent = '⏳ Traitement...';
                statusDiv.innerHTML = '<div class="loading">💳 Tokenisation en cours...</div>';
                
                const amount = formData.supportAmount || formData.amount || 12;
                
                const verificationDetails = {
                    amount: amount.toFixed(2),
                    currencyCode: 'EUR',
                    intent: 'CHARGE',
                    customerInitiated: true,
                    sellerKeyedIn: false,
                    billingContact: {
                        givenName: formData.firstname,
                        familyName: formData.lastname,
                        email: formData.email,
                        phone: formData.phone || '',
                        addressLines: [],
                        city: '',
                        state: '',
                        postalCode: formData.zipcode,
                        countryCode: 'FR'
                    }
                };
                
                const tokenResult = await this.card.tokenize(verificationDetails);
                
                if (tokenResult.status === 'OK') {
                    statusDiv.innerHTML = '<div class="loading">💰 Traitement du paiement...</div>';
                    await this.processSquarePayment(tokenResult.token, verificationDetails, memberDocId);
                } else {
                    throw new Error(`Tokenisation échouée: ${tokenResult.status}`);
                }
                
            } catch (error) {
                console.error('❌ Erreur lors du paiement:', error);
                statusDiv.innerHTML = `<div class="error">❌ Erreur: ${error.message}</div>`;
                cardButton.disabled = false;
                cardButton.textContent = `💳 Payer ${formData.supportAmount || 12},00 €`;
            }
        });
        
        cancelButton.addEventListener('click', async () => {
            await this.handlePaymentCancellation();
        });
    }

    async processSquarePayment(paymentToken, verificationDetails, memberDocId) {
        try {
            const backendUrl = this.detectBackendUrl();
            
            if (backendUrl) {
                await this.processRealSquarePayment(backendUrl, paymentToken, verificationDetails, memberDocId);
            } else {
                await this.processSimulatedPayment(paymentToken, verificationDetails, memberDocId);
            }
            
        } catch (error) {
            console.error('Erreur lors du traitement du paiement:', error);
            throw error;
        }
    }

    detectBackendUrl() {
        const hostname = window.location.hostname;
        
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return 'http://localhost:3000';
        } else if (hostname.includes('4nap.fr') || hostname.includes('fornap')) {
            return 'https://api.4nap.fr:3000';
        }
        
        return null;
    }

    async processSimulatedPayment(paymentToken, verificationDetails, memberDocId) {
        try {
            console.log('🎭 MODE DÉMO - Simulation de paiement');
            
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const cardNumber = paymentToken.includes('0002') ? 'declined' : 'success';
            
            if (cardNumber === 'declined') {
                throw new Error('Carte refusée (simulation)');
            }
            
            await this.saveToFirebase('members', {
                ...this.currentFormData,
                paymentStatus: 'simulated',
                paymentToken: paymentToken,
                paymentMethod: 'square-demo',
                paymentDate: new Date().toISOString(),
                note: 'Paiement simulé - Aucun montant débité'
            }, memberDocId);
            
            await this.handlePaymentSuccess('demo-payment-' + Date.now(), memberDocId);
            
        } catch (error) {
            console.error('❌ Erreur simulation:', error);
            throw error;
        }
    }

    async handlePaymentCancellation() {
        try {
            if (this.card) {
                await this.card.destroy();
                this.card = null;
            }
        } catch (error) {
            console.log('Erreur lors de la destruction de la carte:', error.message);
        }
        
        const paymentContainer = document.getElementById('square-payment-form');
        if (paymentContainer) {
            paymentContainer.classList.add('hidden');
        }
        
        this.goBackToChoice();
    }

    async handlePaymentSuccess(sessionId, memberId) {
        console.log('Paiement réussi, session:', sessionId, 'memberId:', memberId);
        
        try {
            this.memberDocumentId = memberId || this.memberDocumentId || 'member-' + Date.now();
            
            const successData = {
                id: this.memberDocumentId,
                sessionId: sessionId,
                amount: this.selectedAmount,
                timestamp: new Date().toISOString()
            };
            
            this.hideAllForms();
            this.showContactSuccessPhase();
            
        } catch (error) {
            console.error('Erreur lors du traitement du succès:', error);
            this.hideAllForms();
            this.showContactSuccessPhase();
        }
    }

    hideAllForms() {
        const forms = ['interested-form', 'member-form'];
        const successes = ['success-interested', 'success-member'];
        const others = ['helloasso-checkout', 'payment-loading', 'square-payment-form'];
        
        forms.concat(successes).concat(others).forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.classList.add('hidden');
            }
        });
    }

    hideLoadingState() {
        const loadingElement = document.getElementById('payment-loading');
        if (loadingElement) {
            loadingElement.classList.add('hidden');
        }
    }

    handleUrlParams() {
        const urlParams = new URLSearchParams(window.location.search);
        const status = urlParams.get('status');
        const sessionId = urlParams.get('session_id');
        const memberId = urlParams.get('memberid');
        
        if (status) {
            switch (status) {
                case 'success':
                    this.handlePaymentSuccess(sessionId, memberId);
                    break;
                case 'cancelled':
                    this.handlePaymentCancelled();
                    break;
                case 'error':
                    this.handlePaymentError();
                    break;
            }
            
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }

    handlePaymentCancelled() {
        this.hideLoadingState();
        this.showError('Paiement annulé. Vous pouvez réessayer quand vous le souhaitez.');
        setTimeout(() => {
            this.goBackToChoice();
        }, 3000);
    }

    handlePaymentError() {
        this.hideLoadingState();
        this.showError('Une erreur est survenue lors du paiement. Veuillez réessayer.');
            setTimeout(() => {
            this.goBackToChoice();
        }, 3000);
    }

    async saveToFirebase(collectionName, data, docId = null) {
        try {
            if (docId) {
                // Utiliser setDoc avec l'ID spécifié (comme dans index.js)
                const docRef = window.doc(window.db, collectionName, docId);
                await window.setDoc(docRef, data);
                console.log(`✅ Document sauvegardé dans ${collectionName} avec ID: ${docId}`);
                return docId;
            } else {
                // Créer un nouveau document avec auto-ID
                const docRef = await window.addDoc(window.collection(window.db, collectionName), data);
                console.log(`✅ Document créé dans ${collectionName} avec ID: ${docRef.id}`);
                return docRef.id;
            }
        } catch (error) {
            console.error('❌ Erreur Firebase:', error);
            throw error;
        }
    }

    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    validateZipCode(zipcode) {
        const zipcodeRegex = /^[0-9]{5}$/;
        return zipcodeRegex.test(zipcode);
    }

    showError(message) {
        let errorElement = document.querySelector('.error-message');
        if (!errorElement) {
            errorElement = document.createElement('div');
            errorElement.className = 'error-message';
            document.querySelector('.content-wrapper').prepend(errorElement);
        }
        
        errorElement.textContent = message;
        errorElement.style.display = 'block';
        
        setTimeout(() => {
            errorElement.style.display = 'none';
        }, 5000);
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.memberSignupInstance = new MemberSignup();
    
    // Expose methods for navigation
    window.goBackToChoice = () => window.memberSignupInstance.goBackToChoice();
}); 