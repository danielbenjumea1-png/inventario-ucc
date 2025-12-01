let inventario = JSON.parse(localStorage.getItem('inventario')) || [];
let codigoAFila = {};

// Inicializar mapeo
inventario.forEach((item, index) => {
    codigoAFila[item.codigo] = index;
});

// Verificar si Quagga está disponible
if (typeof Quagga !== 'undefined') {
    // Inicializar QuaggaJS
    Quagga.init({
        inputStream: {
            name: "Live",
            type: "LiveStream",
            target: document.querySelector('#interactive'),
            constraints: {
                width: 640,
                height: 480,
                facingMode: "environment" // Usar cámara trasera en móvil
            }
        },
        locator: {
            patchSize: "medium",
            halfSample: true
        },
        numOfWorkers: 2,
        decoder: {
            readers: ["code_128_reader", "ean_reader", "ean_8_reader", "code_39_reader", "upc_reader"] // Tipos comunes de códigos de barras
        },
        locate: true
    }, function(err) {
        if (err) {
            console.log('Error al inicializar Quagga:', err);
            document.getElementById('result').innerHTML = '<p style="color: red;">Error: No se pudo acceder a la cámara. Asegúrate de permitir permisos.</p>';
            return;
        }
        Quagga.start();
        console.log('Quagga iniciado correctamente.');
    });

    // Manejar detección
    Quagga.onDetected(function(result) {
        let code = result.codeResult.code;
        code = code.toUpperCase().replace(/[^A-Z0-9]/g, ''); // Limpiar y convertir a mayúsculas

        // Filtrar códigos que empiecen con B y tengan longitud adecuada
        if (!code.startsWith('B') || code.length < 7) return;

        procesarCodigo(code);
    });
} else {
    document.getElementById('result').innerHTML = '<p style="color: red;">Error: QuaggaJS no se cargó. Verifica tu conexión a internet.</p>';
}

function procesarCodigo(codigo) {
    if (codigoAFila[codigo] !== undefined) {
        // Marcar como encontrado (verde)
        inventario[codigoAFila[codigo]].estado = 'encontrado';
        document.getElementById('result').innerHTML = `<p style="color: green;">✔ Código ${codigo} encontrado y marcado en verde.</p>`;
    } else {
        // Agregar nuevo (morado)
        inventario.push({ codigo: codigo, estado: 'nuevo' });
        codigoAFila[codigo] = inventario.length - 1;
        document.getElementById('result').innerHTML = `<p style="color: purple;">➕ Código nuevo agregado: ${codigo}</p>`;
    }
    guardarInventario();
    actualizarTabla();
}

function procesarManual() {
    let codigo = document.getElementById('codigoManual').value.trim().toUpperCase();
    if (codigo) {
        procesarCodigo(codigo);
        document.getElementById('codigoManual').value = '';
    } else {
        alert('Por favor, ingresa un código válido.');
    }
}

function guardarInventario() {
    localStorage.setItem('inventario', JSON.stringify(inventario));
    // Crear "backup" guardando una copia en localStorage con timestamp
    localStorage.setItem('inventario_backup_' + Date.now(), JSON.stringify(inventario));
}

function actualizarTabla() {
    let tbody = document.querySelector('#inventarioTable tbody');
    tbody.innerHTML = '';
    inventario.forEach(item => {
        let row = `<tr class="${item.estado === 'encontrado' ? 'verde' : 'morado'}"><td>${item.codigo}</td><td>${item.estado}</td></tr>`;
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
    // Descargar Excel automáticamente
    descargarExcel();
    // Mostrar instrucciones para subida manual
    alert('Excel descargado automáticamente. Para subir a SharePoint:\n\n1. Abre este enlace en una nueva pestaña: https://ucceduco-my.sharepoint.com/:x:/r/personal/daniel_benjumea_ucc_edu_co/Documents/inventario%20-%20solo%20codigos.xlsx?d=wdb1f92c8b2f246599c69a9b22ccf2ac6&csf=1&web=1&e=34a0mU\n\n2. Edita el archivo en línea y pega/reemplaza los datos del Excel descargado.\n\n3. Guarda los cambios.');
}

// Inicializar tabla al cargar
actualizarTabla();
