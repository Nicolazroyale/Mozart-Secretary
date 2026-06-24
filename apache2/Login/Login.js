document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const loginBtn = document.getElementById('loginBtn');
    const statusMessage = document.getElementById('statusMessage');

    loginBtn.disabled = true;
    loginBtn.textContent = 'Accediendo...';

    try {
        const response = await fetch('../login_process.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const result = await response.json();

        if (result.success) {
            statusMessage.textContent = '¡Acceso autorizado!';
            statusMessage.className = 'status-message success';
            statusMessage.style.display = 'block';
            
            setTimeout(() => {
                window.location.href = '../index.php';
            }, 1000);
        } else {
            statusMessage.textContent = result.error || 'Usuario o contraseña incorrectos';
            statusMessage.className = 'status-message error';
            statusMessage.style.display = 'block';
            loginBtn.disabled = false;
            loginBtn.textContent = 'Siguiente';
        }
    } catch (error) {
        console.error('Error:', error);
        statusMessage.textContent = 'Error al conectar con el servidor';
        statusMessage.className = 'status-message error';
        statusMessage.style.display = 'block';
        loginBtn.disabled = false;
        loginBtn.textContent = 'Siguiente';
    }
});
