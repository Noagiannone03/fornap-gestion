/**
 * FOR+NAP Admin Panel
 * Gestion professionnelle des membres du festival
 */

class AdminPanel {
    constructor() {
        this.db = null;
        this.members = [];
        this.filteredMembers = [];
        this.interested = [];
        this.filteredInterested = [];
        this.currentTab = 'members';
        this.currentPage = 1;
        this.currentPageInterested = 1;
        this.pageSize = 20;
        this.sortField = 'createdAt';
        this.sortDirection = 'desc';
        this.sortFieldInterested = 'timestamp';
        this.sortDirectionInterested = 'desc';
        this.filters = {
            search: '',
            memberType: '',
            dateRange: ''
        };
        this.interestedFilters = {
            search: '',
            dateRange: '',
            phone: ''
        };
        
        this.init();
    }

    async init() {
        try {
            // Attendre que Firebase soit initialisé
            await this.waitForFirebase();
            
            // Initialiser les événements
            this.initEventListeners();
            
            // Charger les données
            await Promise.all([
                this.loadMembers(),
                this.loadInterested()
            ]);
            
            // Masquer le loading
            this.hideLoading();
            
            this.showToast('Panel admin initialisé avec succès', 'success');
        } catch (error) {
            console.error('Erreur lors de l\'initialisation:', error);
            this.showToast('Erreur lors du chargement des données', 'error');
            this.hideLoading();
        }
    }

    async waitForFirebase() {
        return new Promise((resolve) => {
            const checkFirebase = () => {
                if (window.firebaseDB) {
                    this.db = window.firebaseDB;
                    resolve();
                } else {
                    setTimeout(checkFirebase, 100);
                }
            };
            checkFirebase();
        });
    }

