// Importa las librerías necesarias
const TelegramBot = require('node-telegram-bot-api');
const moment = require('moment-timezone'); // Para manejar zonas horarias (ej. hora en Formosa)
const axios = require('axios'); // Para hacer solicitudes HTTP (ej. clima, APIs externas)
const fs = require('fs'); // Módulo para interactuar con el sistema de archivos (para persistencia de datos)

// --- CONFIGURACIÓN DE TU BOT Y API KEYS ---

// Tu token del bot de Telegram (obtenido de BotFather)
const token = '8008378509:AAEZ0bXuPnIOM6DFDyExNgb8NYenVv94FJ8'; 

// Tu API Key de OpenWeatherMap
// RECUERDA: Esta clave puede tardar unas horas en activarse.
const OPENWEATHER_API_KEY = '3ca79e782b3ded26e231ff3c804e69a8'; 

// --- ALMACENAMIENTO PERSISTENTE DE DATOS ---

// Nombre del archivo donde guardaremos las preferencias de los usuarios (nombre, ciudad favorita, etc.)
const USER_DATA_FILE = 'user_data.json'; 
// Nombre del archivo donde guardaremos los metadatos de los archivos universitarios (enlaces de Drive)
const UNIVERSITY_DATA_FILE = 'university_files.json'; 

// Objeto para almacenar datos de usuarios en memoria. Se carga desde USER_DATA_FILE al inicio.
// La clave es el userId de Telegram, el valor es un objeto con las preferencias del usuario.
let userNames = {};

// Array para almacenar los metadatos de los archivos universitarios en memoria. Se carga desde UNIVERSITY_DATA_FILE al inicio.
// En esta versión, universityFiles aún tiene la estructura de un solo 'googleDriveLink' por unidad.
let universityFiles = []; 

// Define la estructura de la carrera de Psicopedagogía (basada en el PDF de correlatividades).
// Esta estructura se usa para generar listados ordenados de materias y para mapear números a nombres de materia.
const careerStructure = [
  {
    year: 'Primer Año',
    semesters: [
      {
        name: '1º Cuatrimestre',
        subjects: [
          'Introduccion a la Filosofia',
          'Psicologia General',
          'Pedagogia General',
          'Anatomia y Fisiologia del Sist. Nervioso I'
        ]
      },
      {
        name: '2º Cuatrimestre',
        subjects: [
          'Psicologia Evolutiva I',
          'Psicoestadistica',
          'Anatomia y Fisiologia del Sist. Nervioso II'
        ]
      }
    ]
  },
  {
    year: 'Segundo Año',
    semesters: [
      {
        name: '1º Cuatrimestre',
        subjects: [
          'Psicologia Evolutiva II',
          'Psicologia Profunda',
          'Didactica I'
        ]
      },
      {
        name: '2º Cuatrimestre',
        subjects: [
          'Psicologia Genetica',
          'Tecnicas de Exploracion Psicopedagogica I',
          'Didactica II',
          'Práctica I'
        ]
      }
    ]
  },
  {
    year: 'Tercer Año',
    semesters: [
      {
        name: '1º Cuatrimestre',
        subjects: [
          'Didactica III',
          'Tecnicas de Exploracion Psicopedagogicas II',
          'Psicologia Educacional',
          'Práctica II'
        ]
      },
      {
        name: '2º Cuatrimestre',
        subjects: [
          'Psicopatologia',
          'Ética Profesional',
          'Historia de la Educacion Argentina',
          'Antropologia',
          'Practica III'
        ]
      }
    ]
  },
  {
    year: 'Cuarto Año',
    semesters: [
      {
        name: '1º Cuatrimestre',
        subjects: [
          'Filosofia de la Educacion',
          'Fonoaudiologia',
          'Psicologia Institucional y Dinamica de Grupo',
          'Pedagogia Diferenciada',
          'Práctica IV'
        ]
      },
      {
        name: '2º Cuatrimestre',
        subjects: [
          'Tecnicas de Reeducacion',
          'Orientacion Escolar y Vocacional',
          'Organizacion Escolar para la Enseñanza Comun y Especial',
          'Práctica V'
        ]
      }
    ]
  }
];

// Mapa global para traducir números de materia a nombres de materia.
// Se construye al inicio del bot, usando la careerStructure para una numeración consistente (01 a 32).
const globalSubjectMap = {}; // Ejemplo: { 1: "Introduccion a la Filosofia", 2: "Psicologia General", ... }
let currentGlobalSubjectNumber = 0; // Contador para asignar números secuenciales a las materias

// Construir el mapa global de materias al cargar la configuración
careerStructure.forEach(yearData => {
    yearData.semesters.forEach(semesterData => {
        semesterData.subjects.forEach(subjectName => {
            currentGlobalSubjectNumber++;
            globalSubjectMap[currentGlobalSubjectNumber] = subjectName;
        });
    });
});
// Para depuración, puedes descomentar la siguiente línea para ver el mapa en la consola al iniciar el bot:
// console.log("globalSubjectMap:", globalSubjectMap);


// Función para cargar los datos de los usuarios desde el archivo USER_DATA_FILE
function loadUserData() {
  try {
    if (fs.existsSync(USER_DATA_FILE)) { 
      const data = fs.readFileSync(USER_DATA_FILE, 'utf8');
      userNames = JSON.parse(data); 
      console.log('Datos de usuario cargados exitosamente.');
    } else {
      console.log('Archivo de datos de usuario no encontrado, se creará uno nuevo al guardar.');
    }
  } catch (error) {
    console.error('Error al cargar datos de usuario:', error);
    userNames = {}; // En caso de error (ej. JSON corrupto), inicializa como objeto vacío
  }
}

// Función para guardar los datos de los usuarios en el archivo USER_DATA_FILE
function saveUserData() {
  try {
    const data = JSON.stringify(userNames, null, 2); // Convierte el objeto a JSON con formato legible
    fs.writeFileSync(USER_DATA_FILE, data, 'utf8');
    console.log('Datos de usuario guardados exitosamente.');
  } catch (error) {
    console.error('Error al guardar datos de usuario:', error);
  }
}

