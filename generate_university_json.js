const fs = require('fs');

// --- ESTRUCTURA DE LA CARRERA (COPIA ESTO DE TU index.js) ---
// Es vital que esta estructura sea idéntica a la que tienes en tu index.js
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

// --- GENERACIÓN DEL ARCHIVO JSON ---
const UNIVERSITY_DATA_FILE_NAME = 'university_files.json';
const NUM_UNITS_PER_SUBJECT = 10; // Definimos que cada materia tiene 10 unidades

let allUniversityFilesData = [];
let globalFileCounter = 0; // Para generar IDs de placeholder únicos

careerStructure.forEach(yearData => {
  yearData.semesters.forEach(semesterData => {
    semesterData.subjects.forEach(subjectName => {
      for (let i = 1; i <= NUM_UNITS_PER_SUBJECT; i++) {
        globalFileCounter++;
        const unitName = `Unidad ${i}`;
        const formattedCounter = String(globalFileCounter).padStart(3, '0'); // Para IDs como 001, 002
        
        allUniversityFilesData.push({
          year: yearData.year,
          semester: semesterData.name,
          subject: subjectName,
          unit: unitName,
          title: `${subjectName} - ${unitName}`, // Título descriptivo
          // Placeholder para el enlace de Google Drive. DEBES REEMPLAZAR ESTOS IDS.
          googleDriveLink: `https://drive.google.com/uc?export=download&id=ID_GDRIVE_${formattedCounter}_${subjectName.replace(/\s/g, '_')}_${unitName.replace(/\s/g, '_')}`
        });
      }
    });
  });
});

// Escribir los datos en el archivo JSON
try {
  const jsonData = JSON.stringify(allUniversityFilesData, null, 2); // null, 2 para formato legible
  fs.writeFileSync(UNIVERSITY_DATA_FILE_NAME, jsonData, 'utf8');
  console.log(`¡Archivo '${UNIVERSITY_DATA_FILE_NAME}' generado exitosamente con ${allUniversityFilesData.length} entradas!`);
  console.log('RECUERDA: Debes reemplazar los IDs de Google Drive en este archivo.');
} catch (error) {
  console.error(`Error al generar el archivo '${UNIVERSITY_DATA_FILE_NAME}':`, error);
}