    initEventListeners() {
        // Onglets
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.currentTarget.dataset.tab;
                this.switchTab(tab);
            });
        });

        // Recherche - Membres
        const searchInput = document.getElementById('searchInput');
        searchInput.addEventListener('input', this.debounce((e) => {
            this.filters.search = e.target.value.toLowerCase();
            this.applyFilters();
        }, 300));

        // Recherche - Intéressés
        const searchInterestedInput = document.getElementById('searchInterestedInput');
        searchInterestedInput.addEventListener('input', this.debounce((e) => {
            this.interestedFilters.search = e.target.value.toLowerCase();
            this.applyInterestedFilters();
        }, 300));

        // Filtres
        document.getElementById('memberTypeFilter').addEventListener('change', (e) => {
            this.filters.memberType = e.target.value;
            this.applyFilters();
        });

        document.getElementById('dateFilter').addEventListener('change', (e) => {
            this.filters.dateRange = e.target.value;
            this.applyFilters();
        });

        // Filtres - Intéressés
        document.getElementById('interestedDateFilter').addEventListener('change', (e) => {
            this.interestedFilters.dateRange = e.target.value;
            this.applyInterestedFilters();
        });

        document.getElementById('phoneFilter').addEventListener('change', (e) => {
            this.interestedFilters.phone = e.target.value;
            this.applyInterestedFilters();
        });

        // Boutons d'action
        document.getElementById('refreshBtn').addEventListener('click', () => {
            if (this.currentTab === 'members') {
                this.loadMembers();
            } else {
                this.loadInterested();
            }
        });

        document.getElementById('exportBtn').addEventListener('click', () => {
            this.exportToCSV();
        });

        // Bouton d'export des emails des intéressés
        document.getElementById('exportInterestedEmailsBtn').addEventListener('click', () => {
            this.exportInterestedEmails();
        });

        // Pagination
        document.getElementById('prevPage').addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.renderTable();
            }
        });

        document.getElementById('nextPage').addEventListener('click', () => {
            const totalPages = Math.ceil(this.filteredMembers.length / this.pageSize);
            if (this.currentPage < totalPages) {
                this.currentPage++;
                this.renderTable();
            }
        });

        // Pagination - Intéressés
        document.getElementById('prevPageInterested').addEventListener('click', () => {
            if (this.currentPageInterested > 1) {
                this.currentPageInterested--;
                this.renderInterestedTable();
            }
        });

        document.getElementById('nextPageInterested').addEventListener('click', () => {
            const totalPages = Math.ceil(this.filteredInterested.length / this.pageSize);
            if (this.currentPageInterested < totalPages) {
                this.currentPageInterested++;
                this.renderInterestedTable();
            }
        });

        // Modal
        document.getElementById('closeModal').addEventListener('click', () => {
            this.closeModal();
        });

        document.getElementById('memberModal').addEventListener('click', (e) => {
            if (e.target.id === 'memberModal') {
                this.closeModal();
            }
        });

        // Bouton renvoyer email
        document.getElementById('resendEmail').addEventListener('click', () => {
            this.resendMemberEmail();
        });

        // Tri des colonnes
        document.querySelectorAll('th[data-sort]').forEach(th => {
            th.addEventListener('click', () => {
                const field = th.dataset.sort;
                if (this.sortField === field) {
                    this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
                } else {
                    this.sortField = field;
                    this.sortDirection = 'asc';
                }
                this.applySort();
                this.updateSortIcons();
            });
        });
    }

    async loadMembers() {
        try {
            this.showLoading();
            
            // Import des fonctions Firestore
            const { collection, getDocs, orderBy, query } = await import('https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js');
            
            // Requête pour récupérer tous les membres
            const membersQuery = query(
                collection(this.db, 'members'),
                orderBy('createdAt', 'desc')
            );
            
            const snapshot = await getDocs(membersQuery);
            this.members = [];
            
            const allMembers = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                allMembers.push({
                    id: doc.id,
                    ...data,
                    // Convertir les timestamps en dates de manière robuste
                    createdAt: this.convertToDate(data.createdAt),
                    'end-member': this.convertToDate(data['end-member']) || new Date('2025-12-31')
                });
            });

            // Déduplication par email - garder le plus récent
            this.members = this.deduplicateByEmail(allMembers);

            console.log(`${allMembers.length} documents trouvés, ${this.members.length} membres uniques après déduplication`);
            
            this.applyFilters();
            this.updateStats();
            this.updateTabCounts();
            this.renderTable();
            
        } catch (error) {
            console.error('Erreur lors du chargement des membres:', error);
            this.showToast('Erreur lors du chargement des données', 'error');
        } finally {
            this.hideLoading();
        }
    }

    async loadInterested() {
        try {
            // Import des fonctions Firestore
            const { collection, getDocs, orderBy, query } = await import('https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js');
            
            // Requête pour récupérer tous les intéressés
            const interestedQuery = query(
                collection(this.db, 'interested_users'),
                orderBy('timestamp', 'desc')
            );
            
            const snapshot = await getDocs(interestedQuery);
            const allInterested = [];
            
            snapshot.forEach((doc) => {
                const data = doc.data();
                allInterested.push({
                    id: doc.id,
                    ...data,
                    // Convertir le timestamp en date de manière robuste
                    timestamp: this.convertToDate(data.timestamp)
                });
            });

            // Déduplication par email - garder le plus récent
            this.interested = this.deduplicateInterestedByEmail(allInterested);

            console.log(`${allInterested.length} intéressés trouvés, ${this.interested.length} intéressés uniques après déduplication`);
            
            this.applyInterestedFilters();
            this.updateInterestedStats();
            this.updateTabCounts();
            if (this.currentTab === 'interested') {
                this.renderInterestedTable();
            }
            
        } catch (error) {
            console.error('Erreur lors du chargement des intéressés:', error);
            this.showToast('Erreur lors du chargement des intéressés', 'error');
        }
    }

    switchTab(tab) {
        this.currentTab = tab;
        
        // Mettre à jour les boutons d'onglets
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
        
        // Mettre à jour le contenu
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tab}Tab`).classList.add('active');
        
        // Rendre le tableau approprié
        if (tab === 'members') {
            this.renderTable();
        } else {
            this.renderInterestedTable();
        }
    }

    deduplicateInterestedByEmail(interested) {
        const emailMap = new Map();
        
        interested.forEach(person => {
            const email = person.email?.toLowerCase();
            if (!email) return; // Ignorer les personnes sans email
            
            const existing = emailMap.get(email);
            if (!existing || person.timestamp > existing.timestamp) {
                emailMap.set(email, person);
            }
        });
        
        return Array.from(emailMap.values());
    }

    applyFilters() {
        let filtered = [...this.members];

        // Filtre de recherche
        if (this.filters.search) {
            filtered = filtered.filter(member => 
                member.firstName?.toLowerCase().includes(this.filters.search) ||
                member.lastName?.toLowerCase().includes(this.filters.search) ||
                member.email?.toLowerCase().includes(this.filters.search)
            );
        }

        // Filtre type de membre
        if (this.filters.memberType) {
            filtered = filtered.filter(member => {
                if (this.filters.memberType === 'adhesion-annuel') {
                    return member.ticketType && member.ticketType.trim().toLowerCase() === 'adhésion annuelle';
                }
                return member['member-type'] === this.filters.memberType;
            });
        }

        // Filtre date
        if (this.filters.dateRange) {
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            
            filtered = filtered.filter(member => {
                const memberDate = new Date(member.createdAt);
                const memberDay = new Date(memberDate.getFullYear(), memberDate.getMonth(), memberDate.getDate());
                
                switch (this.filters.dateRange) {
                    case 'today':
                        return memberDay.getTime() === today.getTime();
                    case 'week':
                        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
                        return memberDay >= weekAgo;
                    case 'month':
                        const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
                        return memberDay >= monthAgo;
                    default:
                        return true;
                }
            });
        }

        this.filteredMembers = filtered;
        this.currentPage = 1;
        this.applySort();
        this.renderTable();
        this.updateResultsCount();
    }

    applySort() {
        this.filteredMembers.sort((a, b) => {
            let aValue = a[this.sortField];
            let bValue = b[this.sortField];

            // Gestion des dates
            if (aValue instanceof Date && bValue instanceof Date) {
                aValue = aValue.getTime();
                bValue = bValue.getTime();
            }

            // Gestion des strings
            if (typeof aValue === 'string' && typeof bValue === 'string') {
                aValue = aValue.toLowerCase();
                bValue = bValue.toLowerCase();
            }

            let result = 0;
            if (aValue < bValue) result = -1;
            if (aValue > bValue) result = 1;

            return this.sortDirection === 'desc' ? -result : result;
        });
    }

    applyInterestedFilters() {
        let filtered = [...this.interested];

        // Filtre de recherche
        if (this.interestedFilters.search) {
            filtered = filtered.filter(person => 
                person.firstname?.toLowerCase().includes(this.interestedFilters.search) ||
                person.email?.toLowerCase().includes(this.interestedFilters.search)
            );
        }

        // Filtre téléphone
        if (this.interestedFilters.phone) {
            if (this.interestedFilters.phone === 'with') {
                filtered = filtered.filter(person => person.phone && person.phone.trim() !== '');
            } else if (this.interestedFilters.phone === 'without') {
                filtered = filtered.filter(person => !person.phone || person.phone.trim() === '');
            }
        }

        // Filtre date
        if (this.interestedFilters.dateRange) {
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            
            filtered = filtered.filter(person => {
                const personDate = new Date(person.timestamp);
                const personDay = new Date(personDate.getFullYear(), personDate.getMonth(), personDate.getDate());
                
                switch (this.interestedFilters.dateRange) {
                    case 'today':
                        return personDay.getTime() === today.getTime();
                    case 'week':
                        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
                        return personDay >= weekAgo;
                    case 'month':
                        const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
                        return personDay >= monthAgo;
                    default:
                        return true;
                }
            });
        }

        this.filteredInterested = filtered;
        this.currentPageInterested = 1;
        this.applyInterestedSort();
        this.renderInterestedTable();
        this.updateInterestedResultsCount();
    }

    applyInterestedSort() {
        this.filteredInterested.sort((a, b) => {
            let aValue = a[this.sortFieldInterested];
            let bValue = b[this.sortFieldInterested];

            // Gestion des dates
            if (aValue instanceof Date && bValue instanceof Date) {
                aValue = aValue.getTime();
                bValue = bValue.getTime();
            }

            // Gestion des strings
            if (typeof aValue === 'string' && typeof bValue === 'string') {
                aValue = aValue.toLowerCase();
                bValue = bValue.toLowerCase();
            }

            let result = 0;
            if (aValue < bValue) result = -1;
            if (aValue > bValue) result = 1;

            return this.sortDirectionInterested === 'desc' ? -result : result;
        });
    }

    renderTable() {
        const tbody = document.getElementById('membersTableBody');
        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = startIndex + this.pageSize;
        const pageMembers = this.filteredMembers.slice(startIndex, endIndex);

        tbody.innerHTML = '';

        pageMembers.forEach(member => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <div class="member-name">${this.escapeHtml(member.firstName || '')} ${this.escapeHtml(member.lastName || '')}</div>
                </td>
                <td>
                    <div class="member-email">${this.escapeHtml(member.email || '')}</div>
                </td>
                <td>
                    <div class="member-end-date ${this.getDateStatus(member['end-member'])}">${this.formatDateShort(member['end-member'])}</div>
                </td>
                <td>
                    <div class="member-date">${this.formatDate(member.createdAt)}</div>
                </td>
                <td>
                    <div class="member-type">${this.escapeHtml(this.getDisplayMemberType(member))}</div>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-action view" title="Voir détails" onclick="adminPanel.viewMember('${member.id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });

        this.updatePagination();
    }

    renderInterestedTable() {
        const tbody = document.getElementById('interestedTableBody');
        const startIndex = (this.currentPageInterested - 1) * this.pageSize;
        const endIndex = startIndex + this.pageSize;
        const pageInterested = this.filteredInterested.slice(startIndex, endIndex);

        tbody.innerHTML = '';

        pageInterested.forEach(person => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <div class="member-name">${this.escapeHtml(person.firstname || 'N/A')}</div>
                </td>
                <td>
                    <div class="member-email">${this.escapeHtml(person.email || '')}</div>
                </td>
                <td>
                    <div class="phone-display">${this.formatPhone(person.phone)}</div>
                </td>
                <td>
                    <div class="member-date">${this.formatDate(person.timestamp)}</div>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-action view" title="Voir détails" onclick="adminPanel.viewInterested('${person.id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-action card" title="Inviter" onclick="adminPanel.inviteInterested('${person.id}')">
                            <i class="fas fa-envelope"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });

        this.updateInterestedPagination();
    }

    updateStats() {
        const total = this.members.length;
        const today = this.getTodayMembers();
        const festival = this.members.filter(m => 
            m['member-type'] === '4nap-festival' || 
            (m.ticketType && m.ticketType.trim().toLowerCase() === 'adhésion annuelle')
        ).length;
        const active = this.getActiveMembers();

        document.getElementById('totalMembers').textContent = total.toLocaleString();
        document.getElementById('todayMembers').textContent = today.toLocaleString();
        document.getElementById('festivalMembers').textContent = festival.toLocaleString();
        document.getElementById('activeMembers').textContent = active.toLocaleString();
    }

    updateInterestedStats() {
        const total = this.interested.length;
        const today = this.getTodayInterested();
        const week = this.getWeekInterested();
        const withPhone = this.getInterestedWithPhone();

        document.getElementById('totalInterested').textContent = total.toLocaleString();
        document.getElementById('todayInterested').textContent = today.toLocaleString();
        document.getElementById('weekInterested').textContent = week.toLocaleString();
        document.getElementById('phoneInterested').textContent = withPhone.toLocaleString();
    }

    updateTabCounts() {
        document.getElementById('membersCount').textContent = this.members.length;
        document.getElementById('interestedCount').textContent = this.interested.length;
    }

    getTodayMembers() {
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
        
        return this.members.filter(member => {
            const memberDate = new Date(member.createdAt);
            return memberDate >= startOfDay && memberDate < endOfDay;
        }).length;
    }

    getActiveMembers() {
        const now = new Date();
        return this.members.filter(member => {
            const endDate = new Date(member['end-member']);
            return endDate > now;
        }).length;
    }

    getTodayInterested() {
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
        
        return this.interested.filter(person => {
            const personDate = new Date(person.timestamp);
            return personDate >= startOfDay && personDate < endOfDay;
        }).length;
    }

    getWeekInterested() {
        const today = new Date();
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        
        return this.interested.filter(person => {
            const personDate = new Date(person.timestamp);
            return personDate >= weekAgo;
        }).length;
    }

    getInterestedWithPhone() {
        return this.interested.filter(person => 
            person.phone && person.phone.trim() !== ''
        ).length;
    }

    updateResultsCount() {
        const count = this.filteredMembers.length;
        const text = count === 1 ? '1 membre' : `${count.toLocaleString()} membres`;
        document.getElementById('resultsCount').textContent = text;
    }

    updateInterestedResultsCount() {
        const count = this.filteredInterested.length;
        const text = count === 1 ? '1 intéressé' : `${count.toLocaleString()} intéressés`;
        document.getElementById('interestedResultsCount').textContent = text;
    }

    updateInterestedPagination() {
        const totalPages = Math.ceil(this.filteredInterested.length / this.pageSize);
        
        document.getElementById('currentPageInterested').textContent = this.currentPageInterested;
        document.getElementById('totalPagesInterested').textContent = totalPages;
        
        document.getElementById('prevPageInterested').disabled = this.currentPageInterested <= 1;
        document.getElementById('nextPageInterested').disabled = this.currentPageInterested >= totalPages;
    }

    updatePagination() {
        const totalPages = Math.ceil(this.filteredMembers.length / this.pageSize);
        
        document.getElementById('currentPage').textContent = this.currentPage;
        document.getElementById('totalPages').textContent = totalPages;
        
        document.getElementById('prevPage').disabled = this.currentPage <= 1;
        document.getElementById('nextPage').disabled = this.currentPage >= totalPages;
    }

    updateSortIcons() {
        // Reset tous les icônes
        document.querySelectorAll('.sort-icon').forEach(icon => {
            icon.className = 'fas fa-sort sort-icon';
        });

        // Mettre à jour l'icône actuel
        const activeHeader = document.querySelector(`th[data-sort="${this.sortField}"]`);
        if (activeHeader) {
            const icon = activeHeader.querySelector('.sort-icon');
            icon.className = `fas fa-sort-${this.sortDirection === 'asc' ? 'up' : 'down'} sort-icon`;
            activeHeader.classList.add('sorted');
        }
    }

    viewMember(memberId) {
        const member = this.members.find(m => m.id === memberId);
        if (!member) return;

        // Stocker l'ID du membre pour pouvoir l'utiliser dans les actions
        this.currentMemberIdInModal = memberId;

        const modal = document.getElementById('memberModal');
        const details = document.getElementById('memberDetails');
        
        details.innerHTML = `
            <div class="member-detail-grid">
                <div class="detail-group">
                    <div class="detail-label">Nom complet</div>
                    <div class="detail-value">${this.escapeHtml(member.firstName || '')} ${this.escapeHtml(member.lastName || '')}</div>
                </div>
                <div class="detail-group">
                    <div class="detail-label">Email</div>
                    <div class="detail-value">${this.escapeHtml(member.email || '')}</div>
                </div>
                <div class="detail-group">
                    <div class="detail-label">Type de billet</div>
                    <div class="detail-value">${this.escapeHtml(member.ticketType || 'N/A')}</div>
                </div>
                <div class="detail-group">
                    <div class="detail-label">Type de membre</div>
                    <div class="detail-value">${this.escapeHtml(this.getDisplayMemberType(member))}</div>
                </div>
                <div class="detail-group">
                    <div class="detail-label">Code postal</div>
                    <div class="detail-value">${this.escapeHtml(member.postalCode || 'N/A')}</div>
                </div>
                <div class="detail-group">
                    <div class="detail-label">Date de naissance</div>
                    <div class="detail-value">${this.escapeHtml(member.birthDate || 'N/A')}</div>
                </div>
                <div class="detail-group">
                    <div class="detail-label">Téléphone</div>
                    <div class="detail-value">${this.escapeHtml(member.phone || 'N/A')}</div>
                </div>
                <div class="detail-group">
                    <div class="detail-label">Date d'inscription</div>
                    <div class="detail-value">${this.formatDate(member.createdAt)}</div>
                </div>
                <div class="detail-group">
                    <div class="detail-label">Fin d'adhésion</div>
                    <div class="detail-value">${this.formatDate(member['end-member'])}</div>
                </div>
                <div class="detail-group">
                    <div class="detail-label">ID Unique</div>
                    <div class="detail-value">${this.escapeHtml(member.uid || member.id)}</div>
                </div>
                <div class="qr-code-display">
                    <div class="detail-label">QR Code Membre</div>
                    <div style="font-family: monospace; padding: 10px; background: #333; border-radius: 4px; margin-top: 10px;">
                        FORNAP-MEMBER:${this.escapeHtml(member.uid || member.id)}
                    </div>
                </div>
            </div>
        `;
        
        modal.classList.add('show');
    }

    viewInterested(personId) {
        const person = this.interested.find(p => p.id === personId);
        if (!person) return;

        const modal = document.getElementById('memberModal');
        const details = document.getElementById('memberDetails');
        
        details.innerHTML = `
            <div class="member-detail-grid">
                <div class="detail-group">
                    <div class="detail-label">Prénom</div>
                    <div class="detail-value">${this.escapeHtml(person.firstname || 'N/A')}</div>
                </div>
                <div class="detail-group">
                    <div class="detail-label">Email</div>
                    <div class="detail-value">${this.escapeHtml(person.email || '')}</div>
                </div>
                <div class="detail-group">
                    <div class="detail-label">Téléphone</div>
                    <div class="detail-value">${this.formatPhone(person.phone)}</div>
                </div>
                <div class="detail-group">
                    <div class="detail-label">Type</div>
                    <div class="detail-value">${this.escapeHtml(person.type || 'N/A')}</div>
                </div>
                <div class="detail-group">
                    <div class="detail-label">Date d'intérêt</div>
                    <div class="detail-value">${this.formatDate(person.timestamp)}</div>
                </div>
                <div class="detail-group">
                    <div class="detail-label">ID Unique</div>
                    <div class="detail-value">${this.escapeHtml(person.id)}</div>
                </div>
            </div>
        `;
        
        modal.classList.add('show');
    }

    async inviteInterested(personId) {
        try {
            this.showToast('Envoi d\'invitation en cours...', 'info');
            
            // Ici, tu pourrais appeler une Cloud Function pour envoyer une invitation
            // Pour l'instant, on simule juste
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            this.showToast('Invitation envoyée avec succès', 'success');
        } catch (error) {
            console.error('Erreur lors de l\'envoi:', error);
            this.showToast('Erreur lors de l\'envoi de l\'invitation', 'error');
        }
    }

    closeModal() {
        document.getElementById('memberModal').classList.remove('show');
        this.currentMemberIdInModal = null; // Nettoyer l'ID stocké
    }



    async resendMemberEmail() {
        try {
            // Récupérer l'ID du membre actuellement affiché
            if (!this.currentMemberIdInModal) {
                this.showToast('Impossible de récupérer les informations du membre', 'error');
                return;
            }

            this.showToast('Envoi de l\'email en cours...', 'info');
            
            // Appeler la Cloud Function pour renvoyer l'email
            const response = await fetch('https://us-central1-nap-7aa80.cloudfunctions.net/resendMemberEmail', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    memberId: this.currentMemberIdInModal
                })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                this.showToast(`Email renvoyé avec succès à ${result.memberEmail}`, 'success');
            } else {
                throw new Error(result.message || 'Erreur lors du renvoi de l\'email');
            }
            
        } catch (error) {
            console.error('Erreur lors du renvoi de l\'email:', error);
            this.showToast(`Erreur lors du renvoi de l'email: ${error.message}`, 'error');
        }
    }

    exportToCSV() {
        const headers = ['Prénom', 'Nom', 'Email', 'Type de membre', 'Code postal', 'Date de naissance', 'Téléphone', 'Date d\'inscription', 'Fin d\'adhésion', 'UID'];
        
        const csvContent = [
            headers.join(','),
            ...this.filteredMembers.map(member => [
                this.escapeCSV(member.firstName || ''),
                this.escapeCSV(member.lastName || ''),
                this.escapeCSV(member.email || ''),
                this.escapeCSV(this.getDisplayMemberType(member)),
                this.escapeCSV(member.postalCode || ''),
                this.escapeCSV(member.birthDate || ''),
                this.escapeCSV(member.phone || ''),
                this.formatDate(member.createdAt),
                this.formatDate(member['end-member']),
                this.escapeCSV(member.uid || member.id)
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `fornap-membres-${this.formatDateForFilename(new Date())}.csv`;
        link.click();
        
        this.showToast('Export CSV téléchargé avec succès', 'success');
    }

    exportInterestedEmails() {
        if (this.filteredInterested.length === 0) {
            this.showToast('Aucun interesse a exporter', 'warning');
            return;
        }

        try {
            // Créer un workbook Excel
            const wb = XLSX.utils.book_new();
            
            // Préparer les données avec en-têtes
            const worksheetData = [
                ['Prénom', 'Email', 'Téléphone', 'Date d\'intérêt'] // En-têtes
            ];
            
            // Ajouter les données des intéressés
            this.filteredInterested.forEach(person => {
                worksheetData.push([
                    person.firstname || '',
                    person.email || '',
                    person.phone || 'Non renseigné',
                    this.formatDateShort(person.timestamp)
                ]);
            });
            
            // Créer la feuille de calcul
            const ws = XLSX.utils.aoa_to_sheet(worksheetData);
            
            // Définir la largeur des colonnes
            ws['!cols'] = [
                { width: 20 }, // Prénom
                { width: 35 }, // Email
                { width: 15 }, // Téléphone
                { width: 12 }  // Date
            ];
            
            // Style pour l'en-tête (en gras)
            const headerRange = XLSX.utils.decode_range(ws['!ref']);
            for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
                const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
                if (!ws[cellAddress]) continue;
                ws[cellAddress].s = {
                    font: { bold: true },
                    fill: { fgColor: { rgb: "E0E0E0" } }
                };
            }
            
            // Ajouter la feuille au workbook
            XLSX.utils.book_append_sheet(wb, ws, "Personnes Intéressées");
            
            // Créer et télécharger le fichier Excel
            const fileName = `donnees-interesses-${this.formatDateForFilename(new Date())}.xlsx`;
            XLSX.writeFile(wb, fileName);
            
            this.showToast(`${this.filteredInterested.length} personnes exportees avec succes !`, 'success');
            
        } catch (error) {
            console.error('Erreur lors de l\'export Excel:', error);
            this.showToast('Erreur lors de l\'export Excel', 'error');
        }
    }

    getActiveInterestedFiltersDescription() {
        const filters = [];
        
        if (this.interestedFilters.search) {
            filters.push(`Recherche: "${this.interestedFilters.search}"`);
        }
        
        if (this.interestedFilters.dateRange) {
            const dateLabels = {
                'today': 'Aujourd\'hui',
                'week': 'Cette semaine',
                'month': 'Ce mois'
            };
            filters.push(`Période: ${dateLabels[this.interestedFilters.dateRange]}`);
        }
        
        if (this.interestedFilters.phone) {
            const phoneLabels = {
                'with': 'Avec téléphone',
                'without': 'Sans téléphone'
            };
            filters.push(`Téléphone: ${phoneLabels[this.interestedFilters.phone]}`);
        }
        
        return filters.length > 0 ? filters.join(', ') : 'Aucun filtre';
    }

    // Déduplication par email - garde le membre le plus récent
    deduplicateByEmail(members) {
        const emailMap = new Map();
        
        members.forEach(member => {
            const email = member.email?.toLowerCase();
            if (!email) return; // Ignorer les membres sans email
            
            const existing = emailMap.get(email);
            if (!existing || member.createdAt > existing.createdAt) {
                emailMap.set(email, member);
            }
        });
        
        return Array.from(emailMap.values());
    }

    // Utilitaires
    getDisplayMemberType(member) {
        // Si le ticketType contient "Adhésion annuelle" (avec gestion des espaces), afficher "adhésion annuel"
        if (member.ticketType && member.ticketType.trim().toLowerCase() === 'adhésion annuelle') {
            return 'adhésion annuel';
        }
        
        // Sinon, utiliser le member-type existant
        return member['member-type'] || 'N/A';
    }

    convertToDate(value) {
        if (!value) return new Date();
        
        // Si c'est déjà une Date
        if (value instanceof Date) return value;
        
        // Si c'est un Timestamp Firestore
        if (value && typeof value.toDate === 'function') {
            return value.toDate();
        }
        
        // Si c'est un string ou un nombre
        if (typeof value === 'string' || typeof value === 'number') {
            const date = new Date(value);
            return isNaN(date.getTime()) ? new Date() : date;
        }
        
        // Si c'est un objet avec des propriétés seconds/nanoseconds (Timestamp sérialisé)
        if (value && typeof value === 'object' && value.seconds) {
            return new Date(value.seconds * 1000 + (value.nanoseconds || 0) / 1000000);
        }
        
        // Par défaut, retourner une nouvelle date
        return new Date();
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return String(text).replace(/[&<>"']/g, m => map[m]);
    }

    escapeCSV(text) {
        const str = String(text);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    }

    formatDate(date) {
        if (!date) return 'N/A';
        const d = new Date(date);
        return new Intl.DateTimeFormat('fr-FR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        }).format(d);
    }

    formatDateShort(date) {
        if (!date) return 'N/A';
        const d = new Date(date);
        return new Intl.DateTimeFormat('fr-FR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).format(d);
    }

    formatPhone(phone) {
        if (!phone || phone.trim() === '') return 'Non renseigné';
        return this.escapeHtml(phone);
    }

    getDateStatus(date) {
        if (!date) return '';
        
        const now = new Date();
        const endDate = new Date(date);
        const daysDiff = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
        
        if (daysDiff < 0) return 'expired';
        if (daysDiff <= 30) return 'soon';
        return '';
    }

    formatDateForFilename(date) {
        return new Intl.DateTimeFormat('fr-CA').format(date).replace(/-/g, '');
    }

    showLoading() {
        document.getElementById('loadingOverlay').classList.remove('hidden');
    }

    hideLoading() {
        document.getElementById('loadingOverlay').classList.add('hidden');
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
                <span>${message}</span>
            </div>
        `;
        
        container.appendChild(toast);
        
        // Afficher le toast
        setTimeout(() => toast.classList.add('show'), 100);
        
        // Masquer et supprimer après 5 secondes
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => container.removeChild(toast), 300);
        }, 5000);
    }
}

// Initialiser le panel admin
let adminPanel;
document.addEventListener('DOMContentLoaded', () => {
    adminPanel = new AdminPanel();
});

// Exposer globalement pour les handlers onclick
window.adminPanel = adminPanel; 