// Función para guardar los datos de los archivos universitarios en el archivo UNIVERSITY_DATA_FILE
// En esta versión, guardará la estructura con un único 'googleDriveLink' por unidad.
function saveUniversityFilesData() {
  try {
    const data = JSON.stringify(universityFiles, null, 2); 
    fs.writeFileSync(UNIVERSITY_DATA_FILE, data, 'utf8');
    console.log('Datos de archivos universitarios guardados exitosamente.');
  } catch (error) {
    console.error('Error al guardar datos de archivos universitarios:', error);
  }
}

// Función para cargar los datos de los archivos universitarios desde el archivo UNIVERSITY_DATA_FILE
function loadUniversityData() {
  try {
    if (fs.existsSync(UNIVERSITY_DATA_FILE)) {
      const data = fs.readFileSync(UNIVERSITY_DATA_FILE, 'utf8');
      universityFiles = JSON.parse(data);
      console.log('Datos de archivos universitarios cargados exitosamente.');
    } else {
      console.log('Archivo de datos universitarios no encontrado. Asegúrate de crear university_files.json con la estructura adecuada.');
    }
  } catch (error) {
    console.error('Error al cargar datos de archivos universitarios:', error);
    universityFiles = []; // En caso de error, inicializa como array vacío
  }
}

// Carga los datos de usuario y archivos universitarios al iniciar el script del bot
loadUserData();
loadUniversityData(); 

// --- FUNCIONES AUXILIARES ---

// Función para obtener un saludo personalizado para el usuario (usando su nombre guardado)
function getPersonalizedGreeting(userId) {
  if (userNames[userId] && userNames[userId].name) { 
    return `¡Hola ${userNames[userId].name}!`;
  }
  return '¡Hola!'; 
}

// Función auxiliar para escapar caracteres especiales de Markdown
// Esta función es crucial para evitar errores de parseo de Telegram.
// Escapa los caracteres que Telegram puede interpretar como formato si no están escapados.
// Lista de caracteres a escapar para Markdown V2: _ * [ ] ( ) ~ ` > # + - = | { } . ! \
// La doble barra invertida (\\) es para escapar la barra invertida misma en el regex y en la cadena de reemplazo
function escapeMarkdown(text) {
    return text.replace(/[_*[\]()~`>#+\-=|{}.!\\\\]/g, '\\$&');
}


// --- INSTANCIA DEL BOT ---

// Crea una instancia del bot de Telegram y activa el "polling" para recibir mensajes.
const bot = new TelegramBot(token, {polling: true});

// --- DEFINICIÓN DEL MENÚ PRINCIPAL INLINE ---
// Este es el teclado flotante que se mostrará al presionar "MENU DEL BOT"
// Se define globalmente para poder reutilizarlo.
const mainMenuInlineKeyboard = {
  inline_keyboard: [
    [{ text: '😂 Chiste', callback_data: 'cmd_chiste' }, { text: '⏰ Hora Formosa', callback_data: 'cmd_horaformosa' }],
    [{ text: '☁️ Clima', callback_data: 'cmd_clima' }, { text: '🎮 Piedra, Papel o Tijera', callback_data: 'cmd_ppt' }],
    [{ text: '📚 Materias', callback_data: 'cmd_materias' }, { text: '📄 Unidades', callback_data: 'cmd_unidades' }], 
    [{ text: '🔍 Buscar Archivo', callback_data: 'cmd_buscar' }], 
    [{ text: '🔗 ID Drive', callback_data: 'cmd_driveid' }, { text: '➕ Actualizar ID', callback_data: 'cmd_agregarid' }], // Botón para el /agregarid original (actualiza un solo enlace)
    // Los botones para /agregar_material y /agregar_unidad NO ESTÁN AQUÍ en esta versión.
    [{ text: 'ℹ️ Info', callback_data: 'cmd_info' }] 
  ]
};


// --- FUNCIONES CENTRALES DE LÓGICA DE COMANDOS (para reutilizar código) ---
// Cada función encapsula la lógica principal de un comando, para ser llamada por onText o callback_query.

async function sendChiste(chatId, userId) {
  const chistes = [
    "¿Qué hace una abeja en el gimnasio? ¡Zumba!",
    "¿Por qué los pájaros no usan Facebook? Porque ya tienen Twitter.",
    "¿Cuál es el colmo de un electricista? Que su mujer se llame Luz y sus hijos le sigan la corriente.",
    "Si los zombies evolucionan, ¿se convierten en zombots?"
  ];
  const chisteAleatorio = chistes[Math.floor(Math.random() * chistes.length)];
  await bot.sendMessage(chatId, `${getPersonalizedGreeting(userId)} Aquí tienes un chiste: ${chisteAleatorio}`);
}

async function sendHoraFormosa(chatId, userId) {
  const zonaHorariaFormosa = 'America/Argentina/Cordoba'; 
  const horaActualFormosa = moment().tz(zonaHorariaFormosa).format('HH:mm:ss [del] DD/MM/YYYY');
  await bot.sendMessage(chatId, `${getPersonalizedGreeting(userId)} La hora actual en Formosa es: ${horaActualFormosa}`);
}

async function sendClima(chatId, userId) {
  let ciudadParaClima = 'Formosa,AR'; 
  let mensajeCiudad = 'Formosa';
  if (userNames[userId] && userNames[userId].favoriteCity) {
    ciudadParaClima = userNames[userId].favoriteCity;
    mensajeCiudad = userNames[userId].favoriteCity;
  }

  try {
    const response = await axios.get(
      `https://api.openweathermap.org/data/2.5/weather?q=${ciudadParaClima}&units=metric&lang=es&appid=${OPENWEATHER_API_KEY}`
    );
    const data = response.data;
    const temperatura = data.main.temp;
    const sensacionTermica = data.main.feels_like;
    const descripcion = data.weather[0].description;
    const humedad = data.main.humidity;
    const velocidadViento = data.wind.speed;

    const mensajeClima = `${getPersonalizedGreeting(userId)} El clima actual en ${mensajeCiudad} es:\n` + 
                         `Temperatura: ${temperatura}°C\n` +
                         `Sensación térmica: ${sensacionTermica}°C\n` +
                         `Condición: ${descripcion}\n` +
                         `Humedad: ${humedad}%\n` +
                         `Viento: ${velocidadViento} m/s`;

    await bot.sendMessage(chatId, mensajeClima);
  } catch (error) {
    console.error('Error al obtener el clima:', error.response ? error.response.data : error.message);
    let errorMessage = `${getPersonalizedGreeting(userId)} Lo siento, no pude obtener la información del clima para "${ciudadParaClima}" en este momento. Asegúrate de que el nombre de la ciudad sea correcto.`;
    if (error.response && error.response.status === 401) {
        errorMessage += ' Parece que hay un problema con la clave API de OpenWeatherMap. Asegúrate de que sea correcta y esté activada.';
    } else if (error.response && error.response.status === 404) {
         errorMessage += ' La ciudad especificada no fue encontrada. Por favor, verifica el nombre.';
    }
    await bot.sendMessage(chatId, errorMessage);
  }
}

