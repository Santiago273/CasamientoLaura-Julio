// Endpoint de tu SheetDB
const API_URL = 'https://sheetdb.io/api/v1/g399tc5631z3w';

// Fecha del Casamiento para el Contador (22 de Noviembre de 2026, 19:30 Hs)
const WEDDING_DATE = new Date(2026, 10, 22, 19, 30, 0).getTime();

// Variable para almacenar la lista precargada de invitados autorizados
let listaControlInvitados = [];

document.addEventListener('DOMContentLoaded', () => {
    // 1. Efecto de entrada suave para la tarjeta
    const card = document.getElementById('card');
    if (card) {
        setTimeout(() => card.classList.add('visible'), 150);
    }

    // ==========================================
    // REPRODUCTOR DE CANCIÓN (FRAGMENTO PRECISO)
    // ==========================================
    const audio = document.getElementById('weddingAudio');
    const musicBtn = document.getElementById('musicToggleBtn');

    // CONFIGURÁ ACÁ LOS MINUTOS EN SEGUNDOS:
    const TIEMPO_INICIO = 20; // Ejemplo: inicia al segundo 45 (0:45)
    const TIEMPO_FIN = 87;   // Ejemplo: termina al segundo 120 (2:00)

    let isPlaying = false;

    // Colocar el fragmento inicial apenas carga el archivo de audio
    audio.addEventListener('loadedmetadata', () => {
        audio.currentTime = TIEMPO_INICIO;
    });

    // Controlar el fragmento: si llega al tiempo fin, lo reinicia en bucle (loop suave)
    audio.addEventListener('timeupdate', () => {
        if (audio.currentTime >= TIEMPO_FIN) {
            audio.currentTime = TIEMPO_INICIO;
            audio.play();
        }
    });

    function alternarMusica() {
        if (audio.paused) {
            // Si estaba antes del inicio o después del final, fijamos el inicio
            if (audio.currentTime < TIEMPO_INICIO || audio.currentTime >= TIEMPO_FIN) {
                audio.currentTime = TIEMPO_INICIO;
            }
            audio.play().then(() => {
                isPlaying = true;
                musicBtn.classList.add('playing');
            }).catch(e => console.log("El navegador bloqueó la reproducción automática:", e));
        } else {
            audio.pause();
            isPlaying = false;
            musicBtn.classList.remove('playing');
        }
    }

    if (musicBtn) {
        musicBtn.addEventListener('click', alternarMusica);
    }

    // Auto-reproducir con el primer clic del usuario en la pantalla (para saltar la restricción del navegador)
    function autoPlayPrimerClick() {
        if (!isPlaying && audio.paused) {
            alternarMusica();
        }
        document.removeEventListener('click', autoPlayPrimerClick);
    }
    document.addEventListener('click', autoPlayPrimerClick, { once: true });

    // 2. Contador Regresivo
    function updateCountdown() {
        const now = new Date().getTime();
        const difference = WEDDING_DATE - now;

        const daysEl = document.getElementById('days');
        const hoursEl = document.getElementById('hours');
        const minutesEl = document.getElementById('minutes');
        const secondsEl = document.getElementById('seconds');

        if (!daysEl) return;

        if (difference <= 0) {
            daysEl.innerText = '00';
            hoursEl.innerText = '00';
            minutesEl.innerText = '00';
            secondsEl.innerText = '00';
            return;
        }

        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        daysEl.innerText = String(days).padStart(2, '0');
        hoursEl.innerText = String(hours).padStart(2, '0');
        minutesEl.innerText = String(minutes).padStart(2, '0');
        secondsEl.innerText = String(seconds).padStart(2, '0');
    }

    updateCountdown();
    setInterval(updateCountdown, 1000);

    // 3. Copiar Alias al portapapeles
    const copyAliasBtn = document.getElementById('copyAliasBtn');
    const aliasText = document.getElementById('aliasText');
    const copyFeedback = document.getElementById('copyFeedback');

    if (copyAliasBtn && aliasText) {
        copyAliasBtn.addEventListener('click', async () => {
            const alias = aliasText.innerText.trim();
            try {
                await navigator.clipboard.writeText(alias);
                mostrarFeedbackCopiado();
            } catch (err) {
                const tempInput = document.createElement('input');
                tempInput.value = alias;
                document.body.appendChild(tempInput);
                tempInput.select();
                document.execCommand('copy');
                document.body.removeChild(tempInput);
                mostrarFeedbackCopiado();
            }
        });
    }

    function mostrarFeedbackCopiado() {
        if (!copyFeedback) return;
        copyFeedback.classList.add('show');
        setTimeout(() => copyFeedback.classList.remove('show'), 2500);
    }

    // 4. Modal RSVP y Carga de Invitados
    const modal = document.getElementById('modal');
    const openBtn = document.getElementById('openModalBtn');
    const closeBtn = document.getElementById('closeModalBtn');
    const closeIcon = document.getElementById('closeModalIcon');
    const closeSuccessBtn = document.getElementById('closeSuccessBtn');
    const rsvpForm = document.getElementById('rsvpForm');
    const statusMsg = document.getElementById('statusMsg');
    const successCard = document.getElementById('successCard');
    const modalHeader = document.querySelector('.modal-header');
    const selectInvitado = document.getElementById('invitadoSelect');
    const inputIntegrantes = document.getElementById('integrantes');
    const cupoAviso = document.getElementById('cupoAviso');

    function mostrarMensaje(texto, tipo) {
        statusMsg.innerText = texto;
        statusMsg.className = "status-message " + (tipo === 'error' ? 'status-error' : 'status-success');
        statusMsg.style.display = "block";
    }

    // Consulta la pestaña ListaControl en SheetDB y rellena el desplegable
    // Consulta ListaControl y la hoja principal de confirmados para filtrar el desplegable
    async function cargarListaInvitados() {
        selectInvitado.innerHTML = '<option value="" disabled selected>Cargando lista de invitados...</option>';

        try {
            // Consultamos ambas hojas en paralelo
            const [resControl, resConfirmados] = await Promise.all([
                fetch(`${API_URL}?sheet=ListaControl`),
                fetch(API_URL)
            ]);

            const dataControl = await resControl.json();
            const dataConfirmados = await resConfirmados.json();

            // Set con identificadores normalizados de quienes ya confirmaron (ej: "santiago_vera")
            const confirmadosSet = new Set(
                (Array.isArray(dataConfirmados) ? dataConfirmados : []).map(inv => 
                    `${(inv.nombre || '').toString().trim().toLowerCase()}_${(inv.apellido || '').toString().trim().toLowerCase()}`
                )
            );

            // Filtramos únicamente los invitados que NO hayan confirmado aún
            listaControlInvitados = (Array.isArray(dataControl) ? dataControl : [])
                .filter(inv => inv.nombre && inv.apellido)
                .filter(inv => {
                    const id = `${inv.nombre.toString().trim().toLowerCase()}_${inv.apellido.toString().trim().toLowerCase()}`;
                    return !confirmadosSet.has(id);
                });

            // Ordenamos alfabéticamente por apellido
            listaControlInvitados.sort((a, b) => {
                const nombreA = `${a.apellido} ${a.nombre}`.toLowerCase();
                const nombreB = `${b.apellido} ${b.nombre}`.toLowerCase();
                return nombreA.localeCompare(nombreB);
            });

            // Si ya no quedan invitados pendientes
            if (listaControlInvitados.length === 0) {
                selectInvitado.innerHTML = '<option value="" disabled selected>Todos los invitados ya confirmaron ✨</option>';
                return;
            }

            selectInvitado.innerHTML = '<option value="" disabled selected>Buscá tu nombre en la lista...</option>';

            listaControlInvitados.forEach((inv, index) => {
                const option = document.createElement('option');
                option.value = index;
                option.textContent = `${inv.nombre} ${inv.apellido}`;
                selectInvitado.appendChild(option);
            });

        } catch (err) {
            console.error("Error al cargar la lista:", err);
            selectInvitado.innerHTML = '<option value="" disabled selected>Error al cargar la lista. Reintentá.</option>';
        }
    }

    // Al seleccionar una persona, actualizamos automáticamente el límite de integrantes
    if (selectInvitado) {
        selectInvitado.addEventListener('change', () => {
            const index = selectInvitado.value;
            if (index !== "") {
                const invitado = listaControlInvitados[index];
                const cupoMax = parseInt(invitado.cupo || 1, 10);
                
                inputIntegrantes.max = cupoMax;
                if (parseInt(inputIntegrantes.value || 0, 10) > cupoMax) {
                    inputIntegrantes.value = cupoMax;
                }
                
                cupoAviso.innerText = `Lugar reservado para hasta ${cupoMax} ${cupoMax === 1 ? 'persona' : 'personas'}.`;
            }
        });
    }

    function abrirModal() {
        modal.style.display = "flex";
        statusMsg.style.display = "none";
        
        if (successCard) successCard.style.display = 'none';
        if (rsvpForm) rsvpForm.style.display = 'block';
        if (modalHeader) modalHeader.style.display = 'block';

        cargarListaInvitados();
    }

    function cerrarModal() {
        modal.style.display = "none";
    }

    if (openBtn) openBtn.onclick = abrirModal;
    if (closeBtn) closeBtn.onclick = cerrarModal;
    if (closeIcon) closeIcon.onclick = cerrarModal;
    
    if (closeSuccessBtn) {
        closeSuccessBtn.onclick = () => {
            cerrarModal();
            setTimeout(() => {
                if (successCard) successCard.style.display = 'none';
                if (rsvpForm) {
                    rsvpForm.style.display = 'block';
                    rsvpForm.reset();
                    if (cupoAviso) cupoAviso.innerText = '';
                }
                if (modalHeader) modalHeader.style.display = 'block';
            }, 300);
        };
    }

    window.onclick = (e) => {
        if (e.target === modal) cerrarModal();
    };

    // 5. Animación de Festejo con Confeti
    function dispararFestejo() {
        if (typeof confetti !== 'function') return;

        const coloresBoda = ['#b59b61', '#d4af37', '#f3e5ab', '#e0d2b4', '#ffffff'];

        confetti({
            particleCount: 50,
            angle: 60,
            spread: 55,
            origin: { x: 0.2, y: 0.6 },
            colors: coloresBoda
        });

        confetti({
            particleCount: 50,
            angle: 120,
            spread: 55,
            origin: { x: 0.8, y: 0.6 },
            colors: coloresBoda
        });

        setTimeout(() => {
            confetti({
                particleCount: 40,
                spread: 90,
                origin: { y: 0.4 },
                colors: coloresBoda,
                scalar: 0.9
            });
        }, 200);
    }

    // 6. Envío del Formulario
    rsvpForm.onsubmit = async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById('submitBtn');

        const indexSeleccionado = selectInvitado.value;
        if (indexSeleccionado === "") {
            mostrarMensaje("Por favor, elegí tu nombre del listado.", "error");
            return;
        }

        const invitadoSeleccionado = listaControlInvitados[indexSeleccionado];
        const nombre = invitadoSeleccionado.nombre.trim();
        const apellido = invitadoSeleccionado.apellido.trim();
        const cupoPermitido = parseInt(invitadoSeleccionado.cupo || 1, 10);

        const telefono = document.getElementById('telefono').value.trim();
        const integrantes = parseInt(inputIntegrantes.value, 10);

        // Validación de cupo asignado
        if (integrantes > cupoPermitido) {
            mostrarMensaje(`Tu invitación contempla un máximo de ${cupoPermitido} ${cupoPermitido === 1 ? 'persona' : 'personas'}.`, "error");
            return;
        }

        // Recolección y validación de platos
        const cantTradicional = parseInt(document.getElementById('menu_tradicional')?.value || 0, 10);
        const cantCeliaco = parseInt(document.getElementById('menu_celiaco')?.value || 0, 10);
        const cantInfantil = parseInt(document.getElementById('menu_infantil')?.value || 0, 10);
        const observaciones = document.getElementById('menu_observaciones')?.value.trim() || '';

        const totalPlatos = cantTradicional + cantCeliaco + cantInfantil;

        if (totalPlatos !== integrantes) {
            mostrarMensaje(`Indicaste ${integrantes} personas en total, pero la suma de los menús da ${totalPlatos}. Ajustá las cantidades.`, "error");
            return;
        }

        let menuDetalle = [];
        if (cantTradicional > 0) menuDetalle.push(`Tradicional: ${cantTradicional}`);
        if (cantCeliaco > 0) menuDetalle.push(`Celíaco: ${cantCeliaco}`);
        if (cantInfantil > 0) menuDetalle.push(`Infantil: ${cantInfantil}`);

        let menuFinal = menuDetalle.join(' | ');
        if (observaciones) {
            menuFinal += ` (Nota: ${observaciones})`;
        }

        // Formato seguro de fecha para Google Sheets
        const ahora = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        const fechaLegible = `'${pad(ahora.getDate())}/${pad(ahora.getMonth() + 1)}/${ahora.getFullYear()} ${pad(ahora.getHours())}:${pad(ahora.getMinutes())}`;

        submitBtn.innerText = "CONFIRMANDO...";
        submitBtn.disabled = true;
        statusMsg.style.display = "none";

        try {
            // Verificación en tiempo real antes de guardar para evitar duplicados
            const checkRes = await fetch(API_URL);
            const checkData = await checkRes.json();
            const yaConfirmo = (Array.isArray(checkData) ? checkData : []).some(inv => 
                (inv.nombre || '').toString().trim().toLowerCase() === nombre.toLowerCase() &&
                (inv.apellido || '').toString().trim().toLowerCase() === apellido.toLowerCase()
            );

            if (yaConfirmo) {
                mostrarMensaje("Tu asistencia ya fue confirmada previamente. ¡Muchas gracias!", "error");
                submitBtn.innerText = "CONFIRMAR";
                submitBtn.disabled = false;
                return;
            }

            // Si no estaba confirmado, guardamos normalmente
            const data = { 
                nombre, 
                apellido, 
                telefono, 
                integrantes, 
                menu: menuFinal, 
                fecha: fechaLegible 
            };

            const save = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ "data": [data] })
            });

            if (save.ok) {
                dispararFestejo();

                // Eliminamos inmediatamente al invitado de la lista en memoria para que no reaparezca
                listaControlInvitados.splice(indexSeleccionado, 1);

                rsvpForm.style.display = 'none';
                if (modalHeader) modalHeader.style.display = 'none';

                const successGuestName = document.getElementById('successGuestName');
                if (successGuestName) {
                    successGuestName.innerText = `${nombre} ${apellido}`;
                }
                if (successCard) {
                    successCard.style.display = 'block';
                }
            } else {
                mostrarMensaje("Hubo un inconveniente al guardar. Por favor reintentá en unos segundos.", "error");
            }
        } catch (err) {
            console.error(err);
            mostrarMensaje("Error de conexión. Revisá tu conexión a internet e intentá nuevamente.", "error");
        } finally {
            submitBtn.innerText = "CONFIRMAR";
            submitBtn.disabled = false;
        }
    };
});