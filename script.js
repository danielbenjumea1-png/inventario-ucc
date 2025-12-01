let inventario = JSON.parse(localStorage.getItem('inventario')) || [];
let codigoAFila = {};
let excelInicialCargado = false;
let quaggaIniciado = false;

// Función para cargar Excel inicial desde GitHub (con mejor manejo de errores)
async function cargarExcelInicial() {
    try {
        console.log('Intentando cargar Excel desde GitHub...'); // Debug
        const response = await fetch('https://github.com/danielbenjumea1-png/C-digos-inventario/raw/main/inventario%20-%20solo%20codigos.xlsx');
        console.log('Respuesta del fetch:', response.status); // Debug: Debería ser 200
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status} - ${response.statusText}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet);
        console.log('Datos cargados del Excel:', data); // Debug
        inventario = data.map(item => ({ codigo: item.Codigo || item.codigo || item.Código, estado: 'pendiente' })); // Soporta variaciones de columna
        localStorage.setItem('inventario', JSON.stringify(inventario));
        actualizarMapeo();
        actualizarTabla();
        excelInicialCargado = true;
        document.getElementById('result').innerHTML = '<p style="color: blue;">Inventario inicial cargado desde Excel.</p>';
    } catch (error) {
        console.error('Error al cargar Excel inicial:', error); // Debug
        document.getElementById('result').innerHTML = '<p style="color: orange;">No se pudo cargar el Excel inicial. Verifica la URL o agrega códigos manualmente. Error: ' + (error.message || error) + '</p>';
        // No bloquea la app: continúa normalmente
    }
}

// Inicializar mapeo
function actualizarMapeo() {
    codigoAFila = {};
    inventario.forEach((item, index) => {
        // Normalizar códigos (por si hay espacios)
        const codigo = (item.codigo || '').toString().trim().toUpperCase();
        item.codigo = codigo;
        codigoAFila[codigo] = index;
    });
}

// Función para iniciar Quagga
function iniciarQuagga() {
    if (quaggaIniciado) return;
    if (typeof Quagga === 'undefined') {
        document.getElementById('result').innerHTML = '<p style="color: red;">Error: QuaggaJS no cargó. Verifica internet.</p>';
        return;
    }
    Quagga.init({
        inputStream: {
            name: "Live",
            type: "LiveStream",
            target: document.querySelector('#interactive'),
            constraints: { 
                width: { ideal: 640 }, 
                height: { ideal: 480 }, 
                facingMode: "environment" 
            }
        },
        locator: { patchSize: "medium", halfSample: true },
        numOfWorkers: 2,
        decoder: { readers: ["code_128_reader", "ean_reader", "ean_8_reader", "code_39_reader", "upc_reader"] },
        locate: true
    }, function(err) {
        if (err) {
            document.getElementById('result').innerHTML = '<p style="color: red;">Error: No se pudo acceder a la cámara. Permite permisos y toca "Iniciar Cámara" de nuevo.</p>';
            return;
        }
        Quagga.start();
        quaggaIniciado = true;
        if (document.getElementById('camaraIndicador')) {
            document.getElementById('camaraIndicador').style.display = 'block';
        }
        document.getElementById('result').innerHTML = '<p style="color: green;">Cámara iniciada. Escanea un código.</p>';
    });

    Quagga.onDetected(function(result) {
        let code = result.codeResult.code.toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (!code.startsWith('B') || code.length < 7) return;
        procesarCodigo(code);
    });
}

// === REEMPLAZADA: procesarCodigo marca TODO como "encontrado" ===
function procesarCodigo(codigo) {
    codigo = (codigo || '').toString().trim().toUpperCase();
    if (!codigo) return;

    // Si existe → marcar encontrado
    if (codigoAFila[codigo] !== undefined) {
        inventario[codigoAFila[codigo]].estado = 'encontrado';
    } 
    // Si NO existe → agregarlo y marcar encontrado
    else {
        inventario.push({ codigo: codigo, estado: 'encontrado' });
        codigoAFila[codigo] = inventario.length - 1;
    }

    document.getElementById('result').innerHTML =
        `<p style="color: green;">✔ Código ${codigo} marcado como encontrado.</p>`;

    guardarInventario();
    actualizarTabla();
}

function procesarManual() {
    let codigo = document.getElementById('codigoManual').value.trim().toUpperCase();
    if (!codigo) {
        alert('Ingresa un código válido.');
        return;
    }
    procesarCodigo(codigo);
    document.getElementById('codigoManual').value = '';
}

function guardarInventario() {
    localStorage.setItem('inventario', JSON.stringify(inventario));
}

function actualizarTabla() {
    let tbody = document.querySelector('#inventarioTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    inventario.forEach(item => {
        let clase = item.estado === 'encontrado' ? 'verde' : '';
        let row = `<tr class="${clase}"><td>${item.codigo}</td><td>${item.estado}</td></tr>`;
        tbody.innerHTML += row;
    });
}

function descargarExcel() {
    if (inventario.length === 0) {
        alert('No hay datos para descargar.');
        return;
    }
    let ws = XLSX.utils.json_to_sheet(inventario);
    let wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventario");
    XLSX.writeFile(wb, "inventario_actualizado.xlsx");
}

function subirSharePoint() {
    if (inventario.length === 0) {
        alert('No hay datos para subir.');
        return;
    }
    descargarExcel();
    alert('Excel descargado. Súbelo manualmente a: https://ucceduco-my.sharepoint.com/:x:/r/personal/daniel_benjumea_ucc_edu_co/Documents/inventario%20-%20solo%20codigos.xlsx?d=wdb1f92c8b2f246599c69a9b22ccf2ac6&csf=1&web=1&e=34a0mU');
}

function resetearInventario() {
    if (confirm('¿Seguro que quieres resetear el inventario? Se perderán cambios no guardados.')) {
        localStorage.removeItem('inventario');
        inventario = [];
        actualizarMapeo();
        actualizarTabla();
        cargarExcelInicial();
        document.getElementById('result').innerHTML = '<p style="color: blue;">Inventario reseteado.</p>';
    }
}

function mostrarGuia() {
    const modal = document.getElementById('guiaModal');
    if (modal) modal.style.display = 'block';
}

function cerrarGuia() {
    const modal = document.getElementById('guiaModal');
    if (modal) modal.style.display = 'none';
}

// Event listeners (se asume que los elementos existen)
const safeAddListener = (id, evt, fn) => {
    const el = document.getElementById(id);
    if (el) {
        el.addEventListener(evt, fn);
    }
};

safeAddListener('guiaBtn', 'click', mostrarGuia);
safeAddListener('guiaBtn', 'touchstart', mostrarGuia);
safeAddListener('closeGuia', 'click', cerrarGuia);
safeAddListener('closeGuia', 'touchstart', cerrarGuia);
safeAddListener('iniciarCamaraBtn', 'click', iniciarQuagga);
safeAddListener('iniciarCamaraBtn', 'touchstart', iniciarQuagga);
safeAddListener('procesarBtn', 'click', procesarManual);
safeAddListener('procesarBtn', 'touchstart', procesarManual);
safeAddListener('descargarBtn', 'click', descargarExcel);
safeAddListener('descargarBtn', 'touchstart', descargarExcel);
safeAddListener('resetBtn', 'click', resetearInventario);
safeAddListener('resetBtn', 'touchstart', resetearInventario);

// Cargar al inicio
cargarExcelInicial().catch(e => console.warn('cargarExcelInicial fallo:', e));
actualizarTabla();