async function sendPptGame(chatId, userId) {
  await bot.sendMessage(chatId, 
    `${getPersonalizedGreeting(userId)} ¡Vamos a jugar a Piedra, Papel o Tijera!\n` +
    'Elige tu movimiento enviando: /piedra, /papel o /tijera.'
  );
}

async function handlePptGameRound(msg) {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const jugadorEleccion = msg.text.toLowerCase().replace('/', ''); 
  const opciones = ['piedra', 'papel', 'tijera'];
  const botEleccion = opciones[Math.floor(Math.random() * opciones.length)];

  let resultadoMensaje = `${getPersonalizedGreeting(userId)} Tú elegiste: *${jugadorEleccion}*\n` +
                         `Yo elegí: *${botEleccion}*\n\n`;

  if (jugadorEleccion === botEleccion) {
    resultadoMensaje += '¡Es un empate!';
  } else if (
    (jugadorEleccion === 'piedra' && botEleccion === 'tijera') ||
    (jugadorEleccion === 'papel' && botEleccion === 'piedra') ||
    (jugadorEleccion === 'tijera' && botEleccion === 'papel')
  ) {
    resultadoMensaje += '¡Ganaste! 🎉';
  } else {
    resultadoMensaje += '¡Yo gané! 🤖';
  }

  await bot.sendMessage(chatId, resultadoMensaje, { parse_mode: 'Markdown' });
}


async function sendMateriasList(chatId, userId) {
  const fixedMateriasList = `¡Bien! Aquí tienes el listado de materias por año y cuatrimestre:\n\n` + 
  `*Primer Año*\n` +
  `  _1º Cuatrimestre_\n` +
  `    01 Introducción a la Filosofía\n` +
  `    02 Psicología General\n` +
  `    03 Pedagogía General\n` +
  `    04 Anatomía y Fisiología del Sist. Nervioso I\n\n` +
  `  _2º Cuatrimestre_\n` +
  `    05 Psicología Evolutiva I\n` +
  `    06 Psicoestadística\n` +
  `    07 Anatomía y Fisiología del Sist. Nervioso II\n\n` +
  `*Segundo Año*\n` +
  `  _1º Cuatrimestre_\n` +
  `    08 Psicología Evolutiva II\n` +
  `    09 Psicología Profunda\n` +
  `    10 Didáctica I\n\n` +
  `  _2º Cuatrimestre_\n` +
  `    11 Psicología Genética\n` +
  `    12 Técnicas de Exploración Psicopedagógica I\n` +
  `    13 Didáctica II\n` +
  `    14 Práctica I\n\n` +
  `*Tercer Año*\n` +
  `  _1º Cuatrimestre_\n` +
  `    15 Didáctica III\n` +
  `    16 Técnicas de Exploración Psicopedagogicas II\n` +
  `    17 Psicología Educacional\n` +
  `    18 Práctica II\n\n` +
  `  _2º Cuatrimestre_\n` +
  `    19 Psicopatología\n` +
  `    20 Ética Profesional\n` +
  `    21 Historia de la Educación Argentina\n` +
  `    22 Antropología\n` +
  `    23 Practica III\n\n` +
  `*Cuarto Año*\n` +
  `  _1º Cuatrimestre_\n` +
  `    24 Filosofía de la Educación\n` +
  `    25 Fonoaudiología\n` +
  `    26 Psicología Institucional y Dinamica de Grupo\n` +
  `    27 Pedagogía Diferenciada\n` +
  `    28 Práctica IV\n\n` +
  `  _2º Cuatrimestre_\n` +
  `    29 Técnicas de Reeducación\n` +
  `    30 Orientación Escolar y Vocacional\n` +
  `    31 Organización Escolar para la Enseñanza Comun y Especial\n` +
  `    32 Práctica V\n\n` +
  `Usa /buscar [número de materia], [número de unidad] o /buscar [materia], [unidad] para obtener un archivo.`;

  await bot.sendMessage(chatId, fixedMateriasList, { parse_mode: 'Markdown' });
}

