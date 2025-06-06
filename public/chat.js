// Definir BASE_URL al inicio
const BASE_URL = 'http://localhost:3000';

document.addEventListener('DOMContentLoaded', function () {
    // Elementos del DOM
    const conversationBody = document.getElementById('zona-chat');
    const btnFilosofo = document.getElementById('boton-filosofo');
    const btnBudista = document.getElementById('boton-budista');
    const btnLimpiar = document.getElementById('boton-limpiar');
    const btnExportar = document.getElementById('boton-exportar');
    const modal = document.getElementById('modal-edicion');
    const closeModal = document.querySelector('.cerrar-modal');
    const editText = document.getElementById('texto-edicion');
    const saveEdit = document.getElementById('guardar-edicion');

    let currentEditId = null;

    if (!btnFilosofo || !btnBudista) {
        console.error('Botones no encontrados');
        return;
    }

    // Cargar conversación al iniciar
    loadConversation();

    // Event listeners
    btnFilosofo.addEventListener('click', () => generateResponse('filosofo'));
    btnBudista.addEventListener('click', () => generateResponse('budista'));
    btnLimpiar.addEventListener('click', clearConversation);
    btnExportar.addEventListener('click', exportToPDF);
    closeModal.addEventListener('click', () => modal.style.display = 'none');
    saveEdit.addEventListener('click', saveEditedMessage);

    // Cerrar modal al hacer clic fuera
    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });

    // Función para cargar la conversación
    async function loadConversation() {
        try {
            const response = await fetch('/api/conversations/current');
            const data = await response.json();
            
            if (data.success && data.messages && data.messages.length > 0) {
                renderConversation(data.messages);
            } else {
                conversationBody.innerHTML = '<div>No hay mensajes aún. Haz clic en los botones para generar respuestas.</div>';
            }
        } catch (error) {
            console.error('Error al cargar:', error);
            alert('Error al cargar la conversación');
        }
    }

    // Función para renderizar la conversación
    function renderConversation(messages) {
        conversationBody.innerHTML = '';
        
        if (!messages || messages.length === 0) {
            conversationBody.innerHTML = '<div>No hay mensajes aún</div>';
            return;
        }
        
        messages.forEach(message => {
            const messageDiv = document.createElement('div');
            messageDiv.style.margin = '10px 0';
            messageDiv.style.padding = '10px';
            messageDiv.style.borderLeft = `4px solid ${message.expert === 'filosofo' ? 'blue' : 'green'}`;
            
            const expertName = document.createElement('strong');
            expertName.textContent = message.expert === 'filosofo' ? 'Filósofo: ' : 'Monje: ';
            expertName.style.color = message.expert === 'filosofo' ? 'blue' : 'green';
            
            const messageText = document.createElement('span');
            messageText.textContent = message.text;
            
            const actionsDiv = document.createElement('div');
            actionsDiv.style.marginTop = '5px';
            
            const editBtn = document.createElement('button');
            editBtn.textContent = 'Editar';
            editBtn.style.marginRight = '5px';
            editBtn.onclick = () => openEditModal(message._id, message.text);
            
            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'Eliminar';
            deleteBtn.onclick = () => deleteMessage(message._id);
            
            actionsDiv.appendChild(editBtn);
            actionsDiv.appendChild(deleteBtn);
            
            messageDiv.appendChild(expertName);
            messageDiv.appendChild(messageText);
            messageDiv.appendChild(actionsDiv);
            
            conversationBody.appendChild(messageDiv);
        });
    }
    // Función para generar respuesta
    async function generateResponse(expert) {
        const tema = prompt(`¿Sobre qué tema quieres que opine el ${expert === 'filosofo' ? 'Filósofo Existencialista' : 'Monje Budista'}?`, "Sentido de la vida");

        if (!tema || tema.trim() === '') {
            alert("El tema no puede estar vacío.");
            return;}
        try {
            const response = await fetch(`${BASE_URL}/api/conversations/generate/${expert}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ tema })
            });

            // Verificar si la respuesta es correcta
            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }

            // Validar que sea JSON válido
            let data;
            try {
                data = await response.json();
            } catch (jsonError) {
                const text = await response.text();
                console.error('Respuesta inválida:', text);
                throw new Error('La respuesta no es válida');
            }

            if (!data.success) {
                throw new Error(data.error || 'Error desconocido al generar respuesta');
            }

            renderConversation(data.messages);

        } catch (error) {
            console.error('Error al generar:', error);
            alert(`Hubo un problema generando la conversación`);
        }
    }

    // Función para limpiar la conversación
    async function clearConversation() {
        if (!confirm('¿Estás seguro de que quieres limpiar toda la conversación?')) return;
        
        try {
            const response = await fetch(`${BASE_URL}/api/conversations/clear`, {
                method: 'POST'
            });

            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }

            const data = await response.json();
            if (!data.success) {
                throw new Error(data.error || 'Error desconocido al limpiar la conversación');
            }

            renderConversation(data.messages);

        } catch (error) {
            console.error('Error al limpiar:', error);
            alert(`Error al limpiar la conversación: ${error.message}`);
        }
    }

    // Función para exportar a PDF 
    async function exportToPDF() {
    try {
        const response = await fetch(`${BASE_URL}/api/conversations/export`);

        // Validar tipo de respuesta antes de usar .json()
        const contentType = response.headers.get('content-type');

        if (!contentType || !contentType.includes('application/pdf')) {
            // Si no es PDF, intentamos leer como JSON o texto
            const text = await response.text();
            throw new Error('La respuesta no es un PDF:\n' + text);
        }

        const blob = await response.blob();

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'dialogo_expertos.pdf';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(blob);

    } catch (error) {
        console.error('Error al exportar:', error);
        alert(`Hubo un problema al exportar a PDF`);
    }
}
    // Función para eliminar mensaje
    async function deleteMessage(messageId) {
        if (!confirm('¿Estás seguro de que quieres eliminar este mensaje?')) return;
        
        try {
            const response = await fetch(`${BASE_URL}/api/conversations/messages/${messageId}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }

            const data = await response.json();
            if (!data.success) {
                throw new Error(data.error || 'Error desconocido al eliminar mensaje');
            }

            renderConversation(data.messages);

        } catch (error) {
            console.error('Error al eliminar:', error);
            alert(`Error al eliminar mensaje: ${error.message}`);
        }
    }

    // Función para abrir modal de edición
    function openEditModal(messageId, text) {
        currentEditId = messageId;
        editText.value = text;
        modal.style.display = 'block';
    }

    // Función para guardar edición
    async function saveEditedMessage() {
        const newText = editText.value.trim();
        
        if (!newText) {
            alert('El mensaje no puede estar vacío');
            return;
        }
        
        try {
            const response = await fetch(`${BASE_URL}/api/conversations/messages/${currentEditId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ text: newText })
            });
            
            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Error desconocido al editar mensaje');
            }

            renderConversation(data.messages);
            modal.style.display = 'none';
        } catch (error) {
            console.error('Error al editar:', error);
            alert(`Error al editar mensaje: ${error.message}`);
        }
    }
});