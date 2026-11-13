// Dashboard-Logik für die Rezeptverwaltung.
// Dieses Script setzt den Login-Status, verwaltet Rezepte, Favoriten, Kalender,
// Kalorienziele und die Community-Ansicht. Der Nutzer wird hier in die zentrale App geleitet.
const API_BASE_URL = 'http://localhost:3000';
const token = localStorage.getItem('token');

// Wenn kein Token vorhanden ist, ist der Nutzer nicht eingeloggt und wird
// direkt zurück auf die Login-Seite geleitet.


    // Nach erfolgreichem Login werden hier die benötigten Dashboard-Elemente gesammelt.
    const recipeForm = document.querySelector('#recipe-form');
    const recipeList = document.querySelector('#recipe-list');
    const emptyState = document.querySelector('#empty-state');
    const recipeSearch = document.querySelector('#recipe-search');
    const recipeSort = document.querySelector('#recipe-sort');
    const recipeNoResults = document.querySelector('#recipe-no-results');
    const recipeCount = document.querySelector('#recipe-count');
    const dashboardToast = document.querySelector('#dashboard-toast');
    const dashboardToastIcon = document.querySelector('#dashboard-toast-icon');
    const dashboardToastTitle = document.querySelector('#dashboard-toast-title');
    const dashboardToastMessage = document.querySelector('#dashboard-toast-message');
    const dashboardToastProgress = document.querySelector('.dashboard-toast-progress');
    const userName = document.querySelector('#user-name');
    const openFavoritesButton = document.querySelector('#open-favorites-button');
    const favoriteCollection = document.querySelector('#favorite-collection');
    const favoriteRecipeList = document.querySelector('#favorite-recipe-list');
    const favoriteSearch = document.querySelector('#favorite-search');
    const favoriteEmptyState = document.querySelector('#favorite-empty-state');
    const favoriteNoResults = document.querySelector('#favorite-no-results');
    const planForm = document.querySelector('#plan-form');
    const planRecipe = document.querySelector('#plan-recipe');
    const planServings = document.querySelector('#plan-servings');
    const planDate = document.querySelector('#plan-date');
    const planCalendar = document.querySelector('#meal-plan-calendar');
    const planEmptyState = document.querySelector('#plan-empty-state');
    const planViewDate = document.querySelector('#plan-view-date');
    const planPeriod = document.querySelector('#plan-period');
    const calorieGoalForm = document.querySelector('#calorie-goal-form');
    const calorieGoalPreview = document.querySelector('#calorie-goal-preview');
    const calorieGoalResetButton = document.querySelector('#reset-calorie-goal-button');
    const calorieGoalModal = document.querySelector('#calorieGoalModal');
    const dashboardCalorieSummary = document.querySelector('#open-calorie-summary-button');
    const dashboardCalorieDate = document.querySelector('#dashboard-calorie-date');
    const dashboardCalorieTarget = document.querySelector('#dashboard-calorie-target');
    const dashboardCalorieBalance = document.querySelector('#dashboard-calorie-balance');
    const calendarSettingsForm = document.querySelector('#calendar-settings-form');
    const shoppingWeekday = document.querySelector('#shopping-weekday');
    const calendarFeedUrl = document.querySelector('#calendar-feed-url');
    const subscribeCalendarLink = document.querySelector('#subscribe-calendar-link');
    const calendarSettingsStatus = document.querySelector('#calendar-settings-status');
    const shoppingList = document.querySelector('#shopping-list');
    const shoppingEmptyState = document.querySelector('#shopping-empty-state');
    const communityRecipeList = document.querySelector('#community-recipe-list');
    const communitySearch = document.querySelector('#community-search');
    const communityEmptyState = document.querySelector('#community-empty-state');
    const communityRecipeDetails = document.querySelector('#community-recipe-details');
    const communityRecipeTitle = document.querySelector('#community-recipe-title');
    const recipeDetailsContent = document.querySelector('#recipe-detail-content');
    const recipeDetailsTitle = document.querySelector('#recipe-detail-modal-title');
    const recipeImageInput = document.querySelector('#recipe-image');
    const recipeImagePreview = document.querySelector('#recipe-image-preview');
    const recipes = [];
    let communityRecipes = [];
    let mealPlans = [];
    let activeFavoriteFilter = 'all';
    let activeCommunityRecipe = null;
    let favorites = { recipes: [], community: [] };
    let calorieGoal = null;
    let recipeImageData = null;
    let editingRecipeId = null;
    const nutritionEstimates = new Map();
    const pendingNutritionEstimates = new Map();
    let nutritionRequestQueue = Promise.resolve();
    let nutritionFailureMessageShown = false;
    let dashboardToastTimeout;
    let dashboardToastHideTimeout;

    // Name und E-Mail liegen lokal vor; fehlerhafte gespeicherte JSON-Daten bleiben folgenlos.
    let savedUser = {};
    try {
        savedUser = JSON.parse(localStorage.getItem('user') || '{}');
    } catch (error) {
        savedUser = {};
    }
    const emailName = (localStorage.getItem('email') || '').split('@')[0];
    userName.textContent = savedUser.name || emailName || 'Chefkoch';

    // Leitet Erfolgsmeldungen und Fehler an dieselbe Toast-Anzeige weiter.
    function showMessage(message, isSuccess = false) {
        showToast(message, isSuccess
            ? { title: 'Erfolgreich' }
            : { title: 'Fehler', icon: 'fa-exclamation-circle', variant: 'error' });
    

    // Blendet den Toast aus und entfernt ihn nach der Animation aus dem Layout.
    function dismissDashboardToast() {
        window.clearTimeout(dashboardToastTimeout);
        window.clearTimeout(dashboardToastHideTimeout);
        dashboardToast.classList.remove('is-visible');
        dashboardToastHideTimeout = window.setTimeout(() => {
            dashboardToast.hidden = true;
        }, 220);
    }

    // Zeigt eine zugängliche Statusmeldung an und startet ihre automatische Ausblendung.
    function showToast(message, { title = 'Gespeichert', icon = 'fa-check', variant = 'success' } = {}) {
        window.clearTimeout(dashboardToastTimeout);
        window.clearTimeout(dashboardToastHideTimeout);
        dashboardToast.classList.toggle('is-error', variant === 'error');
        dashboardToast.setAttribute('role', variant === 'error' ? 'alert' : 'status');
        dashboardToast.setAttribute('aria-live', variant === 'error' ? 'assertive' : 'polite');
        dashboardToastTitle.textContent = title;
        dashboardToastMessage.textContent = message;
        dashboardToastIcon.querySelector('i').className = `fas ${icon}`;
        dashboardToast.hidden = false;
        dashboardToast.classList.remove('is-visible');
        dashboardToastProgress.style.animation = 'none';
        void dashboardToastProgress.offsetWidth;
        dashboardToastProgress.style.animation = '';
        window.requestAnimationFrame(() => dashboardToast.classList.add('is-visible'));
        dashboardToastTimeout = window.setTimeout(dismissDashboardToast, 4800);
    }

    // Liefert erst dann true, wenn die Person den Bestätigungsdialog ausdrücklich annimmt.
    function requestConfirmation({ title, message, confirmLabel, tone = 'danger', icon = 'fa-trash-alt' }) {
        const modalElement = document.querySelector('#confirmationModal');
        const titleElement = document.querySelector('#confirmation-modal-title');
        const messageElement = document.querySelector('#confirmation-modal-message');
        const iconElement = document.querySelector('#confirmation-modal-icon');
        const confirmButton = document.querySelector('#confirmation-accept-button');
        const modal = bootstrap.Modal.getOrCreateInstance(modalElement);

        titleElement.textContent = title;
        messageElement.textContent = message;
        iconElement.className = `confirmation-modal-icon${tone === 'warning' ? ' is-warning' : ''}`;
        iconElement.querySelector('i').className = `fas ${icon}`;
        confirmButton.textContent = confirmLabel;
        confirmButton.className = `btn rounded-pill px-4 confirmation-modal-accept is-${tone}`;

        return new Promise((resolve) => {
            let confirmed = false;
            // Räumt den Klick-Handler auf und gibt das Ergebnis nach dem Schließen zurück.
            const finish = () => {
                confirmButton.removeEventListener('click', accept);
                confirmButton.disabled = false;
                resolve(confirmed);
            };
            // Merkt die Bestätigung und schließt den Dialog; finish löst danach das Promise auf.
            const accept = () => {
                confirmed = true;
                confirmButton.disabled = true;
                modal.hide();
            };

            confirmButton.addEventListener('click', accept);
            modalElement.addEventListener('hidden.bs.modal', finish, { once: true });
            modal.show();
        });
    }

    // Hält die Zahl der Favoriten und die dazugehörige Ansicht aktuell.
    function updateFavoriteCount() {
        document.querySelector('#favorite-count').textContent = String(favorites.recipes.length + favorites.community.length);
        renderFavoriteRecipes();
    }

    // Formatiert ein Datum lokal als YYYY-MM-DD, ohne UTC-Zeitzonenverschiebung.
    function getLocalDateString(date = new Date()) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // Ergänzt API-Aufrufe um das Login-Token und leitet abgelaufene Sitzungen zum Login um.
    async function apiRequest(path, options = {}) {
        const response = await fetch(`${API_BASE_URL}${path}`, {
            ...options,
            headers: {
                ...options.headers,
                Authorization: `Bearer ${token}`
            }
        });
        if (response.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('email');
            window.location.replace('login.html');
            throw new Error('Sitzung abgelaufen. Bitte erneut anmelden.');
        }
        return response;
    }

    // Liest JSON-Antworten und wandelt HTTP-Fehler in verständliche Meldungen um.
    async function readResponse(response, fallbackMessage) {
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || fallbackMessage);
        }
        return data;
    }

    // Formatiert Nährwerte deutsch und zeigt fehlende Werte ausdrücklich an.
    function formatNutritionValue(value, suffix = 'g') {
        if (value === null) {
            return 'nicht verfügbar';
        }
        return `${new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 }).format(value)} ${suffix}`;
    }

    // Erstellt aus Rezeptinhalt und Portionszahl einen Schlüssel für den Nährwert-Cache.
    function getNutritionEstimateKey(recipe) {
        return JSON.stringify({
            title: recipe.title.trim(),
            ingredients: recipe.ingredients,
            servings: recipe.servings || 1
        }).toLocaleLowerCase('de-DE');
    }

    // Baut die Nährwertanzeige aus Cache-Daten oder einem Lade-/Fehlerzustand auf.
    function createRecipeNutritionDisplay(recipe) {
        const key = getNutritionEstimateKey(recipe);
        const estimate = nutritionEstimates.get(key);
        const section = document.createElement('section');
        section.className = 'recipe-nutrition mt-3';
        section.dataset.recipeNutritionKey = key;
        const heading = document.createElement('strong');
        heading.textContent = 'Geschätzte Nährwerte pro Portion';
        section.append(heading);

        if (estimate?.nutrition) {
            const values = document.createElement('div');
            values.className = 'recipe-nutrition-grid mt-2';
            [
                ['Energie', estimate.nutrition.kcal, 'kcal'],
                ['Eiweiß', estimate.nutrition.protein, 'g'],
                ['Kohlenhydrate', estimate.nutrition.carbohydrates, 'g'],
                ['Fett', estimate.nutrition.fat, 'g'],
                ['Ballaststoffe', estimate.nutrition.fiber, 'g'],
                ['Salz', estimate.nutrition.salt, 'g']
            ].forEach(([label, value, unit]) => {
                const item = document.createElement('div');
                const name = document.createElement('small');
                name.textContent = label;
                const amount = document.createElement('strong');
                amount.textContent = formatNutritionValue(value, unit);
                item.append(name, amount);
                values.append(item);
            });
            const source = document.createElement('small');
            source.className = 'd-block text-muted mt-1';
            source.textContent = 'KI-Schätzung via OpenRouter; Werte können abweichen.';
            section.append(values, source);
        } else {
            const status = document.createElement('p');
            status.className = `small mb-0 mt-1 ${estimate?.error ? 'text-danger' : 'text-muted'}`;
            status.textContent = estimate?.error || 'Wird automatisch berechnet …';
            section.append(status);
            if (estimate?.error) {
                const retryButton = document.createElement('button');
                retryButton.type = 'button';
                retryButton.className = 'btn btn-sm btn-outline-secondary mt-2';
                retryButton.textContent = 'Erneut versuchen';
                // Löscht nur den fehlgeschlagenen Cache-Eintrag und startet die Schätzung erneut.
                retryButton.addEventListener('click', () => {
                    nutritionEstimates.delete(key);
                    void requestNutritionEstimate(recipe);
                });
                section.append(retryButton);
            }
        }
        return section;
    }

    // Aktualisiert Nährwerte an allen Stellen, die sich nach einer Schätzung ändern können.
    function refreshRecipeNutritionDisplays() {
        renderRecipeList();
        renderCommunityRecipes();
        renderFavoriteRecipes();
        refreshRecipeDetailNutrition(communityRecipeDetails, activeCommunityRecipe);
        const activeRecipe = recipes.find((recipe) => recipe.id === recipeDetailsContent.dataset.recipeId);
        refreshRecipeDetailNutrition(recipeDetailsContent, activeRecipe);
        updateCalendarNutritionTotal();
    }

    // Ersetzt Nährwertangaben in einem geöffneten Detailfenster, ohne den Rest neu aufzubauen.
    function refreshRecipeDetailNutrition(container, recipe) {
        if (!recipe) {
            return;
        }
        const existing = container.querySelector('[data-recipe-nutrition-key]');
        if (existing) {
            existing.replaceWith(createRecipeNutritionDisplay(recipe));
        }
        const calories = container.querySelector('[data-community-nutrition-kcal]');
        if (calories) {
            const kcal = getRecipeCalories(recipe);
            calories.textContent = kcal === null
                ? 'Wird berechnet'
                : `${new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 }).format(kcal)} kcal / Portion`;
        }
    }

    // Filtert und sortiert die eigene Sammlung und zeigt passende Leerzustände an.
    function renderRecipeList() {
        const searchTerm = recipeSearch.value.trim().toLocaleLowerCase('de-DE');
        const visibleRecipes = recipes
            .filter((recipe) => `${recipe.title} ${recipe.description || ''} ${(recipe.ingredients || []).join(' ')}`
                .toLocaleLowerCase('de-DE')
                .includes(searchTerm))
            .slice();

        if (recipeSort.value === 'title-asc') {
            visibleRecipes.sort((first, second) => first.title.localeCompare(second.title, 'de'));
        } else if (recipeSort.value === 'title-desc') {
            visibleRecipes.sort((first, second) => second.title.localeCompare(first.title, 'de'));
        } else if (recipeSort.value === 'prep-time') {
            visibleRecipes.sort((first, second) => {
                const firstTime = first.prepTime || Number.POSITIVE_INFINITY;
                const secondTime = second.prepTime || Number.POSITIVE_INFINITY;
                return firstTime - secondTime || first.title.localeCompare(second.title, 'de');
            });
        }

        recipeList.replaceChildren(...visibleRecipes.map(createRecipeCard));
        if (recipes.length === 0) {
            recipeList.append(emptyState);
        }
        emptyState.hidden = recipes.length > 0;
        recipeNoResults.hidden = recipes.length === 0 || visibleRecipes.length > 0;
    }

    // Liefert das Rezeptbild oder einen barrierefrei beschrifteten Platzhalter.
    function createRecipeCardCover(recipe) {
        if (recipe.image) {
            const image = document.createElement('img');
            image.className = 'card-img-top recipe-img';
            image.src = recipe.image;
            image.alt = recipe.title;
            image.loading = 'lazy';
            return image;
        }

        const cover = document.createElement('div');
        cover.className = 'recipe-img recipe-cover-placeholder';
        cover.setAttribute('role', 'img');
        cover.setAttribute('aria-label', `Kein Bild für ${recipe.title}`);
        const icon = document.createElement('i');
        icon.className = 'fas fa-utensils';
        icon.setAttribute('aria-hidden', 'true');
        cover.append(icon);
        return cover;
    }

    // Holt eine einzelne Schätzung; Cache, laufende Anfragen und Warteschlange vermeiden Duplikate.
    async function requestNutritionEstimate(recipe) {
        const key = getNutritionEstimateKey(recipe);
        if (nutritionEstimates.has(key)) {
            return nutritionEstimates.get(key);
        }
        if (pendingNutritionEstimates.has(key)) {
            return pendingNutritionEstimates.get(key);
        }

        const request = nutritionRequestQueue.then(async () => {
            try {
                const response = await apiRequest('/api/nutrition/recipe-estimate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        title: recipe.title,
                        ingredients: recipe.ingredients,
                        servings: recipe.servings || 1
                    })
                });
                const data = await readResponse(response, 'Nährwerte konnten nicht berechnet werden.');
                const estimate = { nutrition: data.nutrition };
                nutritionEstimates.set(key, estimate);
                return estimate;
            } catch (error) {
                const estimate = { error: error.message || 'Nährwerte konnten nicht berechnet werden.' };
                nutritionEstimates.set(key, estimate);
                if (!nutritionFailureMessageShown) {
                    nutritionFailureMessageShown = true;
                    showMessage(`Automatische Nährwertschätzung fehlgeschlagen: ${estimate.error}`);
                }
                return estimate;
            } finally {
                pendingNutritionEstimates.delete(key);
                refreshRecipeNutritionDisplays();
            }
        });
        nutritionRequestQueue = request.then(() => undefined, (error) => {
            console.error('Unexpected nutrition request queue failure:', error);
        });
        pendingNutritionEstimates.set(key, request);
        return request;
    }

    // Schätzt eindeutige Rezepte nacheinander und stoppt bei Anbieter- oder Anfrage-Limits.
    async function requestNutritionEstimates(recipeListToEstimate) {
        const uniqueRecipes = [...new Map(recipeListToEstimate.map((recipe) => [
            getNutritionEstimateKey(recipe),
            recipe
        ])).values()].filter((recipe) => (
            !nutritionEstimates.has(getNutritionEstimateKey(recipe))
        ));
        for (const [index, recipe] of uniqueRecipes.entries()) {
            const estimate = await requestNutritionEstimate(recipe);
            const providerLimitError = estimate.error && (
                estimate.error?.includes('HTTP 402')
                || estimate.error?.includes('HTTP 429')
                || estimate.error?.includes('Zu viele Nährwertanfragen')
            );
            if (providerLimitError) {
                uniqueRecipes.slice(index + 1).forEach((remainingRecipe) => {
                    nutritionEstimates.set(getNutritionEstimateKey(remainingRecipe), { error: estimate.error });
                });
                refreshRecipeNutritionDisplays();
                return;
            }
        }
    }

    // Erstellt eine Karte der eigenen Sammlung mit Nährwerten und Rezeptaktionen.
    function createRecipeCard(recipe) {
        const column = document.createElement('div');
        column.className = 'col-12 col-md-6 col-xl-4';
        const card = document.createElement('article');
        card.className = 'card h-100 border-0 shadow-sm recipe-card recipe-dashboard-card';
        const cover = document.createElement('div');
        cover.className = 'community-card-cover';
        const image = createRecipeCardCover(recipe);
        cover.append(image);
        const category = document.createElement('span');
        category.className = 'community-card-category';
        category.textContent = recipe.shareWithCommunity ? 'Mit Community geteilt' : 'Privates Rezept';
        cover.append(category);
        const favoriteButton = createFavoriteButton('recipes', recipe.id);
        favoriteButton.className = 'community-card-favorite';
        favoriteButton.setAttribute('aria-label', favorites.recipes.includes(recipe.id)
            ? 'Aus Favoriten entfernen'
            : 'Zu Favoriten hinzufügen');
        favoriteButton.title = favoriteButton.getAttribute('aria-label');
        favoriteButton.replaceChildren();
        const heart = document.createElement('i');
        heart.className = favorites.recipes.includes(recipe.id) ? 'fas fa-heart' : 'far fa-heart';
        heart.setAttribute('aria-hidden', 'true');
        const favoriteLabel = document.createElement('span');
        favoriteLabel.className = 'visually-hidden';
        favoriteLabel.textContent = favoriteButton.getAttribute('aria-label');
        favoriteButton.append(heart, favoriteLabel);
        cover.append(favoriteButton);

        const body = document.createElement('div');
        body.className = 'card-body community-card-body collection-card-body d-flex flex-column';
        const title = document.createElement('h3');
        title.className = 'card-title community-card-title fw-bold';
        title.textContent = recipe.title;
        body.append(title);
        const description = document.createElement('p');
        description.className = 'card-text community-card-description text-muted flex-grow-1';
        description.textContent = recipe.description || 'Dein Rezept, jederzeit griffbereit.';
        body.append(description);

        const metadata = document.createElement('div');
        metadata.className = 'community-card-meta';
        const time = document.createElement('span');
        time.className = 'community-card-stat';
        const timeIcon = document.createElement('i');
        timeIcon.className = 'far fa-clock';
        timeIcon.setAttribute('aria-hidden', 'true');
        time.append(timeIcon, recipe.prepTime ? `${recipe.prepTime} Min.` : 'Zeit offen');
        const calories = document.createElement('span');
        calories.className = 'community-card-stat';
        const caloriesIcon = document.createElement('i');
        caloriesIcon.className = 'fas fa-fire';
        caloriesIcon.setAttribute('aria-hidden', 'true');
        const kcal = getRecipeCalories(recipe);
        calories.append(caloriesIcon, kcal === null
            ? 'Nährwerte folgen'
            : `${new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 }).format(kcal)} kcal / Portion`);
        metadata.append(time, calories);
        body.append(metadata);

        const actions = document.createElement('div');
        actions.className = 'collection-card-actions';
        const detailsButton = document.createElement('button');
        detailsButton.type = 'button';
        detailsButton.className = 'btn btn-primary-custom community-card-open-button';
        detailsButton.dataset.recipeDetailsId = recipe.id;
        const detailsIcon = document.createElement('i');
        detailsIcon.className = 'fas fa-book-open';
        detailsIcon.setAttribute('aria-hidden', 'true');
        const detailsLabel = document.createElement('span');
        detailsLabel.textContent = 'Rezept ansehen';
        const detailsArrow = document.createElement('i');
        detailsArrow.className = 'fas fa-arrow-right';
        detailsArrow.setAttribute('aria-hidden', 'true');
        detailsButton.append(detailsIcon, detailsLabel, detailsArrow);
        const editButton = document.createElement('button');
        editButton.type = 'button';
        editButton.className = 'btn btn-outline-primary collection-card-icon-button';
        editButton.setAttribute('aria-label', `„${recipe.title}“ bearbeiten`);
        editButton.title = 'Bearbeiten';
        const editIcon = document.createElement('i');
        editIcon.className = 'fas fa-pen';
        editIcon.setAttribute('aria-hidden', 'true');
        editButton.append(editIcon);
        // Schließt zuerst die Favoritenansicht, damit der Bearbeitungsdialog darüber erscheinen kann.
        editButton.addEventListener('click', () => {
            if (favoriteCollection.classList.contains('show')) {
                hideFavoritesView(() => editRecipe(recipe));
                return;
            }
            editRecipe(recipe);
        });
        actions.append(detailsButton, editButton);

        const deleteButton = document.createElement('button');
        deleteButton.type = 'button';
        deleteButton.className = 'btn btn-outline-danger collection-card-icon-button';
        deleteButton.setAttribute('aria-label', `„${recipe.title}“ löschen`);
        deleteButton.title = 'Löschen';
        const deleteIcon = document.createElement('i');
        deleteIcon.className = 'fas fa-trash-alt';
        deleteIcon.setAttribute('aria-hidden', 'true');
        deleteButton.append(deleteIcon);
        // Schließt zuerst die Favoritenansicht und fragt anschließend nach dem Löschen.
        deleteButton.addEventListener('click', () => {
            if (favoriteCollection.classList.contains('show')) {
                hideFavoritesView(() => {
                    void deleteRecipe(recipe, deleteButton);
                });
                return;
            }
            void deleteRecipe(recipe, deleteButton);
        });
        actions.append(deleteButton);
        body.append(actions);

        card.append(cover, body);
        column.append(card);
        return column;
    }

    // Setzt Formular und Bildvorschau zurück, bevor ein neues Rezept angelegt wird.
    function openNewRecipeModal() {
        recipeForm.reset();
        editingRecipeId = null;
        recipeImageData = null;
        recipeImagePreview.removeAttribute('src');
        recipeImagePreview.hidden = true;
        document.querySelector('#recipe-modal-title').textContent = 'Neues Rezept';
        document.querySelector('#save-recipe-button').innerHTML = '<i class="fas fa-save me-2" aria-hidden="true"></i>Rezept speichern';
        bootstrap.Modal.getOrCreateInstance(document.querySelector('#createRecipeModal')).show();
    }

    // Füllt den gemeinsamen Rezeptdialog mit vorhandenen Daten für die Bearbeitung.
    function editRecipe(recipe) {
        editingRecipeId = recipe.id;
        recipeForm.elements.title.value = recipe.title;
        recipeForm.elements.description.value = recipe.description || '';
        recipeForm.elements.ingredients.value = recipe.ingredients.join('\n');
        recipeForm.elements.instructions.value = recipe.instructions || '';
        recipeForm.elements.prepTime.value = recipe.prepTime || '';
        recipeForm.elements.servings.value = recipe.servings || 1;
        document.querySelector('#share-recipe-with-community').checked = recipe.shareWithCommunity === true;
        recipeImageData = null;
        recipeImageInput.value = '';
        if (recipe.image) {
            recipeImagePreview.src = recipe.image;
            recipeImagePreview.hidden = false;
        } else {
            recipeImagePreview.removeAttribute('src');
            recipeImagePreview.hidden = true;
        }

        document.querySelector('#recipe-modal-title').textContent = 'Rezept bearbeiten';
        document.querySelector('#save-recipe-button').innerHTML = '<i class="fas fa-save me-2" aria-hidden="true"></i>Änderungen speichern';
        bootstrap.Modal.getOrCreateInstance(document.querySelector('#createRecipeModal')).show();
    }

    // Löscht ein Rezept erst nach Bestätigung und aktualisiert danach die abhängigen Ansichten.
    async function deleteRecipe(recipe, button) {
        const confirmed = await requestConfirmation({
            title: 'Rezept wirklich löschen?',
            message: `„${recipe.title}“ und alle dazugehörigen Einträge im Wochenplan werden gelöscht. Diese Aktion lässt sich nicht rückgängig machen.`,
            confirmLabel: 'Rezept löschen'
        });
        if (!confirmed) {
            return;
        }

        button.disabled = true;
        try {
            const response = await apiRequest(`/api/recipes/${encodeURIComponent(recipe.id)}`, {
                method: 'DELETE'
            });
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Rezept konnte nicht gelöscht werden.');
            }
            if (document.querySelector('#recipeDetailsModal').classList.contains('show')) {
                bootstrap.Modal.getOrCreateInstance(document.querySelector('#recipeDetailsModal')).hide();
            }
            showToast(`„${recipe.title}“ wurde gelöscht.`, {
                title: 'Rezept gelöscht',
                icon: 'fa-trash-alt'
            });
            await Promise.all([loadRecipes(), loadPlans(), loadFavorites()]);
            if (recipe.shareWithCommunity) {
                await loadCommunityRecipes();
            }
        } catch (error) {
            showMessage(error.message || 'Verbindung zum Server fehlgeschlagen.');
            button.disabled = false;
        }
    }

    // Gibt die geschätzten Kalorien pro Portion zurück oder null, solange sie fehlen.
    function getRecipeCalories(recipe) {
        const estimate = nutritionEstimates.get(getNutritionEstimateKey(recipe));
        return estimate?.nutrition?.kcal ?? null;
    }

    // Erstellt einen Favoritenknopf für ein eigenes oder ein Community-Rezept.
    function createFavoriteButton(type, recipeId) {
        const isFavorite = (favorites[type] || []).includes(recipeId);
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `btn btn-sm ${isFavorite ? 'btn-danger' : 'btn-outline-danger'} recipe-favorite-button align-self-start mb-2`;
        button.dataset.favoriteType = type;
        button.dataset.favoriteId = recipeId;
        button.setAttribute('aria-pressed', String(isFavorite));
        button.textContent = isFavorite ? '♥ Favorit' : '♡ Als Favorit';
        return button;
    }

    // Verwendet dieselbe Detaildarstellung wie bei eigenen Rezepten für Community-Rezepte.
    function createCommunityDetailFavoriteButton(recipeId) {
        return createRecipeDetailFavoriteButton('community', recipeId);
    }

    // Passt den Favoritenknopf an die größere Detailansicht an.
    function createRecipeDetailFavoriteButton(type, recipeId) {
        const isFavorite = favorites[type].includes(recipeId);
        const button = createFavoriteButton(type, recipeId);
        button.className = 'btn btn-outline-danger community-detail-favorite';
        button.setAttribute('aria-pressed', String(isFavorite));
        button.replaceChildren();
        const icon = document.createElement('i');
        icon.className = isFavorite ? 'fas fa-heart' : 'far fa-heart';
        icon.setAttribute('aria-hidden', 'true');
        button.append(icon, document.createTextNode(isFavorite ? ' In Favoriten' : ' Zu Favoriten'));
        return button;
    }

    // Ergänzt Zeit, Portionen und Kalorien als kompakte Kennzahlen im Rezeptdetail.
    function appendRecipeDetailStats(container, recipe) {
        const stats = document.createElement('div');
        stats.className = 'community-detail-stats';
        [
            ['far fa-clock', 'Zubereitungszeit', recipe.prepTime ? `${recipe.prepTime} Min.` : 'Nicht angegeben'],
            ['fas fa-utensils', 'Portionen', String(recipe.servings || 1)],
            ['fas fa-fire', 'Energie / Portion', getRecipeCalories(recipe) === null
                ? 'Wird berechnet'
                : `${new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 }).format(getRecipeCalories(recipe))} kcal`]
        ].forEach(([iconClass, label, value]) => {
            const stat = document.createElement('div');
            stat.className = 'community-detail-stat';
            const icon = document.createElement('i');
            icon.className = iconClass;
            icon.setAttribute('aria-hidden', 'true');
            const copy = document.createElement('span');
            const statLabel = document.createElement('small');
            statLabel.textContent = label;
            const statValue = document.createElement('strong');
            statValue.textContent = value;
            if (label === 'Energie / Portion') {
                statValue.dataset.communityNutritionKcal = '';
            }
            copy.append(statLabel, statValue);
            stat.append(icon, copy);
            stats.append(stat);
        });
        container.append(stats);
    }

    // Ergänzt Zutaten, optionale Zubereitungsschritte und die Nährwertanzeige.
    function appendRecipeDetailSections(container, recipe) {
        const ingredientsSection = document.createElement('section');
        ingredientsSection.className = 'community-detail-section';
        const ingredientsHeading = document.createElement('h3');
        ingredientsHeading.textContent = 'Zutaten';
        const ingredientsSubtitle = document.createElement('p');
        ingredientsSubtitle.className = 'community-detail-section-note';
        ingredientsSubtitle.textContent = `Alles für ${recipe.servings || 1} Portionen`;
        ingredientsSection.append(
            ingredientsHeading,
            ingredientsSubtitle,
            createCommunityIngredients(recipe)
        );
        container.append(ingredientsSection);

        const instructions = Array.isArray(recipe.instructions)
            ? recipe.instructions
            : String(recipe.instructions || '').split('\n').map((step) => step.trim()).filter(Boolean);
        if (instructions.length > 0) {
            const instructionsSection = document.createElement('section');
            instructionsSection.className = 'community-detail-section community-detail-instructions';
            const instructionsHeading = document.createElement('h3');
            instructionsHeading.textContent = 'Zubereitung';
            const instructionsList = document.createElement('ol');
            instructionsList.className = 'community-instruction-list';
            instructions.forEach((instruction) => {
                const item = document.createElement('li');
                item.textContent = instruction;
                instructionsList.append(item);
            });
            instructionsSection.append(instructionsHeading, instructionsList);
            container.append(instructionsSection);
        }

        const nutrition = createRecipeNutritionDisplay(recipe);
        nutrition.classList.add('community-detail-nutrition');
        container.append(nutrition);
    }

    // Baut Titel, Urheberhinweis und optionale Kurzbeschreibung für das Rezeptdetail.
    function createRecipeDetailIntro(recipe) {
        const intro = document.createElement('div');
        intro.className = 'community-detail-intro';
        const title = document.createElement('h2');
        title.className = 'community-detail-title';
        title.textContent = recipe.title;
        const author = document.createElement('p');
        author.className = 'community-detail-author';
        const authorIcon = document.createElement('i');
        authorIcon.className = 'fas fa-user-circle';
        authorIcon.setAttribute('aria-hidden', 'true');
        author.append(authorIcon, document.createTextNode(' Dein Rezept'));
        intro.append(title, author);

        if (recipe.description) {
            const description = document.createElement('p');
            description.className = 'community-detail-description';
            description.textContent = recipe.description;
            intro.append(description);
        }
        return intro;
    }

    // Öffnet die Detailansicht eines eigenen Rezepts samt Bearbeiten- und Löschaktionen.
    async function openRecipeDetails(recipe) {
        recipeDetailsContent.dataset.recipeId = recipe.id;
        recipeDetailsContent.replaceChildren();
        recipeDetailsTitle.textContent = `Rezeptdetails: ${recipe.title}`;

        const detail = document.createElement('article');
        detail.className = 'community-recipe-detail';
        const hero = document.createElement('div');
        hero.className = 'community-detail-hero';
        const image = createRecipeCardCover(recipe);
        image.classList.add('community-detail-image');
        if (image instanceof HTMLImageElement) {
            image.loading = 'eager';
        }
        hero.append(image);
        const category = document.createElement('span');
        category.className = 'community-detail-category';
        category.textContent = recipe.shareWithCommunity ? 'Mit Community geteilt' : 'Privates Rezept';
        hero.append(category);
        detail.append(hero);

        const content = document.createElement('div');
        content.className = 'community-detail-content';
        content.append(createRecipeDetailIntro(recipe));
        appendRecipeDetailStats(content, recipe);

        const actions = document.createElement('div');
        actions.className = 'community-detail-actions';
        actions.append(createRecipeDetailFavoriteButton('recipes', recipe.id));
        const editButton = document.createElement('button');
        editButton.type = 'button';
        editButton.className = 'btn btn-outline-primary community-detail-edit';
        const editIcon = document.createElement('i');
        editIcon.className = 'fas fa-pen';
        editIcon.setAttribute('aria-hidden', 'true');
        editButton.append(editIcon, document.createTextNode(' Bearbeiten'));
        // Wartet auf das Schließen der Detailansicht, bevor der Bearbeitungsdialog geöffnet wird.
        editButton.addEventListener('click', () => {
            const modalElement = document.querySelector('#recipeDetailsModal');
            // Der Bearbeitungsdialog erscheint erst, wenn das Detailfenster vollständig geschlossen ist.
            modalElement.addEventListener('hidden.bs.modal', () => editRecipe(recipe), { once: true });
            bootstrap.Modal.getOrCreateInstance(modalElement).hide();
        });
        const deleteButton = document.createElement('button');
        deleteButton.type = 'button';
        deleteButton.className = 'btn btn-outline-danger community-detail-delete';
        const deleteIcon = document.createElement('i');
        deleteIcon.className = 'fas fa-trash-alt';
        deleteIcon.setAttribute('aria-hidden', 'true');
        deleteButton.append(deleteIcon, document.createTextNode(' Löschen'));
        // Schließt die Details zuerst und startet danach den bestätigten Löschablauf.
        deleteButton.addEventListener('click', () => {
            const modalElement = document.querySelector('#recipeDetailsModal');
            deleteButton.disabled = true;
            // Nach dem Schließen bleibt nur ein Bestätigungsdialog gleichzeitig geöffnet.
            modalElement.addEventListener('hidden.bs.modal', () => {
                void deleteRecipe(recipe, deleteButton);
            }, { once: true });
            bootstrap.Modal.getOrCreateInstance(modalElement).hide();
        });
        actions.append(editButton, deleteButton);
        content.append(actions);
        appendRecipeDetailSections(content, recipe);
        detail.append(content);
        recipeDetailsContent.append(detail);

        const modal = bootstrap.Modal.getOrCreateInstance(document.querySelector('#recipeDetailsModal'));
        modal.show();
        void requestNutritionEstimate(recipe);
    }

    // Erstellt eine Community-Karte mit Urheber, Favorit und Option zum Übernehmen.
    function createCommunityRecipeCard(recipe) {
        const column = document.createElement('div');
        column.className = 'col-12 col-md-6 col-xl-4';
        const card = document.createElement('article');
        card.className = 'card h-100 border-0 shadow-sm recipe-card community-recipe-card';

        const cover = document.createElement('div');
        cover.className = 'community-card-cover';
        const image = createRecipeCardCover(recipe);
        cover.append(image);
        const category = document.createElement('span');
        category.className = 'community-card-category';
        category.textContent = recipe.category || 'Community-Rezept';
        cover.append(category);
        const favoriteButton = createFavoriteButton('community', recipe.id);
        favoriteButton.className = 'community-card-favorite';
        favoriteButton.setAttribute('aria-label', favorites.community.includes(recipe.id)
            ? 'Aus Favoriten entfernen'
            : 'Zu Favoriten hinzufügen');
        favoriteButton.title = favoriteButton.getAttribute('aria-label');
        favoriteButton.replaceChildren();
        const heart = document.createElement('i');
        heart.className = favorites.community.includes(recipe.id) ? 'fas fa-heart' : 'far fa-heart';
        heart.setAttribute('aria-hidden', 'true');
        const favoriteLabel = document.createElement('span');
        favoriteLabel.className = 'visually-hidden';
        favoriteLabel.textContent = favoriteButton.getAttribute('aria-label');
        favoriteButton.append(heart, favoriteLabel);
        cover.append(favoriteButton);

        const body = document.createElement('div');
        body.className = 'card-body community-card-body d-flex flex-column';
        const title = document.createElement('h3');
        title.className = 'card-title community-card-title fw-bold';
        title.textContent = recipe.title;
        const description = document.createElement('p');
        description.className = 'card-text community-card-description text-muted flex-grow-1';
        description.textContent = recipe.description || 'Ein Rezept aus der Lezzetify-Community.';
        const metadata = document.createElement('div');
        metadata.className = 'community-card-meta';

        const time = document.createElement('span');
        time.className = 'community-card-stat';
        const timeIcon = document.createElement('i');
        timeIcon.className = 'far fa-clock';
        timeIcon.setAttribute('aria-hidden', 'true');
        time.append(timeIcon, recipe.prepTime ? `${recipe.prepTime} Min.` : 'Zeit offen');
        const calories = document.createElement('span');
        calories.className = 'community-card-stat';
        const caloriesIcon = document.createElement('i');
        caloriesIcon.className = 'fas fa-fire';
        caloriesIcon.setAttribute('aria-hidden', 'true');
        const kcal = getRecipeCalories(recipe);
        calories.append(caloriesIcon, kcal === null
            ? 'Nährwerte folgen'
            : `${new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 }).format(kcal)} kcal / Portion`);
        metadata.append(time, calories);

        const author = document.createElement('p');
        author.className = 'community-card-author small text-muted';
        const authorIcon = document.createElement('i');
        authorIcon.className = 'fas fa-user-circle';
        authorIcon.setAttribute('aria-hidden', 'true');
        author.append(authorIcon, document.createTextNode(recipe.creatorType === 'user'
            ? ` ${recipe.addedByName}`
            : ` ${recipe.addedByName || 'Lezzetify'}`));
        const detailsButton = document.createElement('button');
        detailsButton.type = 'button';
        detailsButton.className = 'btn btn-primary-custom community-card-open-button mt-auto';
        detailsButton.dataset.communityRecipeId = recipe.id;
        const detailsIcon = document.createElement('i');
        detailsIcon.className = 'fas fa-book-open';
        detailsIcon.setAttribute('aria-hidden', 'true');
        const detailsLabel = document.createElement('span');
        detailsLabel.textContent = 'Rezept ansehen';
        const detailsArrow = document.createElement('i');
        detailsArrow.className = 'fas fa-arrow-right';
        detailsArrow.setAttribute('aria-hidden', 'true');
        detailsButton.append(detailsIcon, detailsLabel, detailsArrow);
        const saveButton = document.createElement('button');
        saveButton.type = 'button';
        saveButton.className = 'btn btn-outline-primary community-card-save-button';
        saveButton.dataset.saveCommunityRecipeId = recipe.id;
        const alreadySaved = recipes.some((entry) => entry.sourceCommunityId === recipe.id);
        const saveIcon = document.createElement('i');
        saveIcon.className = alreadySaved ? 'fas fa-check' : 'far fa-bookmark';
        saveIcon.setAttribute('aria-hidden', 'true');
        saveButton.append(saveIcon, document.createTextNode(
            alreadySaved ? ' In deiner Sammlung' : ' Zur Sammlung hinzufügen'
        ));
        saveButton.disabled = alreadySaved;
        const actions = document.createElement('div');
        actions.className = 'community-card-actions';
        actions.append(detailsButton, saveButton);
        body.append(title, description, metadata, author, actions);
        card.append(cover, body);
        column.append(card);
        return column;
    }

    // Filtert die Community-Liste nach Suchtext und hält zugleich Favoriten aktuell.
    function renderCommunityRecipes() {
        const searchTerm = communitySearch.value.trim().toLocaleLowerCase('de-DE');
        const filteredRecipes = communityRecipes.filter((recipe) => (
            `${recipe.title} ${recipe.description} ${recipe.category} ${recipe.addedByName}`
                .toLocaleLowerCase('de-DE')
                .includes(searchTerm)
        ));
        communityRecipeList.replaceChildren(...filteredRecipes.map(createCommunityRecipeCard));
        communityEmptyState.hidden = filteredRecipes.length > 0;
        renderFavoriteRecipes();
    }

    // Kombiniert eigene und Community-Favoriten und wendet Suche sowie Typfilter an.
    function renderFavoriteRecipes() {
        const searchTerm = favoriteSearch.value.trim().toLocaleLowerCase('de-DE');
        const allFavorites = [
            ...recipes
                .filter((recipe) => favorites.recipes.includes(recipe.id))
                .map((recipe) => ({ recipe, type: 'recipes' })),
            ...communityRecipes
                .filter((recipe) => favorites.community.includes(recipe.id))
                .map((recipe) => ({ recipe, type: 'community' }))
        ];
        const visibleFavorites = allFavorites.filter(({ recipe, type }) => {
            const matchesFilter = activeFavoriteFilter === 'all' || activeFavoriteFilter === type;
            const searchableText = [
                recipe.title,
                recipe.description,
                recipe.category,
                recipe.addedByName,
                ...(recipe.ingredients || [])
            ].filter(Boolean).join(' ').toLocaleLowerCase('de-DE');
            return matchesFilter && searchableText.includes(searchTerm);
        });

        favoriteRecipeList.replaceChildren(...visibleFavorites.map(({ recipe, type }) => (
            type === 'recipes' ? createRecipeCard(recipe) : createCommunityRecipeCard(recipe)
        )));

        const countLabel = document.querySelector('#favorite-view-count');
        countLabel.textContent = `${visibleFavorites.length} ${visibleFavorites.length === 1 ? 'Rezept' : 'Rezepte'}`;
        const hasSavedFavorites = favorites.recipes.length + favorites.community.length > 0;
        favoriteEmptyState.hidden = hasSavedFavorites;
        favoriteNoResults.hidden = visibleFavorites.length > 0 || !hasSavedFavorites;
    }

    // Aktualisiert den Inhalt vor dem Anzeigen des Favoritenfensters.
    function openFavoritesView() {
        renderFavoriteRecipes();
        bootstrap.Modal.getOrCreateInstance(favoriteCollection).show();
    }

    // Führt eine Folgeaktion erst nach dem vollständigen Schließen des Favoritenfensters aus.
    function hideFavoritesView(onHidden) {
        favoriteCollection.addEventListener('hidden.bs.modal', onHidden, { once: true });
        bootstrap.Modal.getOrCreateInstance(favoriteCollection).hide();
    }

    // Lädt Community-Rezepte, rendert sie und stößt fehlende Nährwertschätzungen an.
    async function loadCommunityRecipes() {
        try {
            const response = await apiRequest('/api/community/recipes');
            communityRecipes = await readResponse(response, 'Community-Rezepte konnten nicht geladen werden.');
            renderCommunityRecipes();
            void requestNutritionEstimates(communityRecipes);
        } catch (error) {
            showMessage(error.message || 'Community-Rezepte konnten nicht geladen werden.');
        }
    }

    // Lädt die gespeicherten Favoriten und aktualisiert Zähler und Listen.
    async function loadFavorites() {
        try {
            const response = await apiRequest('/api/favorites');
            favorites = await readResponse(response, 'Favoriten konnten nicht geladen werden.');
            updateFavoriteCount();
            renderRecipeList();
            renderCommunityRecipes();
        } catch (error) {
            showMessage(error.message || 'Favoriten konnten nicht geladen werden.');
        }
    }

    // Schaltet einen Favoriten über die API um und synchronisiert alle betroffenen Ansichten.
    async function toggleFavorite(type, recipeId, button) {
        button.disabled = true;
        try {
            const response = await apiRequest('/api/favorites', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type, recipeId })
            });
            const data = await readResponse(response, 'Favorit konnte nicht gespeichert werden.');
            favorites = data.favorites;
            updateFavoriteCount();
            renderRecipeList();
            renderCommunityRecipes();
            communityRecipeDetails.querySelectorAll('[data-favorite-type]').forEach((favoriteButton) => {
                if (favoriteButton.dataset.favoriteId === recipeId) {
                    favoriteButton.replaceWith(type === 'community'
                        ? createCommunityDetailFavoriteButton(recipeId)
                        : createFavoriteButton(type, recipeId));
                }
            });
            recipeDetailsContent.querySelectorAll('[data-favorite-type]').forEach((favoriteButton) => {
                if (favoriteButton.dataset.favoriteId === recipeId) {
                    favoriteButton.replaceWith(createRecipeDetailFavoriteButton(type, recipeId));
                }
            });
            const recipeTitle = type === 'community'
                ? communityRecipes.find((recipe) => recipe.id === recipeId)?.title
                : recipes.find((recipe) => recipe.id === recipeId)?.title;
            showToast(
                data.favorited
                    ? `„${recipeTitle || 'Rezept'}“ wurde zu deinen Favoriten hinzugefügt.`
                    : `„${recipeTitle || 'Rezept'}“ wurde aus deinen Favoriten entfernt.`,
                {
                    title: data.favorited ? 'In Favoriten gespeichert' : 'Aus Favoriten entfernt',
                    icon: data.favorited ? 'fa-heart' : 'fa-heart-broken'
                }
            );
        } catch (error) {
            showMessage(error.message || 'Favorit konnte nicht gespeichert werden.');
            button.disabled = false;
        }
    }

    // Übernimmt ein Community-Rezept in die eigene Sammlung und lädt die Listen neu.
    async function saveCommunityRecipe(recipeId, button) {
        button.disabled = true;
        try {
            const response = await apiRequest(`/api/recipes/from-community/${encodeURIComponent(recipeId)}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({})
            });
            await readResponse(response, 'Community-Rezept konnte nicht gespeichert werden.');
            const alreadySaved = response.status === 200;
            const recipeTitle = communityRecipes.find((recipe) => recipe.id === recipeId)?.title || 'Das Rezept';
            showToast(
                alreadySaved
                    ? `„${recipeTitle}“ ist bereits in deiner Sammlung.`
                    : `„${recipeTitle}“ wurde zu deinen Rezepten hinzugefügt.`,
                {
                    title: alreadySaved ? 'Schon vorgemerkt' : 'Rezept gespeichert',
                    icon: alreadySaved ? 'fa-bookmark' : 'fa-check'
                }
            );
            communityRecipeDetails.querySelectorAll('[data-save-community-recipe-id]').forEach((saveButton) => {
                if (saveButton.dataset.saveCommunityRecipeId === recipeId) {
                    saveButton.disabled = true;
                    saveButton.replaceChildren();
                    const icon = document.createElement('i');
                    icon.className = 'fas fa-check';
                    icon.setAttribute('aria-hidden', 'true');
                    saveButton.append(icon, document.createTextNode(' Bereits in deiner Sammlung'));
                }
            });
            await loadRecipes();
            renderCommunityRecipes();
        } catch (error) {
            showMessage(error.message || 'Community-Rezept konnte nicht gespeichert werden.');
            button.disabled = false;
        }
    }

    // Wandelt Zutaten einheitlich in eine Liste um, auch wenn sie als Text ankommen.
    function createCommunityIngredients(recipe) {
        const list = document.createElement('ul');
        list.className = 'community-ingredient-list';
        recipe.ingredients.forEach((ingredient) => {
            const item = document.createElement('li');
            const marker = document.createElement('i');
            marker.className = 'fas fa-check';
            marker.setAttribute('aria-hidden', 'true');
            const label = document.createElement('span');
            label.textContent = ingredient;
            item.append(marker, label);
            list.append(item);
        });
        return list;
    }

    // Lädt die vollständigen Community-Rezeptdaten und baut daraus die Detailansicht.
    async function openCommunityRecipe(recipeId) {
        activeCommunityRecipe = null;
        communityRecipeDetails.replaceChildren();
        communityRecipeTitle.textContent = 'Community-Rezept wird geladen';
        const loading = document.createElement('p');
        loading.className = 'community-detail-loading';
        loading.textContent = 'Rezept wird geladen …';
        communityRecipeDetails.append(loading);
        const modal = bootstrap.Modal.getOrCreateInstance(document.querySelector('#communityRecipeModal'));
        modal.show();
        try {
            const response = await apiRequest(`/api/community/recipes/${encodeURIComponent(recipeId)}`);
            const recipe = await readResponse(response, 'Community-Rezept konnte nicht geladen werden.');
            activeCommunityRecipe = recipe;
            communityRecipeTitle.textContent = `Rezeptdetails: ${recipe.title}`;
            communityRecipeDetails.replaceChildren();

            const detail = document.createElement('article');
            detail.className = 'community-recipe-detail';
            const hero = document.createElement('div');
            hero.className = 'community-detail-hero';
            const image = createRecipeCardCover(recipe);
            image.classList.add('community-detail-image');
            if (image instanceof HTMLImageElement) {
                image.loading = 'eager';
            }
            hero.append(image);
            const category = document.createElement('span');
            category.className = 'community-detail-category';
            category.textContent = recipe.category || 'Community-Rezept';
            hero.append(category);
            detail.append(hero);

            const content = document.createElement('div');
            content.className = 'community-detail-content';
            const intro = document.createElement('div');
            intro.className = 'community-detail-intro';
            const title = document.createElement('h2');
            title.className = 'community-detail-title';
            title.textContent = recipe.title;
            const author = document.createElement('p');
            author.className = 'community-detail-author';
            const authorIcon = document.createElement('i');
            authorIcon.className = 'fas fa-user-circle';
            authorIcon.setAttribute('aria-hidden', 'true');
            author.append(authorIcon, document.createTextNode(recipe.creatorType === 'user'
                ? ` Geteilt von ${recipe.addedByName}`
                : ` Von ${recipe.addedByName || 'Lezzetify'}`));
            const description = document.createElement('p');
            description.className = 'community-detail-description';
            description.textContent = recipe.description || '';
            intro.append(title, author);
            if (recipe.description) {
                intro.append(description);
            }
            content.append(intro);

            const stats = document.createElement('div');
            stats.className = 'community-detail-stats';
            [
                ['far fa-clock', 'Zubereitungszeit', recipe.prepTime ? `${recipe.prepTime} Min.` : 'Nicht angegeben'],
                ['fas fa-utensils', 'Portionen', String(recipe.servings || 1)],
                ['fas fa-fire', 'Energie / Portion', getRecipeCalories(recipe) === null
                    ? 'Wird berechnet'
                    : `${new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 }).format(getRecipeCalories(recipe))} kcal`]
            ].forEach(([iconClass, label, value]) => {
                const stat = document.createElement('div');
                stat.className = 'community-detail-stat';
                const icon = document.createElement('i');
                icon.className = iconClass;
                icon.setAttribute('aria-hidden', 'true');
                const copy = document.createElement('span');
                const statLabel = document.createElement('small');
                statLabel.textContent = label;
                const statValue = document.createElement('strong');
                statValue.textContent = value;
                if (label === 'Energie / Portion') {
                    statValue.dataset.communityNutritionKcal = '';
                }
                copy.append(statLabel, statValue);
                stat.append(icon, copy);
                stats.append(stat);
            });
            content.append(stats);

            const actionBar = document.createElement('div');
            actionBar.className = 'community-detail-actions';
            const favoriteButton = createCommunityDetailFavoriteButton(recipe.id);
            const saveButton = document.createElement('button');
            saveButton.type = 'button';
            saveButton.className = 'btn btn-primary-custom community-detail-save';
            saveButton.dataset.saveCommunityRecipeId = recipe.id;
            const alreadySaved = recipes.some((entry) => entry.sourceCommunityId === recipe.id);
            const saveIcon = document.createElement('i');
            saveIcon.className = alreadySaved ? 'fas fa-check' : 'far fa-bookmark';
            saveIcon.setAttribute('aria-hidden', 'true');
            saveButton.append(saveIcon, document.createTextNode(
                alreadySaved ? ' Bereits in deiner Sammlung' : ' Zur Sammlung hinzufügen'
            ));
            saveButton.disabled = alreadySaved;
            actionBar.append(favoriteButton, saveButton);
            content.append(actionBar);

            const ingredientsSection = document.createElement('section');
            ingredientsSection.className = 'community-detail-section';
            const ingredientsHeading = document.createElement('h3');
            ingredientsHeading.textContent = 'Zutaten';
            const ingredientsSubtitle = document.createElement('p');
            ingredientsSubtitle.className = 'community-detail-section-note';
            ingredientsSubtitle.textContent = `Alles für ${recipe.servings || 1} Portionen`;
            ingredientsSection.append(
                ingredientsHeading,
                ingredientsSubtitle,
                createCommunityIngredients(recipe)
            );
            content.append(ingredientsSection);

            const instructionsSection = document.createElement('section');
            instructionsSection.className = 'community-detail-section community-detail-instructions';
            const instructionsHeading = document.createElement('h3');
            instructionsHeading.textContent = 'Zubereitung';
            const instructionsList = document.createElement('ol');
            instructionsList.className = 'community-instruction-list';
            const instructions = Array.isArray(recipe.instructions)
                ? recipe.instructions
                : String(recipe.instructions || '').split('\n').map((step) => step.trim()).filter(Boolean);
            instructions.forEach((instruction) => {
                const item = document.createElement('li');
                item.textContent = instruction;
                instructionsList.append(item);
            });
            instructionsSection.append(instructionsHeading, instructionsList);
            content.append(instructionsSection);

            const nutrition = createRecipeNutritionDisplay(recipe);
            nutrition.classList.add('community-detail-nutrition');
            content.append(nutrition);
            detail.append(content);
            communityRecipeDetails.append(detail);
            void requestNutritionEstimate(recipe);
        } catch (error) {
            communityRecipeTitle.textContent = 'Community-Rezept';
            communityRecipeDetails.replaceChildren();
            showMessage(error.message || 'Community-Rezept konnte nicht geladen werden.');
        }
    }

    // Füllt die Rezeptauswahl des Planformulars neu und sperrt sie bei leerer Sammlung.
    function updateRecipeOptions() {
        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = recipes.length ? 'Rezept auswählen' : 'Zuerst ein Rezept speichern';
        planRecipe.replaceChildren(placeholder);
        recipes.forEach((recipe) => {
            const option = document.createElement('option');
            option.value = recipe.id;
            option.textContent = recipe.title;
            planRecipe.append(option);
        });
        planServings.value = '';
        planServings.disabled = true;
        document.querySelector('#save-plan-button').disabled = recipes.length === 0;
    }

    // Übernimmt die Standard-Portionszahl des gewählten Rezepts ins Planformular.
    function updatePlanServingsFromRecipe() {
        const recipe = recipes.find((entry) => entry.id === planRecipe.value);
        planServings.disabled = !recipe;
        planServings.value = recipe ? String(recipe.servings || 1) : '';
    }

    // Lädt eigene Rezepte und stößt danach die davon abhängigen Listen und Kalender an.
    async function loadRecipes() {
        try {
            const response = await apiRequest('/api/recipes');
            const data = await readResponse(response, 'Rezepte konnten nicht geladen werden.');
            recipes.splice(0, recipes.length, ...data);
            renderRecipeList();
            renderFavoriteRecipes();
            recipeCount.textContent = `${data.length} ${data.length === 1 ? 'Rezept' : 'Rezepte'}`;
            updateRecipeOptions();
            renderPlanView();
            renderCommunityRecipes();
            void requestNutritionEstimates(data);
        } catch (error) {
            showMessage(error.message || 'Verbindung zum Server fehlgeschlagen.');
        }
    }

    // Bestimmt je nach Ansichtsmodus den ausgewählten Tag oder die zugehörige Montag-bis-Sonntag-Woche.
    function getSelectedRange() {
        const viewDate = planViewDate.value || getLocalDateString();
        const selectedDate = new Date(`${viewDate}T00:00:00`);
        if (planPeriod.value === 'day') {
            return { start: viewDate, end: viewDate };
        }
        const start = new Date(selectedDate);
        const daysSinceMonday = (start.getDay() + 6) % 7;
        start.setDate(start.getDate() - daysSinceMonday);
        const end = new Date(start);
        end.setDate(end.getDate() + 6);
        return { start: getLocalDateString(start), end: getLocalDateString(end) };
    }

    // Berechnet eine Live-Vorschau mit Grundumsatz, Aktivitätsfaktor und gewähltem Ziel.
    function calculateCalorieGoalPreview() {
        const gender = document.querySelector('#calorie-goal-gender').value;
        const age = Number(document.querySelector('#calorie-goal-age').value);
        const heightCm = Number(document.querySelector('#calorie-goal-height').value);
        const weightKg = Number(document.querySelector('#calorie-goal-weight').value);
        const activityLevel = document.querySelector('#calorie-goal-activity').value;
        const goal = document.querySelector('#calorie-goal-purpose').value;
        const activityFactors = {
            sedentary: 1.2,
            lightly_active: 1.375,
            moderately_active: 1.55,
            very_active: 1.725,
            extra_active: 1.9
        };
        const adjustments = { lose: -500, maintain: 0, gain: 500 };

        if (!calorieGoalForm.checkValidity() || !Object.hasOwn(activityFactors, activityLevel)
            || !Object.hasOwn(adjustments, goal)) {
            calorieGoalPreview.classList.remove('has-value');
            const icon = document.createElement('span');
            icon.className = 'calorie-goal-preview-empty-icon';
            icon.setAttribute('aria-hidden', 'true');
            const iconElement = document.createElement('i');
            iconElement.className = 'fas fa-chart-line';
            icon.append(iconElement);
            const copy = document.createElement('span');
            copy.className = 'calorie-goal-result-copy';
            const label = document.createElement('span');
            label.className = 'calorie-goal-result-label';
            label.textContent = 'Dein Ergebnis';
            const message = document.createElement('span');
            message.textContent = 'Ergänze deine Angaben und dein Tagesziel erscheint hier live.';
            copy.append(label, message);
            calorieGoalPreview.replaceChildren(icon, copy);
            return null;
        }

        const basalMetabolicRate = 10 * weightKg + 6.25 * heightCm - 5 * age
            + (gender === 'male' ? 5 : -161);
        const maintenanceCalories = Math.round(basalMetabolicRate * activityFactors[activityLevel]);
        const targetCalories = Math.max(0, maintenanceCalories + adjustments[goal]);
        const formatter = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 });
        calorieGoalPreview.classList.add('has-value');
        const icon = document.createElement('span');
        icon.className = 'calorie-goal-result-icon';
        icon.setAttribute('aria-hidden', 'true');
        const iconElement = document.createElement('i');
        iconElement.className = 'fas fa-fire';
        icon.append(iconElement);
        const copy = document.createElement('span');
        copy.className = 'calorie-goal-result-copy';
        const resultLabel = document.createElement('span');
        resultLabel.className = 'calorie-goal-result-label';
        resultLabel.textContent = 'Dein tägliches Ziel';
        const target = document.createElement('strong');
        target.textContent = formatter.format(targetCalories);
        const unit = document.createElement('span');
        unit.className = 'calorie-goal-result-unit';
        unit.textContent = 'Kilokalorien pro Tag';
        const details = document.createElement('span');
        details.className = 'calorie-goal-result-details';
        const maintenance = document.createElement('span');
        const maintenanceLabel = document.createElement('span');
        maintenanceLabel.textContent = 'Zum Gewicht halten';
        const maintenanceValue = document.createElement('strong');
        maintenanceValue.textContent = `${formatter.format(maintenanceCalories)} kcal`;
        maintenance.append(maintenanceLabel, maintenanceValue);
        const adjustment = document.createElement('span');
        const adjustmentValue = adjustments[goal];
        const adjustmentLabel = document.createElement('span');
        adjustmentLabel.textContent = 'Deine Zielanpassung';
        const adjustmentAmount = document.createElement('strong');
        adjustmentAmount.textContent = `${adjustmentValue > 0 ? '+' : ''}${formatter.format(adjustmentValue)} kcal`;
        adjustment.append(adjustmentLabel, adjustmentAmount);
        details.append(maintenance, adjustment);
        copy.append(resultLabel, target, unit, details);
        calorieGoalPreview.replaceChildren(icon, copy);
        return { maintenanceCalories, targetCalories };
    }

    // Wandelt den Fortschritt zum Tagesziel in einen Farbton von Grün bis Rot um.
    function getCalorieStatusHue(consumedCalories, targetCalories) {
        const progressToLimit = targetCalories > 0
            ? (consumedCalories / targetCalories - 0.75) / 0.5
            : consumedCalories > 0 ? 1 : 0;
        const redIntensity = Math.min(1, Math.max(0, progressToLimit));
        return Math.round(145 * (1 - redIntensity));
    }

    // Summiert die Kalorien des ausgewählten Plantags und stellt Schätzstatus und Zielvergleich dar.
    function updateCalendarNutritionTotal() {
        const calorieTotal = document.querySelector('#plan-calorie-total');
        const selectedDate = planViewDate.value || getLocalDateString();
        const { totalCalories, unavailableCount, pendingCount } = getDayNutrition(selectedDate);
        updateDashboardCalorieSummary(selectedDate, totalCalories, unavailableCount, pendingCount);
        if (!calorieTotal) {
            return;
        }

        const label = calorieTotal.querySelector('span');
        const numberFormatter = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 });
        calorieTotal.classList.toggle('is-unavailable', unavailableCount > 0 && pendingCount === 0);
        calorieTotal.classList.remove('has-goal-comparison');
        calorieTotal.style.removeProperty('--calorie-status-hue');
        if (pendingCount > 0) {
            label.textContent = 'Kalorien werden berechnet …';
        } else if (unavailableCount > 0) {
            label.textContent = totalCalories > 0
                ? `≥ ${numberFormatter.format(totalCalories)} kcal`
                : 'Kalorien nicht verfügbar';
        } else {
            const roundedTotal = Math.round(totalCalories);
            label.textContent = `${numberFormatter.format(roundedTotal)} kcal`;
            if (calorieGoal) {
                calorieTotal.style.setProperty(
                    '--calorie-status-hue',
                    getCalorieStatusHue(roundedTotal, calorieGoal.targetCalories)
                );
                calorieTotal.classList.add('has-goal-comparison');
            }
        }
        calorieTotal.title = unavailableCount > 0
            ? 'Für mindestens ein Gericht ist keine Nährwertschätzung verfügbar.'
            : calorieGoal
                ? 'Vergleich der geschätzten Kalorien aus den geplanten Gerichten am ausgewählten Tag mit deinem persönlichen Tagesziel.'
                : 'Geschätzte Gesamtkalorien für alle Portionen am ausgewählten Tag.';
    }

    // Summiert Portionen für einen Tag und unterscheidet fehlende von noch laufenden Schätzungen.
    function getDayNutrition(selectedDate) {
        const selectedDayPlans = mealPlans.filter((plan) => plan.date === selectedDate);
        let totalCalories = 0;
        let unavailableCount = 0;
        let pendingCount = 0;
        selectedDayPlans.forEach((plan) => {
            const recipe = recipes.find((entry) => entry.id === plan.recipeId);
            if (!recipe) {
                unavailableCount += 1;
                return;
            }

            const caloriesPerServing = getRecipeCalories(recipe);
            if (caloriesPerServing === null) {
                const key = getNutritionEstimateKey(recipe);
                if (pendingNutritionEstimates.has(key) || !nutritionEstimates.has(key)) {
                    pendingCount += 1;
                } else {
                    unavailableCount += 1;
                }
                return;
            }
            totalCalories += caloriesPerServing * (Number(plan.servings) || Number(recipe.servings) || 1);
        });

        return { totalCalories, unavailableCount, pendingCount };
    }

    // Zeigt Tagesziel und verbleibende beziehungsweise überschrittene Kalorien im Dashboard.
    function updateDashboardCalorieSummary(selectedDate, totalCalories, unavailableCount, pendingCount) {
        if (!dashboardCalorieTarget || !dashboardCalorieBalance) {
            return;
        }

        const date = new Date(`${selectedDate}T00:00:00`);
        dashboardCalorieDate.textContent = new Intl.DateTimeFormat('de-DE', {
            weekday: 'long',
            day: 'numeric',
            month: 'long'
        }).format(date);
        dashboardCalorieSummary.classList.remove('has-goal-comparison', 'is-unavailable');
        dashboardCalorieSummary.style.removeProperty('--calorie-status-hue');
        dashboardCalorieBalance.classList.remove('is-deficit', 'is-surplus', 'is-unavailable');
        dashboardCalorieTarget.textContent = calorieGoal
            ? `${new Intl.NumberFormat('de-DE').format(calorieGoal.targetCalories)} kcal`
            : 'Ziel einrichten';
        if (!calorieGoal) {
            dashboardCalorieBalance.textContent = 'Persönliches Tagesziel festlegen';
            return;
        }

        const numberFormatter = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 });
        if (pendingCount > 0) {
            dashboardCalorieBalance.textContent = 'Tagesverbrauch wird berechnet …';
            dashboardCalorieBalance.classList.add('is-unavailable');
        } else if (unavailableCount > 0) {
            dashboardCalorieBalance.textContent = totalCalories > 0
                ? `Mindestens ${numberFormatter.format(totalCalories)} kcal · Bilanz unvollständig`
                : 'Tagesverbrauch nicht verfügbar';
            dashboardCalorieBalance.classList.add('is-unavailable');
            dashboardCalorieSummary.classList.add('is-unavailable');
        } else {
            const roundedTotal = Math.round(totalCalories);
            dashboardCalorieSummary.style.setProperty(
                '--calorie-status-hue',
                getCalorieStatusHue(roundedTotal, calorieGoal.targetCalories)
            );
            dashboardCalorieSummary.classList.add('has-goal-comparison');
            const difference = calorieGoal.targetCalories - roundedTotal;
            if (difference > 0) {
                dashboardCalorieBalance.textContent = `${numberFormatter.format(roundedTotal)} kcal eingeplant · ${numberFormatter.format(difference)} kcal übrig`;
                dashboardCalorieBalance.classList.add('is-deficit');
            } else if (difference < 0) {
                dashboardCalorieBalance.textContent = `${numberFormatter.format(roundedTotal)} kcal eingeplant · ${numberFormatter.format(Math.abs(difference))} kcal Überschuss`;
                dashboardCalorieBalance.classList.add('is-surplus');
            } else {
                dashboardCalorieBalance.textContent = `${numberFormatter.format(roundedTotal)} kcal eingeplant · Tagesziel erreicht`;
            }
        }
    }

    // Befüllt das Ziel-Formular aus gespeicherten Werten oder setzt es auf Startwerte zurück.
    function populateCalorieGoalForm(goal) {
        document.querySelector('#calorie-goal-gender').value = goal?.gender || '';
        document.querySelector('#calorie-goal-age').value = goal?.age ?? '';
        document.querySelector('#calorie-goal-height').value = goal?.heightCm ?? '';
        document.querySelector('#calorie-goal-weight').value = goal?.weightKg ?? '';
        document.querySelector('#calorie-goal-activity').value = goal?.activityLevel || '';
        document.querySelector('#calorie-goal-purpose').value = goal?.goal || 'maintain';
        calorieGoalForm.dataset.validationShown = 'false';
        calorieGoalForm.querySelectorAll('input, select').forEach((field) => {
            field.dataset.touched = 'false';
            setCalorieGoalFieldError(field, false);
        });
        document.querySelector('#calorie-goal-validation-summary').hidden = true;
        calorieGoalResetButton.hidden = !goal;
        if (goal) {
            calculateCalorieGoalPreview();
        } else {
            calorieGoalPreview.classList.remove('has-value');
            calculateCalorieGoalPreview();
        }
    }

    // Verknüpft die Formularprüfung mit einer sichtbaren Fehlermeldung am jeweiligen Feld.
    function setCalorieGoalFieldError(field, show = false) {
        const errorElement = document.querySelector(`#${field.id}-error`);
        const fieldContainer = field.closest('.calorie-goal-field');
        const shouldShow = show && !field.validity.valid;
        const message = field.validity.valueMissing
            ? 'Bitte fülle dieses Feld aus.'
            : field.validity.rangeUnderflow || field.validity.rangeOverflow
                ? field.id === 'calorie-goal-age'
                    ? 'Bitte gib ein Alter zwischen 18 und 100 Jahren ein.'
                    : field.id === 'calorie-goal-height'
                        ? 'Bitte gib eine Größe zwischen 100 und 250 cm ein.'
                        : 'Bitte gib ein Gewicht zwischen 30 und 350 kg ein.'
                : field.validity.stepMismatch
                    ? 'Bitte gib einen gültigen Wert ein.'
                    : field.validity.badInput
                        ? 'Bitte gib eine gültige Zahl ein.'
                        : '';

        field.classList.toggle('is-invalid', shouldShow);
        field.setAttribute('aria-invalid', String(shouldShow));
        fieldContainer?.classList.toggle('has-error', shouldShow);
        if (errorElement) {
            errorElement.textContent = shouldShow ? message : '';
        }
        return !shouldShow;
    }

    // Prüft alle Felder und blendet bei Fehlern eine Zusammenfassung sowie Feldhinweise ein.
    function validateCalorieGoalForm() {
        calorieGoalForm.dataset.validationShown = 'true';
        const fields = [...calorieGoalForm.querySelectorAll('input, select')];
        let firstInvalidField = null;
        fields.forEach((field) => {
            field.dataset.touched = 'true';
            if (!setCalorieGoalFieldError(field, true) && !firstInvalidField) {
                firstInvalidField = field;
            }
        });
        document.querySelector('#calorie-goal-validation-summary').hidden = !firstInvalidField;
        if (firstInvalidField) {
            firstInvalidField.focus();
            return false;
        }
        return true;
    }

    // Lädt das persönliche Tagesziel und aktualisiert Formular und Kalorienanzeigen.
    async function loadCalorieGoal() {
        try {
            const response = await apiRequest('/api/calorie-goal');
            const data = await readResponse(response, 'Kalorienziel konnte nicht geladen werden.');
            calorieGoal = data.goal;
            populateCalorieGoalForm(calorieGoal);
            updateCalendarNutritionTotal();
        } catch (error) {
            showMessage(error.message || 'Kalorienziel konnte nicht geladen werden.');
        }
    }

    // Validiert und speichert das Tagesziel; danach werden alle Vergleiche neu berechnet.
    async function saveCalorieGoal(event) {
        event.preventDefault();
        if (!validateCalorieGoalForm()) {
            return;
        }
        const saveButton = document.querySelector('#save-calorie-goal-button');
        saveButton.disabled = true;
        const values = {
            gender: document.querySelector('#calorie-goal-gender').value,
            age: Number(document.querySelector('#calorie-goal-age').value),
            heightCm: Number(document.querySelector('#calorie-goal-height').value),
            weightKg: Number(document.querySelector('#calorie-goal-weight').value),
            activityLevel: document.querySelector('#calorie-goal-activity').value,
            goal: document.querySelector('#calorie-goal-purpose').value
        };
        try {
            const response = await apiRequest('/api/calorie-goal', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values)
            });
            const data = await readResponse(response, 'Kalorienziel konnte nicht gespeichert werden.');
            calorieGoal = data.goal;
            populateCalorieGoalForm(calorieGoal);
            updateCalendarNutritionTotal();
            bootstrap.Modal.getOrCreateInstance(calorieGoalModal).hide();
            showToast(data.message, { title: 'Kalorienziel gespeichert', icon: 'fa-bullseye' });
        } catch (error) {
            showMessage(error.message || 'Kalorienziel konnte nicht gespeichert werden.');
        } finally {
            saveButton.disabled = false;
        }
    }

    // Löscht das gespeicherte Tagesziel nach Bestätigung und setzt die Anzeigen zurück.
    async function resetCalorieGoal() {
        const goalModal = bootstrap.Modal.getOrCreateInstance(calorieGoalModal);
        const goalModalHidden = new Promise((resolve) => {
            // Erst wenn dieses Fenster wirklich geschlossen ist, wird der Bestätigungsdialog geöffnet.
            calorieGoalModal.addEventListener('hidden.bs.modal', resolve, { once: true });
        });
        goalModal.hide();
        await goalModalHidden;

        const confirmed = await requestConfirmation({
            title: 'Kalorienziel zurücksetzen?',
            message: 'Dein gespeichertes Kalorienziel und die zugehörigen Angaben werden gelöscht. Die Kalenderanzeige vergleicht danach keine Kalorien mehr mit einem Ziel.',
            confirmLabel: 'Kalorienziel löschen',
            tone: 'warning',
            icon: 'fa-undo'
        });
        if (!confirmed) {
            goalModal.show();
            return;
        }

        calorieGoalResetButton.disabled = true;
        try {
            const response = await apiRequest('/api/calorie-goal', { method: 'DELETE' });
            const data = await readResponse(response, 'Kalorienziel konnte nicht zurückgesetzt werden.');
            calorieGoal = null;
            populateCalorieGoalForm(null);
            updateCalendarNutritionTotal();
            showToast(data.message, { title: 'Kalorienziel zurückgesetzt', icon: 'fa-undo' });
        } catch (error) {
            showMessage(error.message || 'Kalorienziel konnte nicht zurückgesetzt werden.');
        } finally {
            calorieGoalResetButton.disabled = false;
        }
    }

    // Rendert Kalender und Einkaufsliste; in der Wochenansicht lassen sich weitere Tagesgerichte aufklappen.
    function renderPlanView() {
        const range = getSelectedRange();
        const selectedPlans = mealPlans
            .filter((plan) => plan.date >= range.start && plan.date <= range.end)
            .sort((first, second) => first.date.localeCompare(second.date));
        const dateFormatter = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const weekdayFormatter = new Intl.DateTimeFormat('de-DE', { weekday: 'long' });
        const rangeLabel = range.start === range.end
            ? dateFormatter.format(new Date(`${range.start}T00:00:00`))
            : `${dateFormatter.format(new Date(`${range.start}T00:00:00`))} – ${dateFormatter.format(new Date(`${range.end}T00:00:00`))}`;
        document.querySelector('#plan-range-label').textContent = rangeLabel;
        const visibleCount = document.querySelector('#plan-visible-count');
        const visibleCountLabel = visibleCount.querySelector('span');
        visibleCountLabel.textContent = `${selectedPlans.length} ${selectedPlans.length === 1 ? 'Gericht' : 'Gerichte'}`;
        visibleCount.classList.toggle('has-plans', selectedPlans.length > 0);
        updateCalendarNutritionTotal();

        const calendarDays = [];
        const currentDate = new Date(`${range.start}T00:00:00`);
        const endDate = new Date(`${range.end}T00:00:00`);
        while (currentDate <= endDate) {
            const dateString = getLocalDateString(currentDate);
            const dayPlans = selectedPlans.filter((plan) => plan.date === dateString);
            const day = document.createElement('section');
            day.className = `meal-calendar-day${dateString === getLocalDateString() ? ' is-today' : ''}${dayPlans.length ? ' has-meals' : ''}`;
            day.dataset.mealCount = String(dayPlans.length);
            day.setAttribute('role', 'listitem');

            const heading = document.createElement('button');
            heading.type = 'button';
            heading.className = 'meal-calendar-heading';
            heading.dataset.calendarDate = dateString;
            heading.setAttribute(
                'aria-label',
                planPeriod.value === 'week'
                    ? `Tagesansicht für ${weekdayFormatter.format(currentDate)}, ${dateFormatter.format(currentDate)} mit ${dayPlans.length} geplanten ${dayPlans.length === 1 ? 'Gericht' : 'Gerichten'} anzeigen`
                    : `${weekdayFormatter.format(currentDate)}, ${dateFormatter.format(currentDate)}`
            );
            heading.disabled = planPeriod.value === 'day';
            const weekday = document.createElement('span');
            weekday.className = 'meal-calendar-weekday';
            weekday.textContent = weekdayFormatter.format(currentDate);
            const date = document.createElement('time');
            date.dateTime = dateString;
            date.textContent = dateFormatter.format(currentDate);
            heading.append(weekday, date);
            const dayCount = document.createElement('span');
            dayCount.className = `meal-calendar-day-count${dayPlans.length ? ' has-meals' : ''}`;
            dayCount.textContent = dayPlans.length
                ? `${dayPlans.length} ${dayPlans.length === 1 ? 'Gericht' : 'Gerichte'}`
                : 'Frei';
            heading.append(dayCount);

            const mealList = document.createElement('div');
            mealList.className = 'meal-calendar-meal-list';
            const visiblePlans = planPeriod.value === 'week' ? dayPlans.slice(0, 2) : dayPlans;
            mealList.append(...visiblePlans.map(createMealPlanEvent));
            day.append(heading);

            if (dayPlans.length === 0) {
                const emptyDay = document.createElement('p');
                emptyDay.className = 'meal-calendar-empty';
                emptyDay.textContent = planPeriod.value === 'day'
                    ? 'Für diesen Tag ist noch nichts geplant.'
                    : 'Noch nichts geplant';
                day.append(emptyDay);
            } else {
                day.append(mealList);
                if (planPeriod.value === 'week' && dayPlans.length > visiblePlans.length) {
                    const moreButton = document.createElement('button');
                    moreButton.type = 'button';
                    moreButton.className = 'meal-calendar-more';
                    moreButton.dataset.calendarDate = dateString;
                    moreButton.textContent = `Alle ${dayPlans.length} Gerichte ansehen`;
                    const arrow = document.createElement('i');
                    arrow.className = 'fas fa-arrow-right';
                    arrow.setAttribute('aria-hidden', 'true');
                    moreButton.append(arrow);
                    day.append(moreButton);
                }
            }
            calendarDays.push(day);
            currentDate.setDate(currentDate.getDate() + 1);
        }
        planCalendar.classList.toggle('is-week', planPeriod.value === 'week');
        planCalendar.classList.toggle('is-day', planPeriod.value === 'day');
        planCalendar.replaceChildren(...calendarDays);
        planEmptyState.hidden = selectedPlans.length > 0;

        const ingredients = new Map();
        selectedPlans.forEach((plan) => {
            const recipe = recipes.find((entry) => entry.id === plan.recipeId);
            if (!recipe) {
                return;
            }
            recipe.ingredients.forEach((ingredient) => {
                const cleanIngredient = ingredient.trim();
                const normalizedIngredient = cleanIngredient.toLocaleLowerCase('de-DE');
                if (cleanIngredient) {
                    const existingIngredient = ingredients.get(normalizedIngredient);
                    if (existingIngredient) {
                        existingIngredient.count += 1;
                    } else {
                        ingredients.set(normalizedIngredient, { ingredient: cleanIngredient, count: 1 });
                    }
                }
            });
        });
        const shoppingItems = [...ingredients.values()].sort((first, second) => first.ingredient.localeCompare(second.ingredient, 'de'));
        shoppingList.replaceChildren(...shoppingItems.map(({ ingredient, count }) => {
            const item = document.createElement('li');
            item.textContent = count > 1 ? `${ingredient} (in ${count} geplanten Gerichten)` : ingredient;
            return item;
        }));
        shoppingEmptyState.hidden = shoppingItems.length > 0;

    }

    // Baut einen Kalendereintrag samt Portionen und Entfernen-Aktion für einen Plan.
    function createMealPlanEvent(plan) {
        const recipe = recipes.find((entry) => entry.id === plan.recipeId);
        const meal = document.createElement('article');
        meal.className = 'meal-calendar-event';
        const title = document.createElement('strong');
        title.className = 'meal-calendar-event-title';
        title.textContent = recipe ? recipe.title : 'Rezept nicht mehr verfügbar';
        title.title = title.textContent;
        meal.append(title);
        if (recipe) {
            const servings = document.createElement('small');
            servings.className = 'meal-calendar-event-servings';
            const servingCount = Number(plan.servings) || Number(recipe.servings) || 1;
            servings.textContent = `${servingCount} ${servingCount === 1 ? 'Portion' : 'Portionen'}`;
            meal.append(servings);
        }

        const removeButton = document.createElement('button');
        removeButton.type = 'button';
        removeButton.className = 'meal-calendar-remove';
        removeButton.dataset.planId = plan.id;
        removeButton.setAttribute('aria-label', `${recipe ? recipe.title : 'Gericht'} aus dem Plan entfernen`);
        removeButton.title = 'Aus dem Plan entfernen';
        const removeIcon = document.createElement('i');
        removeIcon.className = 'fas fa-times';
        removeIcon.setAttribute('aria-hidden', 'true');
        removeButton.append(removeIcon);
        meal.append(removeButton);
        return meal;
    }

    // Lädt geplante Gerichte vom Server und zeichnet den Kalender neu.
    async function loadPlans() {
        try {
            const response = await apiRequest('/api/plans');
            mealPlans = await readResponse(response, 'Essensplan konnte nicht geladen werden.');
            renderPlanView();
        } catch (error) {
            showMessage(error.message || 'Verbindung zum Server fehlgeschlagen.');
        }
    }

    // Zeigt den iCal-Link an und erzeugt daraus die abonnierbare webcal-Adresse.
    function showCalendarFeedUrl(url) {
        calendarFeedUrl.value = url;
        subscribeCalendarLink.href = url.replace(/^https?:/, 'webcal:');
    }

    // Lädt Einkaufstag und persönlichen Kalender-Link in die Einstellungen.
    async function loadCalendarSettings() {
        try {
            const response = await apiRequest('/api/calendar/settings');
            const settings = await readResponse(response, 'Kalender-Einstellungen konnten nicht geladen werden.');
            shoppingWeekday.value = String(settings.shoppingWeekday);
            showCalendarFeedUrl(settings.feedUrl);
        } catch (error) {
            showMessage(error.message || 'Kalender-Einstellungen konnten nicht geladen werden.');
        }
    }

    // Aktualisiert die Zielvorschau sowohl beim Tippen als auch bei Auswahländerungen.
    calorieGoalForm.addEventListener('input', calculateCalorieGoalPreview);
    calorieGoalForm.addEventListener('change', calculateCalorieGoalPreview);
    // Markiert ein verlassenes Feld als bearbeitet, damit sein Hinweis sichtbar werden darf.
    calorieGoalForm.addEventListener('focusout', (event) => {
        const field = event.target;
        if (!(field instanceof HTMLInputElement || field instanceof HTMLSelectElement)) {
            return;
        }
        field.dataset.touched = 'true';
        setCalorieGoalFieldError(field, true);
    });
    // Zeigt nach Beginn der Eingabe Feldfehler und blendet eine erledigte Gesamtmeldung aus.
    calorieGoalForm.addEventListener('input', (event) => {
        const field = event.target;
        if (!(field instanceof HTMLInputElement || field instanceof HTMLSelectElement)) {
            return;
        }
        if (field.dataset.touched === 'true' || calorieGoalForm.dataset.validationShown === 'true') {
            setCalorieGoalFieldError(field, true);
        }
        if (calorieGoalForm.checkValidity()) {
            document.querySelector('#calorie-goal-validation-summary').hidden = true;
        }
    });
    // Wiederholt dieselbe Prüfung bei Auswahlfeldern, die erst bei Änderung einen Wert liefern.
    calorieGoalForm.addEventListener('change', (event) => {
        const field = event.target;
        if (!(field instanceof HTMLInputElement || field instanceof HTMLSelectElement)) {
            return;
        }
        if (field.dataset.touched === 'true' || calorieGoalForm.dataset.validationShown === 'true') {
            setCalorieGoalFieldError(field, true);
        }
        if (calorieGoalForm.checkValidity()) {
            document.querySelector('#calorie-goal-validation-summary').hidden = true;
        }
    });
    // Formularaktionen werden von den zentralen Funktionen geprüft und gespeichert.
    calorieGoalForm.addEventListener('submit', saveCalorieGoal);
    calorieGoalResetButton.addEventListener('click', resetCalorieGoal);

    // Speichert den gewählten Einkaufstag und meldet das Ergebnis, ohne Doppelklicks zuzulassen.
    calendarSettingsForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const saveButton = document.querySelector('#save-calendar-settings');
        saveButton.disabled = true;
        calendarSettingsStatus.textContent = '';
        try {
            const response = await apiRequest('/api/calendar/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ shoppingWeekday: Number(shoppingWeekday.value) })
            });
            const data = await readResponse(response, 'Einkaufstag konnte nicht gespeichert werden.');
            calendarSettingsStatus.textContent = '';
            calendarSettingsStatus.className = 'small';
            showToast(data.message, { title: 'Einkaufstag gespeichert', icon: 'fa-calendar-check' });
        } catch (error) {
            calendarSettingsStatus.textContent = '';
            calendarSettingsStatus.className = 'small';
            showMessage(error.message || 'Einkaufstag konnte nicht gespeichert werden.');
        } finally {
            saveButton.disabled = false;
        }
    });

    // Kopiert den persönlichen iCal-Link; bei fehlender Zwischenablage kann er manuell kopiert werden.
    document.querySelector('#copy-calendar-link').addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(calendarFeedUrl.value);
            calendarSettingsStatus.textContent = '';
            calendarSettingsStatus.className = 'small';
            showToast('iCal-Link wurde kopiert.', { title: 'Link kopiert', icon: 'fa-link' });
        } catch (error) {
            calendarSettingsStatus.textContent = '';
            calendarSettingsStatus.className = 'small';
            showMessage('Der Link konnte nicht kopiert werden. Markiere ihn und kopiere ihn manuell.');
        }
    });

    // Erneuert den iCal-Link erst nach Warnbestätigung, da dadurch bestehende Abos ungültig werden.
    document.querySelector('#rotate-calendar-link').addEventListener('click', async (event) => {
        const confirmed = await requestConfirmation({
            title: 'Kalender-Link erneuern?',
            message: 'Der aktuelle Link wird ungültig. Kalender-Apps, die ihn bereits verwenden, können danach nicht mehr synchronisieren.',
            confirmLabel: 'Link erneuern',
            tone: 'warning',
            icon: 'fa-sync-alt'
        });
        if (!confirmed) {
            return;
        }
        const button = event.currentTarget;
        button.disabled = true;
        calendarSettingsStatus.textContent = '';
        try {
            const response = await apiRequest('/api/calendar/settings/rotate-link', { method: 'POST' });
            const settings = await readResponse(response, 'Kalender-Link konnte nicht erneuert werden.');
            showCalendarFeedUrl(settings.feedUrl);
            calendarSettingsStatus.textContent = '';
            calendarSettingsStatus.className = 'small';
            showToast(settings.message, { title: 'Kalender-Link erneuert', icon: 'fa-calendar-check' });
        } catch (error) {
            calendarSettingsStatus.textContent = '';
            calendarSettingsStatus.className = 'small';
            showMessage(error.message || 'Kalender-Link konnte nicht erneuert werden.');
        } finally {
            button.disabled = false;
        }
    });

    // Beide Erstell-Einstiege verwenden denselben zurücksetzenden Rezeptdialog.
    document.querySelector('#collection-new-recipe-button').addEventListener('click', openNewRecipeModal);

    // Öffnet Favoriten und hält beim Öffnen/Schließen Fokus sowie Barrierefreiheitsstatus aktuell.
    openFavoritesButton.addEventListener('click', openFavoritesView);
    favoriteCollection.addEventListener('shown.bs.modal', () => {
        openFavoritesButton.setAttribute('aria-expanded', 'true');
        favoriteSearch.focus();
    });
    favoriteCollection.addEventListener('hidden.bs.modal', () => {
        openFavoritesButton.setAttribute('aria-expanded', 'false');
    });
    // Wechselt aus den Favoriten zur Community und scrollt erst nach dem Schließen dorthin.
    document.querySelector('#favorite-discover-link').addEventListener('click', (event) => {
        event.preventDefault();
        hideFavoritesView(() => {
            document.querySelector('#community-collection').scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    });
    // Die Suche rendert Favoriten bei jeder Eingabe neu.
    favoriteSearch.addEventListener('input', renderFavoriteRecipes);
    // Filterbuttons werden gemeinsam behandelt und aktualisieren Auswahlzustand und Ergebnisliste.
    document.querySelector('.favorite-filter-group').addEventListener('click', (event) => {
        const filterButton = event.target.closest('[data-favorite-filter]');
        if (!filterButton) {
            return;
        }
        activeFavoriteFilter = filterButton.dataset.favoriteFilter;
        document.querySelectorAll('[data-favorite-filter]').forEach((button) => {
            const isActive = button === filterButton;
            button.classList.toggle('is-active', isActive);
            button.setAttribute('aria-pressed', String(isActive));
        });
        renderFavoriteRecipes();
    });
    // Delegiert Aktionen der dynamisch erzeugten Favoritenkarten an deren übergeordneten Container.
    favoriteRecipeList.addEventListener('click', (event) => {
        const favoriteButton = event.target.closest('[data-favorite-type]');
        if (favoriteButton) {
            toggleFavorite(favoriteButton.dataset.favoriteType, favoriteButton.dataset.favoriteId, favoriteButton);
            return;
        }
        const saveButton = event.target.closest('[data-save-community-recipe-id]');
        if (saveButton) {
            saveCommunityRecipe(saveButton.dataset.saveCommunityRecipeId, saveButton);
            return;
        }
        const communityButton = event.target.closest('[data-community-recipe-id]');
        if (communityButton) {
            hideFavoritesView(() => {
                void openCommunityRecipe(communityButton.dataset.communityRecipeId);
            });
            return;
        }
        const detailsButton = event.target.closest('[data-recipe-details-id]');
        if (detailsButton) {
            const recipe = recipes.find((entry) => entry.id === detailsButton.dataset.recipeDetailsId);
            if (recipe) {
                hideFavoritesView(() => {
                    void openRecipeDetails(recipe);
                });
            }
        }
    });

    // Suche und Sortierung aktualisieren die eigene Rezeptliste ohne erneuten API-Aufruf.
    recipeSearch.addEventListener('input', renderRecipeList);
    recipeSort.addEventListener('change', renderRecipeList);

    // Speichert neue oder bearbeitete Rezepte; nach Erfolg werden Sammlung und Community synchronisiert.
    recipeForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const saveButton = document.querySelector('#save-recipe-button');
        const formData = new FormData(recipeForm);
        const recipeTitle = formData.get('title').trim();
        const wasEditing = Boolean(editingRecipeId);
        const ingredients = formData.get('ingredients').split('\n').map((item) => item.trim()).filter(Boolean);
        saveButton.disabled = true;

        try {
            const response = await apiRequest(editingRecipeId
                ? `/api/recipes/${encodeURIComponent(editingRecipeId)}`
                : '/api/recipes', {
                method: editingRecipeId ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: formData.get('title').trim(),
                    description: formData.get('description').trim(),
                    ingredients,
                    instructions: formData.get('instructions').trim(),
                    prepTime: Number(formData.get('prepTime')) || null,
                    servings: Number(formData.get('servings')) || 1,
                    image: recipeImageData,
                    shareWithCommunity: document.querySelector('#share-recipe-with-community').checked
                })
            });
            const data = await readResponse(response, 'Rezept konnte nicht gespeichert werden.');

            recipeForm.reset();
            editingRecipeId = null;
            recipeImageData = null;
            recipeImagePreview.removeAttribute('src');
            recipeImagePreview.hidden = true;
            bootstrap.Modal.getOrCreateInstance(document.querySelector('#createRecipeModal')).hide();
            showToast(
                wasEditing
                    ? `„${recipeTitle}“ wurde aktualisiert.`
                    : `„${recipeTitle}“ wurde zu deiner Sammlung hinzugefügt.`,
                {
                    title: wasEditing ? 'Änderungen gespeichert' : 'Rezept gespeichert',
                    icon: wasEditing ? 'fa-pen' : 'fa-check'
                }
            );
            await loadRecipes();
            await loadCommunityRecipes();
        } catch (error) {
            showMessage(error.message || 'Verbindung zum Server fehlgeschlagen.');
        } finally {
            saveButton.disabled = false;
        }
    });

    // Prüft Cover-Typ und -Größe und lädt ein gültiges Bild als Vorschau und API-Daten.
    recipeImageInput.addEventListener('change', () => {
        const [file] = recipeImageInput.files;
        recipeImageData = null;
        recipeImagePreview.hidden = true;
        recipeImagePreview.removeAttribute('src');
        if (!file) {
            return;
        }
        if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type) || file.size > 3 * 1024 * 1024) {
            recipeImageInput.value = '';
            showMessage('Bitte wähle ein PNG-, JPG-, WebP- oder GIF-Bild mit höchstens 3 MB.');
            return;
        }
        const reader = new FileReader();
        // Übernimmt das gelesene Bild erst nach erfolgreichem Abschluss als Vorschau.
        reader.addEventListener('load', () => {
            if (typeof reader.result !== 'string') {
                showMessage('Das Rezept-Cover konnte nicht gelesen werden.');
                return;
            }
            recipeImageData = reader.result;
            recipeImagePreview.src = reader.result;
            recipeImagePreview.hidden = false;
        });
        // Meldet Lesefehler, statt ein unvollständiges Bild zu speichern.
        reader.addEventListener('error', () => showMessage('Das Rezept-Cover konnte nicht gelesen werden.'));
        reader.readAsDataURL(file);
    });
    // Filtert Community-Rezepte während der Eingabe und delegiert Kartenaktionen an die Liste.
    communitySearch.addEventListener('input', renderCommunityRecipes);
    communityRecipeList.addEventListener('click', (event) => {
        const favoriteButton = event.target.closest('[data-favorite-type]');
        if (favoriteButton) {
            toggleFavorite(favoriteButton.dataset.favoriteType, favoriteButton.dataset.favoriteId, favoriteButton);
            return;
        }
        const saveButton = event.target.closest('[data-save-community-recipe-id]');
        if (saveButton) {
            saveCommunityRecipe(saveButton.dataset.saveCommunityRecipeId, saveButton);
            return;
        }
        const recipeButton = event.target.closest('[data-community-recipe-id]');
        if (recipeButton) {
            openCommunityRecipe(recipeButton.dataset.communityRecipeId);
        }
    });
    // Delegiert Favoriten- und Detailaktionen aus den dynamischen Sammlungskarten.
    recipeList.addEventListener('click', (event) => {
        const favoriteButton = event.target.closest('[data-favorite-type]');
        if (favoriteButton) {
            toggleFavorite(favoriteButton.dataset.favoriteType, favoriteButton.dataset.favoriteId, favoriteButton);
            return;
        }
        const detailsButton = event.target.closest('[data-recipe-details-id]');
        if (detailsButton) {
            const recipe = recipes.find((entry) => entry.id === detailsButton.dataset.recipeDetailsId);
            if (recipe) {
                void openRecipeDetails(recipe);
            }
        }
    });
    // Favoritenknöpfe im Detailfenster werden hier unabhängig vom konkreten Rezept verarbeitet.
    recipeDetailsContent.addEventListener('click', (event) => {
        const favoriteButton = event.target.closest('[data-favorite-type]');
        if (favoriteButton) {
            toggleFavorite(favoriteButton.dataset.favoriteType, favoriteButton.dataset.favoriteId, favoriteButton);
        }
    });
    // Delegiert Favorisieren und Übernehmen innerhalb des Community-Detailfensters.
    communityRecipeDetails.addEventListener('click', (event) => {
        const favoriteButton = event.target.closest('[data-favorite-type]');
        if (favoriteButton) {
            toggleFavorite(favoriteButton.dataset.favoriteType, favoriteButton.dataset.favoriteId, favoriteButton);
            return;
        }
        const saveButton = event.target.closest('[data-save-community-recipe-id]');
        if (saveButton) {
            saveCommunityRecipe(saveButton.dataset.saveCommunityRecipeId, saveButton);
        }
    });

    // Legt das ausgewählte Rezept für Datum und Portionen im Wochenplan ab.
    planForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const saveButton = document.querySelector('#save-plan-button');
        saveButton.disabled = true;
        try {
            const response = await apiRequest('/api/plans', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recipeId: planRecipe.value,
                    date: planDate.value,
                    servings: Number(planServings.value)
                })
            });
            await readResponse(response, 'Gericht konnte nicht eingeplant werden.');
            planRecipe.value = '';
            updatePlanServingsFromRecipe();
            showMessage('Gericht wurde eingeplant.', true);
            await loadPlans();
        } catch (error) {
            showMessage(error.message || 'Verbindung zum Server fehlgeschlagen.');
        } finally {
            saveButton.disabled = recipes.length === 0;
        }
    });
    // Passt die vorgeschlagene Portionszahl an das ausgewählte Rezept an.
    planRecipe.addEventListener('change', updatePlanServingsFromRecipe);

    // Tagesklicks wechseln zur Tagesansicht und setzen zugleich das Planformular-Datum;
    // Entfernen-Aktionen fragen vorher nach und aktualisieren danach den Kalender.
    planCalendar.addEventListener('click', async (event) => {
        const dayButton = event.target.closest('[data-calendar-date]');
        if (dayButton) {
            planPeriod.value = 'day';
            planViewDate.value = dayButton.dataset.calendarDate;
            planDate.value = dayButton.dataset.calendarDate;
            renderPlanView();
            return;
        }

        const removeButton = event.target.closest('[data-plan-id]');
        if (!removeButton) {
            return;
        }
        const confirmed = await requestConfirmation({
            title: 'Gericht aus dem Plan entfernen?',
            message: 'Das Gericht wird aus deinem Wochenplan und der dazugehörigen Einkaufsliste entfernt. Dein Rezept bleibt gespeichert.',
            confirmLabel: 'Gericht entfernen'
        });
        if (!confirmed) {
            return;
        }

        removeButton.disabled = true;
        try {
            const response = await apiRequest(`/api/plans/${encodeURIComponent(removeButton.dataset.planId)}`, {
                method: 'DELETE'
            });
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Gericht konnte nicht entfernt werden.');
            }
            mealPlans = mealPlans.filter((plan) => plan.id !== removeButton.dataset.planId);
            renderPlanView();
            showMessage('Gericht wurde aus dem Plan entfernt.', true);
        } catch (error) {
            showMessage(error.message || 'Verbindung zum Server fehlgeschlagen.');
            removeButton.disabled = false;
        }
    });

    // Änderungen an Datum oder Zeitraum zeichnen den Kalender mit dem neuen Ausschnitt.
    planViewDate.addEventListener('change', renderPlanView);
    planPeriod.addEventListener('change', renderPlanView);
    // Blättert abhängig vom Modus einen Tag oder eine Woche zurück.
    document.querySelector('#plan-previous').addEventListener('click', () => {
        const date = new Date(`${planViewDate.value || getLocalDateString()}T00:00:00`);
        date.setDate(date.getDate() - (planPeriod.value === 'day' ? 1 : 7));
        planViewDate.value = getLocalDateString(date);
        renderPlanView();
    });
    // Blättert abhängig vom Modus einen Tag oder eine Woche vor.
    document.querySelector('#plan-next').addEventListener('click', () => {
        const date = new Date(`${planViewDate.value || getLocalDateString()}T00:00:00`);
        date.setDate(date.getDate() + (planPeriod.value === 'day' ? 1 : 7));
        planViewDate.value = getLocalDateString(date);
        renderPlanView();
    });
    // Setzt die Kalenderansicht auf heute zurück.
    document.querySelector('#plan-today').addEventListener('click', () => {
        planViewDate.value = getLocalDateString();
        renderPlanView();
    });

    // Entfernt Anmeldedaten erst nach Bestätigung und führt dann zurück zur Startseite.
    document.querySelector('#logout-button').addEventListener('click', async () => {
        const confirmed = await requestConfirmation({
            title: 'Möchtest du dich abmelden?',
            message: 'Bist du sicher, dass du Lezzetify jetzt verlassen möchtest?',
            confirmLabel: 'Abmelden',
            tone: 'warning',
            icon: 'fa-sign-out-alt'
        });
        if (!confirmed) {
            return;
        }

        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('email');
        window.location.replace('index.html');
    });

    // Der Schließen-Knopf verwendet denselben Ausblendablauf wie der automatische Toast-Timer.
    document.querySelector('#dashboard-toast-close').addEventListener('click', dismissDashboardToast);

    // Startwerte setzen, Ansichten initial zeichnen und die Datenbereiche parallel laden.
    const today = getLocalDateString();
    planDate.value = today;
    planViewDate.value = today;
    renderPlanView();
    loadRecipes();
    loadPlans();
    loadCommunityRecipes();
    loadFavorites();
    loadCalendarSettings();
    loadCalorieGoal();
}