// Función central para listar las unidades de una materia específica
// Nota: Esta función asume la estructura antigua de universityFiles (un solo googleDriveLink por unidad).
async function sendUnitList(chatId, userId, materiaInput) {
  let materiaName;

  // --- 1. Determinar el nombre de la materia (igual que en /buscar y /agregarid) ---
  const materiaNumber = parseInt(materiaInput);
  const isMateriaNumber = !isNaN(materiaNumber) && String(materiaNumber) === materiaInput; 

  if (isMateriaNumber) { 
    materiaName = globalSubjectMap[materiaNumber];
    if (!materiaName) {
      await bot.sendMessage(chatId, `${getPersonalizedGreeting(userId)} Lo siento, el número de materia *${materiaNumber}* no es válido. Usa /materias para ver el listado correcto.`, { parse_mode: 'Markdown' });
      return;
    }
  } else { 
    materiaName = materiaInput;
  }

  // Normaliza el nombre de la materia para la búsqueda
  const normalizedMateria = materiaName.toLowerCase().replace(/\s/g, '');

  // --- 2. Encontrar todas las unidades para esta materia ---
  const unitsForSubject = universityFiles.filter(file => {
    const fileSubjectNormalized = file.subject.toLowerCase().replace(/\s/g, '');
    return fileSubjectNormalized.includes(normalizedMateria);
  });

  if (unitsForSubject.length === 0) {
    await bot.sendMessage(chatId, `${getPersonalizedGreeting(userId)} No encontré ninguna unidad para la materia *${escapeMarkdown(materiaName)}*. Asegúrate de que el nombre sea correcto o que haya archivos cargados para ella.`, { parse_mode: 'Markdown' });
    return;
  }

  // --- 3. Extraer unidades únicas y ordenarlas numéricamente ---
  const uniqueUnits = [...new Set(unitsForSubject.map(file => {
    const unitNumMatch = file.unit.match(/\d+/);
    const unitNumber = unitNumMatch ? parseInt(unitNumMatch[0]) : 0;
    return { 
      unit: file.unit, 
      title: file.title || file.unit, 
      unitNumber: unitNumber 
    };
  }))].sort((a, b) => a.unitNumber - b.unitNumber);

  // --- 4. Formatear el mensaje de respuesta ---
  let responseMessage = `${getPersonalizedGreeting(userId)} La materia *${escapeMarkdown(materiaName)}* tiene *${uniqueUnits.length} unidades* las cuales son:\n\n`; 
  
  uniqueUnits.forEach(unit => {
    responseMessage += `  ${escapeMarkdown(unit.unit)} / ${escapeMarkdown(unit.title)}\n`; 
  });

  responseMessage += `\nUsa /buscar [${escapeMarkdown(materiaName)}], [número de unidad] para obtener un archivo.`;
  
  await bot.sendMessage(chatId, responseMessage, { parse_mode: 'Markdown' });
}

async function sendBuscarFile(chatId, userId, input1, input2) {
  let materiaBuscadaTexto;
  let unidadBuscadaTexto;

  const materiaNumber = parseInt(input1);
  const isMateriaNumber = !isNaN(materiaNumber) && String(materiaNumber) === input1; 

  const unitNumber = parseInt(input2);
  const isUnitNumber = !isNaN(unitNumber) && String(unitNumber) === input2;

  if (isMateriaNumber) { 
    materiaBuscadaTexto = globalSubjectMap[materiaNumber];
    if (!materiaBuscadaTexto) {
      await bot.sendMessage(chatId, `${getPersonalizedGreeting(userId)} Lo siento, el número de materia *${materiaNumber}* no es válido. Usa /materias para ver el listado correcto.`, { parse_mode: 'Markdown' });
      return;
    }
  } else { 
    materiaBuscadaTexto = input1;
  }

  if (isUnitNumber) { 
    unidadBuscadaTexto = `Unidad ${unitNumber}`;
  } else { 
    unidadBuscadaTexto = input2;
  }

  const normalizedMateria = materiaBuscadaTexto.toLowerCase().replace(/\s/g, '');
  const normalizedUnidad = unidadBuscadaTexto.toLowerCase().replace(/\s/g, '');

  // Busca la entrada de archivo específica (asumiendo un solo archivo por unidad en esta versión)
  const foundFile = universityFiles.find(file => {
    const fileSubjectNormalized = file.subject.toLowerCase().replace(/\s/g, '');
    const fileUnitNormalized = file.unit.toLowerCase().replace(/\s/g, '');
    return fileSubjectNormalized.includes(normalizedMateria) && fileUnitNormalized.includes(normalizedUnidad);
  });

  if (foundFile) {
    const fileTitle = foundFile.title || foundFile.unit; 
    const googleDriveLink = foundFile.googleDriveLink; 

    if (googleDriveLink) {
      const inlineKeyboard = {
        reply_markup: {
          inline_keyboard: [
            [{ text: `⬇️ ${escapeMarkdown(fileTitle)}`, url: googleDriveLink }] 
          ]
        }
      };
      await bot.sendMessage(chatId, `${getPersonalizedGreeting(userId)} Aquí tienes el archivo de *${escapeMarkdown(foundFile.subject)}*, *${escapeMarkdown(foundFile.unit)}*:`, inlineKeyboard, { parse_mode: 'Markdown' });
    } else {
      await bot.sendMessage(chatId, `${getPersonalizedGreeting(userId)} Encontré el archivo *${escapeMarkdown(fileTitle)}*, pero no tiene un enlace de Google Drive configurado.`, { parse_mode: 'Markdown' });
    }
  } else {
    await bot.sendMessage(chatId, `${getPersonalizedGreeting(userId)} Lo siento, no encontré ningún archivo para la materia *${escapeMarkdown(materiaBuscadaTexto)}* y unidad *${escapeMarkdown(unidadBuscadaTexto)}*. Intenta ser más específico o consulta /materias.`, { parse_mode: 'Markdown' });
  }
}

async function sendDriveId(chatId, userId, fullLink) {
  const driveIdRegex = /\/d\/([a-zA-Z0-9_-]+)(?:\/view|\/edit|\/export|\?|$)/;
  const matchId = fullLink.match(driveIdRegex);

  if (matchId && matchId[1]) {
    const driveId = matchId[1];
    await bot.sendMessage(chatId, `${getPersonalizedGreeting(userId)} Tu ID de archivo es: *${driveId}*\n\nRecuerda usarlo en el formato de descarga directa: \`https://drive.google.com/uc?export=download&id=${driveId}\``, { parse_mode: 'Markdown' });
  } else {
    await bot.sendMessage(chatId, `${getPersonalizedGreeting(userId)} Lo siento, no pude encontrar un ID de Google Drive en ese enlace. Asegúrate de que sea un enlace válido de Google Drive (que contenga /d/ en la URL).`);
  }
}

