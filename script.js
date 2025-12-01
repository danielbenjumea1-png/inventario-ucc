let inventario = JSON.parse(localStorage.getItem('inventario')) || [];
let codigoAFila = {};
let excelInicialCargado = false;
let quaggaIniciado = false; // Bandera para evitar reiniciar Quagga

// Función para cargar Excel inicial desde GitHub
async function cargarExcelInicial() {
    try {
        const response = await fetch('https://github.com/danielbenjumea1-png/C-digos-inventario/raw/refs/heads/main/inventario%20-%20solo%20codigos.xlsx'); // Reemplaza con tu URL real
        if (!response.ok) throw new Error('No se encontró el Excel inicial.');
        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet);
        inventario = data.map(item => ({ codigo: item.Codigo || item.codigo, estado: 'pendiente' })); // Asume columna "Codigo"
        localStorage.setItem('inventario', JSON.stringify(inventario));
        actualizarMapeo();
        actualizarTabla();
        excelInicialCargado = true;
        document.getElementById('result').innerHTML = '<p style="color: blue;">Inventario inicial cargado desde Excel.</p>';
    } catch (error) {
        console.log('No se pudo cargar Excel inicial:', error);
        document.getElementById('result').innerHTML = '<p style="color: orange;">No se encontró inventario inicial. Agrega códigos manualmente o sube el Excel a GitHub.</p>';
    }
}

// Inicializar mapeo
function actualizarMapeo() {
    codigoAFila = {};
    inventario.forEach((item, index) => {
        codigoAFila[item.codigo] = index;
    });
}

// Función para iniciar Quagga (llamada manualmente en móvil)
function iniciarQuagga() {
    if (quaggaIniciado) return; // Evitar reinicio
    if (typeof Quagga === 'undefined') {
        document.getElementById('result').innerHTML = '<p style="color: red;">Error: QuaggaJS no cargó. Verifica internet.</p>';
        return;
    }
    Quagga.init({
        inputStream: {
            name: "Live",
            type: "LiveStream",
            target: document.querySelector('#interactive'),
            constraints: { width: 640, height: 480, facingMode: "environment" }
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
        document.getElementById('result').innerHTML = '<p style="color: green;">Cámara iniciada. Escanea un código.</p>';
    });

    Quagga.onDetected(function(result) {
        let code = result.codeResult.code.toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (!code.startsWith('B') || code.length < 7) return;
        procesarCodigo(code);
    });
}

function procesarCodigo(codigo) {
    if (codigoAFila[codigo] !== undefined) {
        inventario[codigoAFila[codigo]].estado = 'encontrado';
        document.getElementById('result').innerHTML = `<p style="color: green;">✔ Código ${codigo} encontrado y marcado en verde.</p>`;
    } else {
        inventario.push({ codigo: codigo, estado: 'nuevo' });
        codigoAFila[codigo] = inventario.length - 1;
        document.getElementById('result').innerHTML = `<p style="color: purple;">➕ Código nuevo agregado: ${codigo}</p>`;
    }
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
    tbody.innerHTML = '';
    inventario.forEach(item => {
        let row = `<tr class="${item.estado === 'encontrado' ? 'verde' : item.estado === 'nuevo' ? 'morado' : ''}"><td>${item.codigo}</td><td>${item.estado}</td></tr>`;
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
    document.getElementById('guiaModal').style.display = 'block';
}

function cerrarGuia() {
    document.getElementById('guiaModal').style.display = 'none';
}

// Event listeners para compatibilidad con touch (móvil)
document.getElementById('guiaBtn').addEventListener('click', mostrarGuia);
document.getElementById('guiaBtn').addEventListener('touchstart', mostrarGuia); // Para touch
document.getElementById('closeGuia').addEventListener('click', cerrarGuia);
document.getElementById('closeGuia').addEventListener('touchstart', cerrarGuia);
document.getElementById('iniciarCamaraBtn').addEventListener('click', iniciarQuagga);
document.getElementById('iniciarCamaraBtn').addEventListener('touchstart', iniciarQuagga);
document.getElementById('procesarBtn').addEventListener('click', procesarManual);
document.getElementById('procesarBtn').addEventListener('touchstart', procesarManual);
document.getElementById('descargarBtn').addEventListener('click', descargarExcel);
document.getElementById('descargarBtn').addEventListener('touchstart', descargarExcel);
document.getElementById('subirBtn').addEventListener('click', subirSharePoint);
document.getElementById('subirBtn').addEventListener('touchstart', subirSharePoint);
document.getElementById('resetBtn').addEventListener('click', resetearInventario);
document.getElementById('resetBtn').addEventListener('touchstart', resetearInventario);

// Cargar al inicio
cargarExcelInicial();
actualizarTabla();

