// Basis-URL des Backends. Die Frontend-Seite kommuniziert hier mit dem Server.
// Wichtig: Der Backend-Server muss lokal auf Port 3000 laufen.
const API_BASE_URL = 'http://localhost:3000';

// Referenzen auf die wichtigsten Formulare und UI-Elemente.
const loginForm = document.querySelector('#login-form');
const errorMessage = document.querySelector('#error-message');
const authHeading = document.querySelector('#auth-heading');

// Wenn zwischen den Tabs "Anmelden" und "Registrieren" gewechselt wird,
// wird der Titel der Karte entsprechend angepasst.
document.querySelectorAll('#authTabs [data-bs-toggle="tab"]').forEach((tab) => {
    tab.addEventListener('shown.bs.tab', (event) => {
        authHeading.textContent = event.target.id === 'register-tab' ? 'Willkommen!' : 'Willkommen zurück!';
    });
});

// Login-Logik: E-Mail + Passwort an das Backend senden.
if (loginForm) {
    loginForm.addEventListener('submit', async (event) => {
        // Verhindert das normale Neuladen der Seite beim Absenden des Formulars.
        event.preventDefault();

        // Alte Fehlermeldung vor dem neuen Loginversuch verbergen.
        if (errorMessage) {
            errorMessage.style.display = 'none';
            errorMessage.textContent = '';
        }

        // Eingaben aus dem Login-Formular holen.
        const email = document.querySelector('#loginEmail').value;
        const password = document.querySelector('#loginPassword').value;

        // Button während der Anfrage deaktivieren, damit keine Mehrfachanfragen entstehen.
        const submitButton = loginForm.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = 'Wird angemeldet …';

        try {
            // HTTP-Request an das Login-Endpoint des Backends.
            const response = await fetch(`${API_BASE_URL}/api/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            // Antwort als JSON lesen.
            const data = await response.json();

            // Wenn der Login erfolgreich war, werden Token und Userdaten lokal gespeichert.
            if (response.ok) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                localStorage.setItem('email', data.user.email);

                // Nach erfolgreichem Login zur Dashboard-Seite weiterleiten.
                window.location.href = 'dashboard.html';
            } else {
                // Falls Backend eine Fehlermeldung zurückgibt, diese anzeigen.
                if (errorMessage) {
                    errorMessage.textContent = data.error || 'Login fehlgeschlagen';
                    errorMessage.style.display = 'block';
                }
            }
        } catch {
            // Wenn kein Server erreichbar ist, z. B. wegen Backend-Problem oder Offline-Modus.
            if (errorMessage) {
                errorMessage.textContent = 'Verbindung zum Server fehlgeschlagen.';
                errorMessage.style.display = 'block';
            }
        } finally {
            // Egal ob Erfolg oder Fehler: Button wieder aktivieren und Text zurücksetzen.
            submitButton.disabled = false;
            submitButton.textContent = 'Einloggen';
        }
    });
}

// Registrierung: Neuer Benutzer wird angelegt und anschließend ebenfalls eingeloggt.
const registerForm = document.getElementById('register-form');
const registerMessage = document.getElementById('register-message');

if (registerForm) {
    registerForm.addEventListener('submit', async (event) => {
        // Das normale Absenden des Formulars unterdrücken, damit wir mit fetch arbeiten.
        event.preventDefault();

        // Eingaben aus dem Registrierungsformular lesen.
        const nameInput = document.getElementById('registerName').value.trim();
        const emailInput = document.getElementById('registerEmail').value;
        const passwordInput = document.getElementById('registerPassword').value;

        // Button für die Dauer der Registrierung deaktivieren.
        const submitButton = registerForm.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = 'Konto wird erstellt …';

        try {
            // POST-Request an das Backend, um einen neuen Benutzer zu erstellen.
            const response = await fetch(`${API_BASE_URL}/api/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: nameInput, email: emailInput, password: passwordInput })
            });

            const data = await response.json();

            // Erfolg oder Fehler anzeigen.
            registerMessage.textContent = data.message || data.error || 'Registrierung fehlgeschlagen.';
            registerMessage.className = `alert py-2 small ${response.ok ? 'alert-success' : 'alert-danger'}`;

            // Bei erfolgreicher Registrierung direkt speichern und weiterleiten.
            if (response.ok) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                localStorage.setItem('email', data.user.email);
                window.location.href = 'dashboard.html';
            }
        } catch {
            // Wenn der Server nicht erreichbar ist, eine verständliche Fehlermeldung zeigen.
            registerMessage.textContent = 'Verbindung zum Server fehlgeschlagen.';
            registerMessage.className = 'alert alert-danger py-2 small';
        } finally {
            // Button nach Abschluss wieder aktivieren.
            submitButton.disabled = false;
            submitButton.textContent = 'Konto erstellen';
        }
    });
}

// Passwort-Anzeige umschalten: Auge-Button zeigt oder versteckt die Eingabe.
document.querySelectorAll('[data-password-toggle]').forEach((button) => {
    button.addEventListener('click', () => {
        // Zu welchem Passwortfeld gehört der Button?
        const passwordInput = document.getElementById(button.dataset.passwordToggle);

        // Prüfen, ob das Passwort gerade sichtbar ist.
        const isPasswordVisible = passwordInput.type === 'text';

        // Ein-/Ausblenden je nach aktuellem Status.
        passwordInput.type = isPasswordVisible ? 'password' : 'text';

        // Accessibility-Attribute aktualisieren.
        button.setAttribute('aria-pressed', String(!isPasswordVisible));
        button.setAttribute('aria-label', isPasswordVisible ? 'Passwort anzeigen' : 'Passwort verbergen');

        // Icon wechseln: Auge offen = sichtbar, Auge geschlossen = verborgen.
        button.innerHTML = `<i class="far ${isPasswordVisible ? 'fa-eye' : 'fa-eye-slash'}" aria-hidden="true"></i>`;
    });
});