// Función auxiliar para encontrar el año y cuatrimestre de una materia en careerStructure
function findSubjectLocation(subjectName) {
    for (const yearData of careerStructure) {
        for (const semesterData of yearData.semesters) {
            if (semesterData.subjects.includes(subjectName)) {
                return { year: yearData.year, semester: semesterData.name };
            }
        }
    }
    return null; // Materia no encontrada en la estructura
}

// En esta versión, este comando es para ACTUALIZAR el único 'googleDriveLink' de una unidad.
// NO se usa para agregar múltiples materiales a una unidad, ni para crear nuevas unidades.
async function addMaterialToUnit(chatId, userId, materiaInput, unitInput, driveId) { 
  let materiaName;
  let unitName;

  const materiaNumber = parseInt(materiaInput);
  const isMateriaNumber = !isNaN(materiaNumber) && String(materiaNumber) === materiaInput; 

  if (isMateriaNumber) {
    materiaName = globalSubjectMap[materiaNumber];
    if (!materiaName) {
      await bot.sendMessage(chatId, `${getPersonalizedGreeting(userId)} Lo siento, el número de materia *${materiaNumber}* no es válido. Usa /materias para ver el listado correcto.`, { parse_mode: 'Markdown' });
      return;
    }
  } else {
    materiaName = materiaInput;
  }

  const unitNumber = parseInt(unitInput);
  const isUnitNumber = !isNaN(unitNumber) && String(unitNumber) === unitInput; 

  if (isUnitNumber) {
    unitName = `Unidad ${unitNumber}`;
  } else {
    unitName = unitInput;
  }

  const normalizedMateria = materiaName.toLowerCase().replace(/\s/g, '');
  const normalizedUnidad = unitName.toLowerCase().replace(/\s/g, '');

  const fileIndex = universityFiles.findIndex(file => { 
    const fileSubjectNormalized = file.subject.toLowerCase().replace(/\s/g, '');
    const fileUnitNormalized = file.unit.toLowerCase().replace(/\s/g, '');
    return fileSubjectNormalized.includes(normalizedMateria) && fileUnitNormalized.includes(normalizedUnidad);
  });

  if (fileIndex !== -1) { 
    const existingFileEntry = universityFiles[fileIndex];
    const newGoogleDriveLink = `https://drive.google.com/uc?export=download&id=${driveId}`;
    
    existingFileEntry.googleDriveLink = newGoogleDriveLink; 
    
    saveUniversityFilesData(); 

    await bot.sendMessage(chatId, `${getPersonalizedGreeting(userId)} ¡Enlace actualizado! El archivo de *${escapeMarkdown(existingFileEntry.subject)}*, *${escapeMarkdown(existingFileEntry.unit)}* ahora usa el ID: \`${escapeMarkdown(driveId)}\`.`, { parse_mode: 'Markdown' });
  } else {
    await bot.sendMessage(chatId, `${getPersonalizedGreeting(userId)} Lo siento, no encontré la unidad *${escapeMarkdown(unitName)}* para la materia *${escapeMarkdown(materiaName)}* en la base de datos de archivos universitarios. Asegúrate de que los datos sean correctos.`, { parse_mode: 'Markdown' });
  }
}

// Las funciones 'addUniversityUnit' y los comandos '/agregar_material' y '/agregar_unidad' NO ESTÁN EN ESTA VERSIÓN.
// Fueron introducidas después en la conversación y causaron los problemas de Markdown.

async function sendInfo(chatId, userId) {
  const inlineKeyboard = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '💬 WhatsApp', url: 'https://wa.me/5493705021874' }, 
          { text: '✈️ Telegram', url: 'https://t.me/TheJOIF_arg' } 
        ],
        [
            { text: 'ℹ️ Más Información', url: 'https://hub.juanortiz.online/informacion' } 
        ]
      ]
    }
  };

  await bot.sendMessage(chatId, 
    `${getPersonalizedGreeting(userId)} Este bot fue creado con Node.js y la librería node-telegram-bot-api. ¡Es mi primer bot programado! Puedes contactarnos o visitar nuestros enlaces:`, 
    inlineKeyboard 
  );
}

async function handleHolaMessage(chatId, userId) {
    await bot.sendMessage(chatId, `${getPersonalizedGreeting(userId)} ¿Cómo estás?`);
}

// --- MANEJADORES DE COMANDOS Y EVENTOS (Conectando a funciones centrales) ---

