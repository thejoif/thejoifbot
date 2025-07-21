const fs = require('fs');
const path = require('path');

// --- CONFIGURACIÓN ---
const ROOT_DIR = 'files/universidad'; // Carpeta raíz donde se crearán las carpetas (ej. G:\thejoifbot\files\universidad)
const CAREER_NAME = 'Psicopedagogia'; // Nombre de la carrera

// Define la estructura de la carrera basada en el PDF (puedes expandirlo)
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

// --- FUNCIÓN PARA CREAR CARPETAS ---
function createCareerFolders(basePath, structureData) {
  const careerPath = path.join(basePath, CAREER_NAME);
  fs.mkdirSync(careerPath, { recursive: true });
  console.log(`Creada carpeta raíz de carrera: ${careerPath}`);

  structureData.forEach(yearData => {
    const yearPath = path.join(careerPath, yearData.year);
    fs.mkdirSync(yearPath, { recursive: true });
    console.log(`  Creada carpeta de año: ${yearPath}`);

    yearData.semesters.forEach(semesterData => {
      const semesterPath = path.join(yearPath, semesterData.name);
      fs.mkdirSync(semesterPath, { recursive: true });
      console.log(`    Creada carpeta de cuatrimestre: ${semesterPath}`);

      semesterData.subjects.forEach(subject => {
        const subjectPath = path.join(semesterPath, subject);
        fs.mkdirSync(subjectPath, { recursive: true });
        console.log(`      Creada carpeta de materia: ${subjectPath}`);
        
        // Opcional: Crear carpetas de Unidad dentro de cada materia
        for (let i = 1; i <= 5; i++) { // Por ejemplo, 5 unidades por materia
          const unitPath = path.join(subjectPath, `Unidad ${i}`);
          fs.mkdirSync(unitPath, { recursive: true });
          console.log(`        Creada carpeta de unidad: ${unitPath}`);
        }
      });
    });
  });
  console.log('\n¡Estructura de carpetas creada exitosamente!');
}

// --- EJECUTAR ---
createCareerFolders(ROOT_DIR, careerStructure);