// 1. Comando /start: Saluda al usuario, muestra el estado y un botón para /menu (Inline Button).
// Este comando fue modificado para usar un botón inline para el menú principal.
bot.onText(/\/start/, async (msg) => { 
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  let saludoInicial = getPersonalizedGreeting(userId);
  let authDate = 'No definida'; 
  let weatherInfo = 'No disponible'; 

  if (!userNames[userId] || !userNames[userId].name) { 
    saludoInicial += ` Parece que no te conozco. ¿Cuál es tu nombre? Puedes decírmelo con el comando /mimbre [tu nombre]. Por ejemplo: /mimbre Juan`;
  } else if (userNames[userId].authorizationDate) {
    authDate = userNames[userId].authorizationDate;
  }

  // --- Obtener datos del clima para el mensaje de inicio ---
  let ciudadParaClima = 'Formosa,AR'; 
  let displayCiudadClima = 'Formosa';
  if (userNames[userId] && userNames[userId].favoriteCity) {
    ciudadParaClima = userNames[userId].favoriteCity;
    displayCiudadClima = userNames[userId].favoriteCity;
  }

  try {
    const response = await axios.get(
      `https://api.openweathermap.org/data/2.5/weather?q=${ciudadParaClima}&units=metric&lang=es&appid=${OPENWEATHER_API_KEY}`
    );
    const data = response.data;
    weatherInfo = `Tiempo en ${displayCiudadClima}: ${data.main.temp}°C, ${data.weather[0].description}`;
  } catch (error) {
    weatherInfo = `Tiempo en ${displayCiudadClima}: No pude obtenerlo.`;
  }
  // --- Fin de obtención de datos del clima ---

  const zonaHoraria = 'America/Argentina/Cordoba';
  const horaActual = moment().tz(zonaHoraria).format('HH:mm:ss');
  const fechaActual = moment().tz(zonaHoraria).format('DD-MM-YY');
  const totalUsuarios = Object.keys(userNames).length;

  const welcomeMessage = 
    `✨ BIENVENIDO A The JOIF(V3) ✨\n\n` +
    `▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n` +
    `🔥 TIENE ACCESO NIVEL *Beta Tester* 🔥\n` + 
    `✩ AUTORIZACION VALIDA HASTA ${authDate} ⌚️\n` +
    `| ⏰ HORA : ${horaActual} - | - 📅 FECHA : ${fechaActual}\n` +
    `| ⛅ ${weatherInfo}\n` +
    `▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n` +
    `RESELLER ACTUAL : ${userNames[userId] && userNames[userId].name ? userNames[userId].name : 'No definido'}\n` + 
    `▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n` +
    `MENU DEL BOT▬▬▬▬▬▬▬▬► /menu\n` +
    `INSTRUCCIONES DEL BOT▬▬► /info\n` + 
    `▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n` +
    `TOTAL DE USUARIOS (${totalUsuarios}) ✨\n` +
    `Inconvenientes con el Bot Contactame : +5493705021874 📲\n` +
    `▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬`;

  const inlineMenuButton = {
    reply_markup: {
      inline_keyboard: [
        [{ text: 'MENU DEL BOT ➔', callback_data: 'show_main_menu' }] 
      ]
    }
  };

  await bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown', ...inlineMenuButton });
});

// 2. Manejador para "callback queries": Escucha cuando se presiona un botón inline con `callback_data`.
// Este manejador es el que se activa cuando el usuario presiona un botón del menú flotante.
bot.on('callback_query', async (callbackQuery) => { 
  const message = callbackQuery.message;
  const data = callbackQuery.data;       
  const chatId = message.chat.id;
  const userId = callbackQuery.from.id; 

  await bot.answerCallbackQuery(callbackQuery.id); 

  // Si el callback es para mostrar el menú principal (viene del botón "MENU DEL BOT ➔" de /start)
  if (data === 'show_main_menu') {
    // Aquí es donde enviamos el menú principal inline, no un Reply Keyboard.
    await bot.sendMessage(chatId, `${getPersonalizedGreeting(userId)} Aquí está el menú de comandos:`, { reply_markup: mainMenuInlineKeyboard });
  } 
  // --- Manejo de comandos desde botones inline ---
  else if (data === 'cmd_chiste') {
    await sendChiste(chatId, userId);
  } else if (data === 'cmd_horaformosa') {
    await sendHoraFormosa(chatId, userId);
  } else if (data === 'cmd_clima') {
    await sendClima(chatId, userId);
  } else if (data === 'cmd_ppt') {
    await sendPptGame(chatId, userId);
  } else if (data === 'cmd_materias') {
    await sendMateriasList(chatId, userId);
  } else if (data === 'cmd_buscar') {
    await bot.sendMessage(chatId, `${getPersonalizedGreeting(userId)} Para buscar un archivo, por favor escribe /buscar [materia], [unidad] o /buscar [número materia], [número unidad].`);
  } else if (data === 'cmd_driveid') {
    await bot.sendMessage(chatId, `${getPersonalizedGreeting(userId)} Para obtener un ID de Drive, por favor escribe /driveid [enlace completo de Google Drive].`);
  } else if (data === 'cmd_agregarid') {
    await bot.sendMessage(chatId, `${getPersonalizedGreeting(userId)} Para actualizar un ID de Drive, por favor escribe /agregarid [materia], [unidad], [ID de Drive].`);
  } else if (data === 'cmd_unidades') { // Este es el manejador para /unidades desde el menú flotante
    await bot.sendMessage(chatId, `${getPersonalizedGreeting(userId)} Para ver las unidades de una materia, por favor escribe /unidades [nombre o número de la materia]. Ejemplo: /unidades Psicologia General o /unidades 1.`);
  } else if (data === 'cmd_info') {
    await sendInfo(chatId, userId);
  }
});


// 3. Comando /menu y manejador de texto "menu": Muestra el teclado interactivo con todos los comandos.
// En esta versión, /menu también muestra el menú principal inline.
bot.onText(/\/menu|menu/i, async (msg) => { 
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const userText = msg.text.toLowerCase().trim();

  if (userText === '/menu' || userText === 'menu') {
    await bot.sendMessage(chatId, `${getPersonalizedGreeting(userId)} Aquí está el menú de comandos:`, { reply_markup: mainMenuInlineKeyboard });
  }
});


// 4. Comando /mimbre [tu nombre]: Permite al usuario establecer su nombre.
bot.onText(/\/mimbre (.+)/, async (msg, match) => { 
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const nombre = match[1]; 

  if (!userNames[userId]) {
    userNames[userId] = {};
  }
  userNames[userId].name = nombre;

  const zonaHoraria = 'America/Argentina/Cordoba';
  const today = moment().tz(zonaHoraria);
  userNames[userId].authorizationDate = today.add(7, 'days').format('YYYY-MM-DD');

  saveUserData(); 

  await bot.sendMessage(chatId, `¡Entendido! Te llamaré ${nombre}. ¡Es un placer!`);
});

// 5. Comando /setciudad [ciudad]: Permite al usuario establecer su ciudad favorita para el clima.
bot.onText(/\/setciudad (.+)/, async (msg, match) => { 
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const ciudad = match[1]; 

  if (!userNames[userId]) {
    userNames[userId] = {};
  }
  userNames[userId].favoriteCity = ciudad; 
  saveUserData(); 

  await bot.sendMessage(chatId, `${getPersonalizedGreeting(userId)} ¡He guardado "${ciudad}" como tu ciudad favorita para el clima! Ahora puedes usar /clima para ver el pronóstico.`);
});

// 6. Comando /materias: Muestra el listado completo de materias de la carrera, ordenadas por año y cuatrimestre, con numeración global.
bot.onText(/\/materias/, async (msg) => { 
  const chatId = msg.chat.id;

  const fixedMateriasList = `¡Bien! Aquí tienes el listado de materias por año y cuatrimestre:\n\n` + 
  `*Primer Año*\n` +
  `  _1º Cuatrimestre_\n` +
  `    01 Introducción a la Filosofía\n` +
  `    02 Psicología General\n` +
  `    03 Pedagogía General\n` +
  `    04 Anatomía y Fisiología del Sist. Nervioso I\n\n` +
  `  _2º Cuatrimestre_\n` +
  `    05 Psicología Evolutiva I\n` +
  `    06 Psicoestadística\n` +
  `    07 Anatomía y Fisiología del Sist. Nervioso II\n\n` +
  `*Segundo Año*\n` +
  `  _1º Cuatrimestre_\n` +
  `    08 Psicología Evolutiva II\n` +
  `    09 Psicología Profunda\n` +
  `    10 Didáctica I\n\n` +
  `  _2º Cuatrimestre_\n` +
  `    11 Psicología Genética\n` +
  `    12 Técnicas de Exploración Psicopedagógica I\n` +
  `    13 Didáctica II\n` +
  `    14 Práctica I\n\n` +
  `*Tercer Año*\n` +
  `  _1º Cuatrimestre_\n` +
  `    15 Didáctica III\n` +
  `    16 Técnicas de Exploración Psicopedagogicas II\n` +
  `    17 Psicología Educacional\n` +
  `    18 Práctica II\n\n` +
  `  _2º Cuatrimestre_\n` +
  `    19 Psicopatología\n` +
  `    20 Ética Profesional\n` +
  `    21 Historia de la Educación Argentina\n` +
  `    22 Antropología\n` +
  `    23 Practica III\n\n` +
  `*Cuarto Año*\n` +
  `  _1º Cuatrimestre_\n` +
  `    24 Filosofía de la Educación\n` +
  `    25 Fonoaudiología\n` +
  `    26 Psicología Institucional y Dinamica de Grupo\n` +
  `    27 Pedagogía Diferenciada\n` +
  `    28 Práctica IV\n\n` +
  `  _2º Cuatrimestre_\n` +
  `    29 Técnicas de Reeducación\n` +
  `    30 Orientación Escolar y Vocacional\n` +
  `    31 Organización Escolar para la Enseñanza Comun y Especial\n` +
  `    32 Práctica V\n\n` +
  `Usa /buscar [número de materia], [número de unidad] o /buscar [materia], [unidad] para obtener un archivo.`;

  await bot.sendMessage(chatId, fixedMateriasList, { parse_mode: 'Markdown' });
});

// 7. Comando /buscar [criterio1], [criterio2]: Busca y envía un enlace a un archivo universitario.
// Acepta: /buscar [materia], [unidad] (texto) O /buscar [número materia], [número unidad] (números)
// En esta versión, busca un solo 'googleDriveLink' por unidad.
bot.onText(/\/buscar (.+?), (.+)/, async (msg, match) => { 
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  const input1 = match[1].trim(); 
  const input2 = match[2].trim(); 

  let materiaBuscadaTexto;
  let unidadBuscadaTexto;

  const materiaNumber = parseInt(input1);
  const isMateriaNumber = !isNaN(materiaNumber) && String(materiaNumber) === input1; 

  const unitNumber = parseInt(input2);
  const isUnitNumber = !isNaN(unitNumber) && String(unitNumber) === input2;

  if (isMateriaNumber) { 
    materiaBuscadaTexto = globalSubjectMap[materiaNumber];
    if (!materiaBuscadaTexto) {
      await bot.sendMessage(chatId, `${getPersonalizedGreeting(userId)} Lo siento, el número de materia *${materiaNumber}* no es válido. Usa /materias para ver el listado correcto.`, { parse_mode: 'Markdown' });
      return;
    }
  } else { 
    materiaBuscadaTexto = input1;
  }

  if (isUnitNumber) { 
    unidadBuscadaTexto = `Unidad ${unitNumber}`;
  } else { 
    unidadBuscadaTexto = input2;
  }

  const normalizedMateria = materiaBuscadaTexto.toLowerCase().replace(/\s/g, '');
  const normalizedUnidad = unidadBuscadaTexto.toLowerCase().replace(/\s/g, '');

  // Busca la entrada de archivo específica (asumiendo un solo archivo por unidad en esta versión)
  const foundFile = universityFiles.find(file => {
    const fileSubjectNormalized = file.subject.toLowerCase().replace(/\s/g, '');
    const fileUnitNormalized = file.unit.toLowerCase().replace(/\s/g, '');
    return fileSubjectNormalized.includes(normalizedMateria) && fileUnitNormalized.includes(normalizedUnidad);
  });

  if (foundFile) {
    const fileTitle = foundFile.title || foundFile.unit; 
    const googleDriveLink = foundFile.googleDriveLink; 

    if (googleDriveLink) {
      const inlineKeyboard = {
        reply_markup: {
          inline_keyboard: [
            [{ text: `⬇️ ${escapeMarkdown(fileTitle)}`, url: googleDriveLink }] 
          ]
        }
      };
      await bot.sendMessage(chatId, `${getPersonalizedGreeting(userId)} Aquí tienes el archivo de *${escapeMarkdown(foundFile.subject)}*, *${escapeMarkdown(foundFile.unit)}*:`, inlineKeyboard, { parse_mode: 'Markdown' });
    } else {
      await bot.sendMessage(chatId, `${getPersonalizedGreeting(userId)} Encontré el archivo *${escapeMarkdown(fileTitle)}*, pero no tiene un enlace de Google Drive configurado.`, { parse_mode: 'Markdown' });
    }
  } else {
    await bot.sendMessage(chatId, `${getPersonalizedGreeting(userId)} Lo siento, no encontré ningún archivo para la materia *${escapeMarkdown(materiaBuscadaTexto)}* y unidad *${escapeMarkdown(unidadBuscadaTexto)}*. Intenta ser más específico o consulta /materias.`, { parse_mode: 'Markdown' });
  }
});

// 8. Comando /hola (llama a la función central)
bot.onText(/hola/i, async (msg) => { 
    await handleHolaMessage(msg.chat.id, msg.from.id);
});

// 9. Comando /info (llama a la función central)
bot.onText(/\/info/, async (msg) => { 
    await sendInfo(msg.chat.id, msg.from.id);
});

// 10. Comando /chiste (llama a la función central)
bot.onText(/\/chiste/, async (msg) => { 
    await sendChiste(msg.chat.id, msg.from.id);
});

// 11. Comando /horaformosa (llama a la función central)
bot.onText(/\/horaformosa/, async (msg) => { 
    await sendHoraFormosa(msg.chat.id, msg.from.id);
});

// 12. Comando /clima (llama a la función central)
bot.onText(/\/clima/, async (msg) => { 
    await sendClima(msg.chat.id, msg.from.id);
});

// 13. Comando /ppt (inicia el juego, llama a la función central de Piedra, Papel o Tijera)
bot.onText(/\/ppt/, async (msg) => { 
    await sendPptGame(msg.chat.id, msg.from.id);
});

// 14. Manejador para los movimientos del jugador (piedra, papel o tijera) - llama a la función central
bot.onText(/\/(piedra|papel|tijera)/, async (msg) => { 
    await handlePptGameRound(msg); 
});

// 15. Comando /driveid [enlace]: Extrae y muestra el ID de un enlace de Google Drive (llama a la función central)
bot.onText(/\/driveid (.+)/, async (msg, match) => { 
    await sendDriveId(msg.chat.id, msg.from.id, match[1]);
});

// 16. Comando /agregarid [materia/numero], [unidad/numero], [ID de Google Drive]
// Este es el comando para ACTUALIZAR el ÚNICO enlace de Drive de una unidad existente.
// No agrega múltiples archivos por unidad en esta versión.
bot.onText(/\/agregarid (.+?), (.+?), (.+)/, async (msg, match) => { 
  const chatId = msg.chat.id;
  const userId = msg.from.id; 

  const materiaInput = match[1].trim(); 
  const unidadInput = match[2].trim(); 
  const driveId = match[3].trim(); 

  let materiaName;
  let unitName;

  const materiaNumber = parseInt(materiaInput);
  const isMateriaNumber = !isNaN(materiaNumber) && String(materiaNumber) === materiaInput; 

  if (isMateriaNumber) {
    materiaName = globalSubjectMap[materiaNumber];
    if (!materiaName) {
      await bot.sendMessage(chatId, `${getPersonalizedGreeting(userId)} Lo siento, el número de materia *${materiaNumber}* no es válido. Usa /materias para ver el listado correcto.`, { parse_mode: 'Markdown' });
      return;
    }
  } else {
    materiaName = materiaInput;
  }

  const unitNumber = parseInt(unidadInput);
  const isUnitNumber = !isNaN(unitNumber) && String(unitNumber) === unidadInput; 

  if (isUnitNumber) {
    unitName = `Unidad ${unitNumber}`;
  } else {
    unitName = unidadInput;
  }

  const normalizedMateria = materiaName.toLowerCase().replace(/\s/g, '');
  const normalizedUnidad = unitName.toLowerCase().replace(/\s/g, '');

  const fileIndex = universityFiles.findIndex(file => { 
    const fileSubjectNormalized = file.subject.toLowerCase().replace(/\s/g, '');
    const fileUnitNormalized = file.unit.toLowerCase().replace(/\s/g, '');
    return fileSubjectNormalized.includes(normalizedMateria) && fileUnitNormalized.includes(normalizedUnidad);
  });

  if (fileIndex !== -1) { 
    const existingFileEntry = universityFiles[fileIndex];
    const newGoogleDriveLink = `https://drive.google.com/uc?export=download&id=${driveId}`;
    
    existingFileEntry.googleDriveLink = newGoogleDriveLink; 
    
    saveUniversityFilesData(); 

    await bot.sendMessage(chatId, `${getPersonalizedGreeting(userId)} ¡Enlace actualizado! El archivo de *${escapeMarkdown(existingFileEntry.subject)}*, *${escapeMarkdown(existingFileEntry.unit)}* ahora usa el ID: \`${escapeMarkdown(driveId)}\`.`, { parse_mode: 'Markdown' });
  } else {
    await bot.sendMessage(chatId, `${getPersonalizedGreeting(userId)} Lo siento, no encontré la unidad *${escapeMarkdown(unitName)}* para la materia *${escapeMarkdown(materiaName)}* en la base de datos de archivos universitarios. Asegúrate de que los datos sean correctos.`, { parse_mode: 'Markdown' });
  }
});


// 17. Comando /unidades [materia/numero]: Lista las unidades de una materia específica (llama a la función central)
bot.onText(/\/unidades (.+)/, async (msg) => { 
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const materiaInput = msg.text.substring(msg.text.indexOf(' ') + 1).trim(); 

  await sendUnitList(chatId, userId, materiaInput);
});

// 18. Manejador genérico para mensajes no reconocidos (si no es un comando y no incluye "hola")
// Nota: Comandos como /agregar_material, /agregar_unidad NO EXISTEN EN ESTA VERSIÓN.
bot.on('message', async (msg) => { 
  const chatId = msg.chat.id;
  const userId = msg.from.id; 

  if (!msg.text) return; 

  if (!msg.text.startsWith('/') && !msg.text.toLowerCase().includes('hola')) {
      await bot.sendMessage(chatId, `${getPersonalizedGreeting(userId)} Recibí tu mensaje, pero aún no sé cómo responder a eso. Intenta /start o /info.`);
  }
});

// --- INICIO DEL BOT ---

console.log('¡Bot de Telegram iniciado y escuchando mensajes!');