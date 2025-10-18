"""
Script de Seeding - Contenido Inicial de Capacitación
Módulos 1-5: Turismo Religioso para Spirit Tours

Este script crea el contenido completo de capacitación inicial incluyendo:
- 5 módulos sobre turismo religioso
- Lecciones con videos, documentos y artículos
- Quizzes con preguntas de evaluación
- Metadata completa (categorías, duraciones, íconos)
"""

import sys
import os
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from datetime import datetime, timezone
import uuid
from typing import List, Dict, Any

from backend.models.training_models import (
    TrainingModule, TrainingLesson, TrainingQuiz, TrainingQuestion,
    ModuleCategory, ContentType, QuestionType
)
from backend.models.rbac_models import Base

# Database connection
DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://user:password@localhost:5432/spirittours')
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)

# ============================================================================
# CONTENIDO DE LOS MÓDULOS
# ============================================================================

MODULES_DATA = [
    {
        "title": "Introducción a Spirit Tours y Turismo Religioso",
        "description": """
        Bienvenida a Spirit Tours. Este módulo introductorio te familiarizará con nuestra empresa,
        nuestra misión, valores y la importancia del turismo religioso en el mundo actual.
        
        Aprenderás sobre:
        - Historia y misión de Spirit Tours
        - Valores corporativos y cultura organizacional
        - ¿Qué es el turismo religioso?
        - Importancia del turismo religioso en el mercado
        - Perfil de nuestros clientes
        """,
        "category": ModuleCategory.OBLIGATORY,
        "estimated_hours": 3.0,
        "position": 1,
        "passing_score": 85,
        "icon": "🏛️",
        "color": "#4A90E2",
        "tags": ["introducción", "empresa", "turismo religioso", "valores"],
        "lessons": [
            {
                "title": "Bienvenida a Spirit Tours",
                "description": "Conoce nuestra empresa, misión y valores corporativos",
                "content_type": ContentType.VIDEO,
                "content_url": "https://example.com/videos/bienvenida-spirit-tours.mp4",
                "duration_minutes": 15,
                "position": 1,
                "is_mandatory": True,
                "content": """
                <h2>Bienvenido a Spirit Tours</h2>
                <p>Spirit Tours es líder en turismo religioso en Latinoamérica. Fundada en 2010, 
                nos especializamos en crear experiencias espirituales inolvidables.</p>
                
                <h3>Nuestra Misión</h3>
                <p>Facilitar experiencias de peregrinación y turismo religioso que enriquezcan 
                la vida espiritual de nuestros clientes, combinando fe, cultura e historia.</p>
                
                <h3>Nuestros Valores</h3>
                <ul>
                    <li><strong>Respeto:</strong> Por todas las creencias y tradiciones religiosas</li>
                    <li><strong>Excelencia:</strong> En cada detalle de nuestros servicios</li>
                    <li><strong>Integridad:</strong> Transparencia y honestidad en todo momento</li>
                    <li><strong>Compromiso:</strong> Con la satisfacción de nuestros clientes</li>
                    <li><strong>Pasión:</strong> Por crear experiencias espirituales significativas</li>
                </ul>
                """,
            },
            {
                "title": "¿Qué es el Turismo Religioso?",
                "description": "Definición, historia y tipos de turismo religioso",
                "content_type": ContentType.ARTICLE,
                "content_url": None,
                "duration_minutes": 20,
                "position": 2,
                "is_mandatory": True,
                "content": """
                <h2>Turismo Religioso: Definición y Alcance</h2>
                
                <h3>Definición</h3>
                <p>El turismo religioso es una forma de turismo donde las personas viajan 
                individualmente o en grupos con fines de peregrinación, misioneros o de ocio 
                (fellowship) relacionados con su fe.</p>
                
                <h3>Historia</h3>
                <p>El turismo religioso es una de las formas más antiguas de viaje. Desde la 
                antigüedad, personas de todas las religiones han emprendido peregrinaciones a 
                lugares sagrados.</p>
                
                <h3>Tipos de Turismo Religioso</h3>
                <ol>
                    <li><strong>Peregrinaciones:</strong> Viajes a sitios sagrados (Jerusalén, 
                    Roma, Lourdes, Santiago de Compostela, La Meca)</li>
                    
                    <li><strong>Turismo de Fe:</strong> Visitas a lugares relacionados con eventos 
                    religiosos o figuras espirituales</li>
                    
                    <li><strong>Turismo Cultural-Religioso:</strong> Exploración de patrimonio 
                    religioso (catedrales, monasterios, arte sacro)</li>
                    
                    <li><strong>Retiros Espirituales:</strong> Estancias en monasterios, casas de 
                    retiro o centros de meditación</li>
                    
                    <li><strong>Eventos Religiosos:</strong> Participación en festivales, ceremonias 
                    especiales o celebraciones litúrgicas</li>
                </ol>
                
                <h3>Importancia Económica</h3>
                <p>El turismo religioso representa aproximadamente el 20% del turismo mundial, 
                generando más de $18 mil millones anuales. Más de 300 millones de personas 
                viajan anualmente por motivos religiosos.</p>
                
                <h3>Destinos Principales</h3>
                <ul>
                    <li><strong>Católicos:</strong> Roma (Vaticano), Lourdes, Fátima, Guadalupe, 
                    Santiago de Compostela</li>
                    <li><strong>Cristianos:</strong> Jerusalén, Tierra Santa, Roma</li>
                    <li><strong>Musulmanes:</strong> La Meca, Medina</li>
                    <li><strong>Judíos:</strong> Jerusalén, Muro de los Lamentos</li>
                    <li><strong>Budistas:</strong> Bodh Gaya, Lumbini, Sarnath</li>
                    <li><strong>Hindúes:</strong> Varanasi, Rishikesh, Haridwar</li>
                </ul>
                """,
            },
            {
                "title": "Perfil de Nuestros Clientes",
                "description": "Conoce los diferentes tipos de clientes de Spirit Tours",
                "content_type": ContentType.DOCUMENT,
                "content_url": "https://example.com/docs/perfil-clientes.pdf",
                "duration_minutes": 25,
                "position": 3,
                "is_mandatory": True,
                "content": """
                <h2>Perfil de Clientes - Spirit Tours</h2>
                
                <h3>1. Sacerdotes y Líderes Religiosos (30%)</h3>
                <p><strong>Características:</strong></p>
                <ul>
                    <li>Edad: 40-70 años</li>
                    <li>Organizan grupos parroquiales o diocesanos</li>
                    <li>Presupuesto: Moderado a limitado</li>
                    <li>Prioridades: Experiencia espiritual auténtica, liturgia diaria</li>
                    <li>Sensibilidad: Alta a temas religiosos y litúrgicos</li>
                </ul>
                
                <p><strong>Necesidades específicas:</strong></p>
                <ul>
                    <li>Acceso a misas diarias</li>
                    <li>Espacios para oración y reflexión</li>
                    <li>Guías conocedores de historia religiosa</li>
                    <li>Flexibilidad para actividades litúrgicas</li>
                </ul>
                
                <h3>2. Líderes de Grupos de Viaje (25%)</h3>
                <p><strong>Características:</strong></p>
                <ul>
                    <li>Edad: 35-65 años</li>
                    <li>Organizan viajes para comunidades o parroquias</li>
                    <li>Presupuesto: Variable</li>
                    <li>Prioridades: Logística eficiente, relación calidad-precio</li>
                    <li>Buscan: Simplicidad en coordinación, confiabilidad</li>
                </ul>
                
                <p><strong>Necesidades específicas:</strong></p>
                <ul>
                    <li>Coordinación centralizada</li>
                    <li>Flexibilidad en pagos</li>
                    <li>Comunicación clara y constante</li>
                    <li>Soporte para promoción del viaje</li>
                </ul>
                
                <h3>3. Peregrinos Individuales (20%)</h3>
                <p><strong>Características:</strong></p>
                <ul>
                    <li>Edad: 30-75 años</li>
                    <li>Viajan solos, en pareja o familia pequeña</li>
                    <li>Presupuesto: Amplio rango</li>
                    <li>Motivación: Búsqueda espiritual personal, cumplimiento de promesas</li>
                    <li>Perfil: Independientes pero valoran guía experta</li>
                </ul>
                
                <h3>4. Grupos Parroquiales (15%)</h3>
                <p><strong>Características:</strong></p>
                <ul>
                    <li>Grupos de 15-40 personas</li>
                    <li>Edad promedio: 50-70 años</li>
                    <li>Presupuesto: Moderado</li>
                    <li>Motivación: Experiencia comunitaria de fe</li>
                    <li>Dinámica: Grupo cohesionado con liderazgo religioso</li>
                </ul>
                
                <h3>5. Jóvenes y Familias (10%)</h3>
                <p><strong>Características:</strong></p>
                <ul>
                    <li>Edad: 25-45 años con hijos</li>
                    <li>Buscan: Experiencia educativa y espiritual para niños</li>
                    <li>Presupuesto: Moderado a alto</li>
                    <li>Motivación: Transmitir valores religiosos a nueva generación</li>
                </ul>
                
                <h3>Insights Clave para Ventas</h3>
                <div style="background: #FFF3CD; padding: 15px; border-radius: 5px;">
                    <p><strong>1. Lenguaje apropiado:</strong> Use terminología respetuosa y 
                    correcta según la denominación</p>
                    
                    <p><strong>2. Sensibilidad cultural:</strong> Conozca las diferencias entre 
                    católicos, evangélicos, ortodoxos</p>
                    
                    <p><strong>3. Flexibilidad:</strong> Cada grupo tiene necesidades únicas</p>
                    
                    <p><strong>4. Confianza:</strong> Estos viajes son profundamente personales, 
                    genere confianza desde el primer contacto</p>
                </div>
                """,
            },
        ],
        "quiz": {
            "title": "Evaluación: Introducción a Spirit Tours",
            "description": "Evalúa tu comprensión sobre Spirit Tours y turismo religioso",
            "passing_score": 85,
            "time_limit_minutes": 20,
            "questions": [
                {
                    "question_text": "¿Cuál es la misión principal de Spirit Tours?",
                    "question_type": QuestionType.MULTIPLE_CHOICE,
                    "points": 10,
                    "options": {
                        "A": "Vender paquetes turísticos económicos",
                        "B": "Facilitar experiencias de peregrinación que enriquezcan la vida espiritual",
                        "C": "Competir con otras agencias de viaje",
                        "D": "Organizar eventos sociales religiosos"
                    },
                    "correct_answer": "B",
                    "explanation": "Nuestra misión es facilitar experiencias de peregrinación y turismo religioso que enriquezcan la vida espiritual de nuestros clientes, combinando fe, cultura e historia."
                },
                {
                    "question_text": "¿Qué porcentaje del turismo mundial representa el turismo religioso?",
                    "question_type": QuestionType.MULTIPLE_CHOICE,
                    "points": 10,
                    "options": {
                        "A": "5%",
                        "B": "10%",
                        "C": "20%",
                        "D": "30%"
                    },
                    "correct_answer": "C",
                    "explanation": "El turismo religioso representa aproximadamente el 20% del turismo mundial, generando más de $18 mil millones anuales."
                },
                {
                    "question_text": "¿Cuál NO es uno de los valores corporativos de Spirit Tours?",
                    "question_type": QuestionType.MULTIPLE_CHOICE,
                    "points": 10,
                    "options": {
                        "A": "Respeto",
                        "B": "Competitividad",
                        "C": "Integridad",
                        "D": "Excelencia"
                    },
                    "correct_answer": "B",
                    "explanation": "Nuestros valores son: Respeto, Excelencia, Integridad, Compromiso y Pasión. La competitividad no es un valor corporativo."
                },
                {
                    "question_text": "¿Qué porcentaje de nuestros clientes son sacerdotes y líderes religiosos?",
                    "question_type": QuestionType.MULTIPLE_CHOICE,
                    "points": 10,
                    "options": {
                        "A": "10%",
                        "B": "20%",
                        "C": "30%",
                        "D": "40%"
                    },
                    "correct_answer": "C",
                    "explanation": "Los sacerdotes y líderes religiosos representan el 30% de nuestros clientes."
                },
                {
                    "question_text": "El turismo religioso solo incluye peregrinaciones a lugares sagrados.",
                    "question_type": QuestionType.TRUE_FALSE,
                    "points": 10,
                    "options": {"true": "Verdadero", "false": "Falso"},
                    "correct_answer": "false",
                    "explanation": "El turismo religioso incluye peregrinaciones, pero también turismo de fe, cultural-religioso, retiros espirituales y participación en eventos religiosos."
                },
                {
                    "question_text": "¿Cuál es una necesidad específica de los sacerdotes como clientes?",
                    "question_type": QuestionType.MULTIPLE_CHOICE,
                    "points": 10,
                    "options": {
                        "A": "Hoteles de lujo",
                        "B": "Acceso a misas diarias",
                        "C": "Actividades de aventura",
                        "D": "Discotecas y vida nocturna"
                    },
                    "correct_answer": "B",
                    "explanation": "Los sacerdotes requieren acceso a misas diarias, espacios para oración y guías conocedores de historia religiosa."
                },
                {
                    "question_text": "¿Cuántas personas viajan anualmente por motivos religiosos?",
                    "question_type": QuestionType.MULTIPLE_CHOICE,
                    "points": 10,
                    "options": {
                        "A": "50 millones",
                        "B": "100 millones",
                        "C": "200 millones",
                        "D": "300 millones"
                    },
                    "correct_answer": "D",
                    "explanation": "Más de 300 millones de personas viajan anualmente por motivos religiosos en todo el mundo."
                },
                {
                    "question_text": "¿Qué significa 'fellowship' en el contexto del turismo religioso?",
                    "question_type": QuestionType.MULTIPLE_CHOICE,
                    "points": 10,
                    "options": {
                        "A": "Viajes de lujo",
                        "B": "Ocio y compañerismo entre fieles",
                        "C": "Negocios religiosos",
                        "D": "Turismo de aventura"
                    },
                    "correct_answer": "B",
                    "explanation": "Fellowship se refiere al ocio y compañerismo entre personas de la misma fe, fortaleciendo lazos comunitarios."
                },
                {
                    "question_text": "El respeto por todas las creencias es fundamental en Spirit Tours.",
                    "question_type": QuestionType.TRUE_FALSE,
                    "points": 10,
                    "options": {"true": "Verdadero", "false": "Falso"},
                    "correct_answer": "true",
                    "explanation": "El respeto por todas las creencias y tradiciones religiosas es uno de nuestros valores fundamentales."
                },
                {
                    "question_text": "¿Qué tipo de cliente busca principalmente experiencia educativa para sus hijos?",
                    "question_type": QuestionType.MULTIPLE_CHOICE,
                    "points": 10,
                    "options": {
                        "A": "Sacerdotes",
                        "B": "Líderes de grupos",
                        "C": "Jóvenes y familias",
                        "D": "Peregrinos individuales"
                    },
                    "correct_answer": "C",
                    "explanation": "Las familias jóvenes buscan experiencias educativas y espirituales para transmitir valores religiosos a sus hijos."
                }
            ]
        }
    },
    
    # MÓDULO 2
    {
        "title": "Destinos Religiosos Principales de Spirit Tours",
        "description": """
        Explora los destinos más importantes que ofrecemos en Spirit Tours. Conoce la historia,
        significado religioso y atractivos de cada ubicación.
        
        Destinos cubiertos:
        - Tierra Santa (Israel, Palestina, Jordania)
        - Roma y El Vaticano
        - Lourdes y Fátima
        - Santiago de Compostela
        - México (Basílica de Guadalupe)
        """,
        "category": ModuleCategory.OBLIGATORY,
        "estimated_hours": 4.5,
        "position": 2,
        "passing_score": 85,
        "icon": "🌍",
        "color": "#E74C3C",
        "tags": ["destinos", "geografía", "historia religiosa", "sitios sagrados"],
        "lessons": [
            {
                "title": "Tierra Santa: Cuna del Cristianismo",
                "description": "Israel, Palestina y Jordania - Los lugares donde caminó Jesús",
                "content_type": ContentType.VIDEO,
                "content_url": "https://example.com/videos/tierra-santa.mp4",
                "duration_minutes": 35,
                "position": 1,
                "is_mandatory": True,
                "content": """
                <h2>Tierra Santa: El Corazón del Cristianismo</h2>
                
                <h3>¿Por qué es importante?</h3>
                <p>Tierra Santa es el lugar donde ocurrieron los eventos centrales del cristianismo:
                el nacimiento, ministerio, crucifixión y resurrección de Jesucristo.</p>
                
                <h3>Sitios Principales en Jerusalén</h3>
                <ol>
                    <li><strong>Monte del Templo / Explanada de las Mezquitas</strong>
                        <ul>
                            <li>Ubicación del antiguo Templo de Jerusalén</li>
                            <li>Muro de los Lamentos (Muro Occidental)</li>
                            <li>Sitio sagrado para judíos, cristianos y musulmanes</li>
                        </ul>
                    </li>
                    
                    <li><strong>Basílica del Santo Sepulcro</strong>
                        <ul>
                            <li>Construida sobre el Gólgota (lugar de la crucifixión)</li>
                            <li>Contiene la tumba de Jesús</li>
                            <li>Compartida por 6 denominaciones cristianas</li>
                        </ul>
                    </li>
                    
                    <li><strong>Vía Dolorosa</strong>
                        <ul>
                            <li>Camino que siguió Jesús hacia la crucifixión</li>
                            <li>14 estaciones del Viacrucis</li>
                            <li>Recorrido de aproximadamente 600 metros</li>
                        </ul>
                    </li>
                    
                    <li><strong>Monte de los Olivos</strong>
                        <ul>
                            <li>Jardín de Getsemaní</li>
                            <li>Basílica de la Agonía</li>
                            <li>Lugar de la Ascensión</li>
                        </ul>
                    </li>
                    
                    <li><strong>Cenáculo</strong>
                        <ul>
                            <li>Lugar de la Última Cena</li>
                            <li>Pentecostés</li>
                        </ul>
                    </li>
                </ol>
                
                <h3>Belén (Palestina)</h3>
                <ul>
                    <li><strong>Basílica de la Natividad:</strong> Lugar del nacimiento de Jesús</li>
                    <li><strong>Gruta de la Natividad:</strong> Marca el lugar exacto</li>
                    <li><strong>Campo de los Pastores:</strong> Donde el ángel anunció el nacimiento</li>
                </ul>
                
                <h3>Nazaret (Israel)</h3>
                <ul>
                    <li><strong>Basílica de la Anunciación:</strong> Donde María recibió el mensaje del ángel</li>
                    <li><strong>Iglesia de San José:</strong> Taller del padre adoptivo de Jesús</li>
                    <li><strong>Sinagoga:</strong> Donde Jesús leyó las escrituras</li>
                </ul>
                
                <h3>Mar de Galilea (Israel)</h3>
                <ul>
                    <li><strong>Cafarnaúm:</strong> Ciudad base del ministerio de Jesús</li>
                    <li><strong>Monte de las Bienaventuranzas:</strong> Sermón del Monte</li>
                    <li><strong>Tabgha:</strong> Multiplicación de los panes y peces</li>
                    <li><strong>Río Jordán:</strong> Lugar del bautismo de Jesús</li>
                </ul>
                
                <h3>Jordania</h3>
                <ul>
                    <li><strong>Monte Nebo:</strong> Donde Moisés vio la Tierra Prometida</li>
                    <li><strong>Madaba:</strong> Ciudad de los mosaicos bizantinos</li>
                    <li><strong>Petra:</strong> Ciudad nabatea (opcional cultural)</li>
                </ul>
                
                <h3>Consideraciones Importantes</h3>
                <div style="background: #D4EDDA; padding: 15px; border-radius: 5px;">
                    <p><strong>Seguridad:</strong> La región es generalmente segura para turistas, 
                    pero seguimos protocolos estrictos</p>
                    
                    <p><strong>Respeto:</strong> Es importante vestir modestamente y respetar 
                    las normas de cada sitio sagrado</p>
                    
                    <p><strong>Documentación:</strong> Verificar requisitos de visa según país de origen</p>
                    
                    <p><strong>Clima:</strong> Mejor época: marzo-mayo y septiembre-noviembre</p>
                </div>
                
                <h3>Duración Típica del Tour</h3>
                <p><strong>Paquete estándar:</strong> 8-10 días<br>
                <strong>Paquete extendido:</strong> 12-15 días (incluye Petra, Sinaí)</p>
                """,
            },
            {
                "title": "Roma y El Vaticano: Centro de la Cristiandad",
                "description": "Capital del catolicismo y sitios de martirio de los apóstoles",
                "content_type": ContentType.ARTICLE,
                "content_url": None,
                "duration_minutes": 30,
                "position": 2,
                "is_mandatory": True,
                "content": """
                <h2>Roma y El Vaticano</h2>
                
                <h3>Ciudad del Vaticano</h3>
                <p>El estado independiente más pequeño del mundo, sede de la Iglesia Católica 
                y residencia del Papa.</p>
                
                <h4>Basílica de San Pedro</h4>
                <ul>
                    <li>Construida sobre la tumba del apóstol Pedro</li>
                    <li>La iglesia más grande del mundo</li>
                    <li>Cúpula diseñada por Miguel Ángel</li>
                    <li><strong>La Pietà</strong> de Miguel Ángel</li>
                    <li>Baldaquino de Bernini sobre el altar papal</li>
                    <li>Tumba de San Pedro en las grutas</li>
                </ul>
                
                <h4>Capilla Sixtina</h4>
                <ul>
                    <li>Pinturas al fresco de Miguel Ángel</li>
                    <li><strong>La Creación de Adán</strong> en la bóveda</li>
                    <li><strong>El Juicio Final</strong> en el altar</li>
                    <li>Lugar donde se elige al Papa (cónclave)</li>
                </ul>
                
                <h4>Museos Vaticanos</h4>
                <ul>
                    <li>Colección de arte más grande del mundo</li>
                    <li>Galerías: Pinacoteca, Egipcia, Etrusca</li>
                    <li>Estancias de Rafael</li>
                    <li>Galería de los Mapas</li>
                </ul>
                
                <h4>Plaza de San Pedro</h4>
                <ul>
                    <li>Diseñada por Bernini</li>
                    <li>Capacidad: 300,000 personas</li>
                    <li>Obelisco central traído de Egipto</li>
                    <li>Lugar de bendiciones papales</li>
                </ul>
                
                <h3>Basílicas Principales de Roma</h3>
                
                <h4>San Juan de Letrán</h4>
                <ul>
                    <li><strong>Catedral de Roma</strong> - más importante que San Pedro</li>
                    <li>"Madre de todas las iglesias"</li>
                    <li>Sede del Papa como Obispo de Roma</li>
                    <li>Escalera Santa: 28 escalones que Jesús subió ante Pilato</li>
                </ul>
                
                <h4>San Pablo Extramuros</h4>
                <ul>
                    <li>Construida sobre la tumba de San Pablo</li>
                    <li>Segunda basílica más grande de Roma</li>
                    <li>Medallones de todos los papas</li>
                </ul>
                
                <h4>Santa María la Mayor</h4>
                <ul>
                    <li>Una de las primeras iglesias marianas</li>
                    <li>Mosaicos del siglo V</li>
                    <li>Reliquia del pesebre de Jesús</li>
                </ul>
                
                <h4>Santa María en Trastevere</h4>
                <ul>
                    <li>Primera iglesia mariana oficial</li>
                    <li>Mosaicos dorados bizantinos</li>
                    <li>Barrio auténtico romano</li>
                </ul>
                
                <h3>Sitios de Martirio Cristiano</h3>
                
                <h4>Coliseo Romano</h4>
                <ul>
                    <li>Lugar de martirio de cristianos</li>
                    <li>Viacrucis cada Viernes Santo oficiado por el Papa</li>
                </ul>
                
                <h4>Catacumbas</h4>
                <ul>
                    <li><strong>San Calixto:</strong> Más grandes, con tumbas de papas</li>
                    <li><strong>Santa Domitila:</strong> Mejor preservadas</li>
                    <li><strong>San Sebastián:</strong> Con basílica arriba</li>
                    <li>Cementerios subterráneos de primeros cristianos</li>
                    <li>Arte paleocristiano (símbolos: pez, ancla, paloma)</li>
                </ul>
                
                <h3>Otros Sitios Importantes</h3>
                <ul>
                    <li><strong>Fontana di Trevi:</strong> Tradición de lanzar moneda para regresar</li>
                    <li><strong>Panteón:</strong> Templo romano convertido en iglesia</li>
                    <li><strong>Iglesia del Gesù:</strong> Primera iglesia jesuita</li>
                    <li><strong>Santa María de los Ángeles:</strong> Termas de Diocleciano</li>
                </ul>
                
                <h3>Audiencias y Eventos Papales</h3>
                <div style="background: #FFF3CD; padding: 15px; border-radius: 5px;">
                    <p><strong>Audiencia General:</strong> Miércoles a las 10:00 (tickets gratuitos)</p>
                    <p><strong>Ángelus:</strong> Domingos al mediodía desde ventana papal</p>
                    <p><strong>Misas Papales:</strong> Eventos especiales (Pascua, Navidad)</p>
                    <p><strong>Beatificaciones/Canonizaciones:</strong> En Plaza San Pedro</p>
                </div>
                
                <h3>Información Práctica</h3>
                <p><strong>Duración recomendada:</strong> 4-5 días mínimo</p>
                <p><strong>Mejor época:</strong> Abril-junio, septiembre-octubre</p>
                <p><strong>Vestimenta:</strong> Hombros y rodillas cubiertos en iglesias</p>
                <p><strong>Entradas:</strong> Reservar Vaticano con anticipación</p>
                """,
            },
            {
                "title": "Santuarios Marianos: Lourdes y Fátima",
                "description": "Sitios de apariciones marianas más visitados del mundo",
                "content_type": ContentType.DOCUMENT,
                "content_url": "https://example.com/docs/santuarios-marianos.pdf",
                "duration_minutes": 25,
                "position": 3,
                "is_mandatory": True,
                "content": """
                <h2>Santuarios Marianos: Lourdes y Fátima</h2>
                
                <h3>Lourdes, Francia</h3>
                
                <h4>Historia de las Apariciones</h4>
                <ul>
                    <li><strong>Fecha:</strong> Febrero-julio 1858</li>
                    <li><strong>Vidente:</strong> Bernadette Soubirous (14 años)</li>
                    <li><strong>Número de apariciones:</strong> 18</li>
                    <li><strong>Lugar:</strong> Gruta de Massabielle</li>
                    <li><strong>Mensaje:</strong> "Yo soy la Inmaculada Concepción"</li>
                </ul>
                
                <h4>El Milagro del Agua</h4>
                <p>La Virgen indicó a Bernadette que cavara en el suelo de la gruta. 
                Brotó un manantial que hoy produce 100,000 litros diarios. 
                El agua se asocia con más de 7,000 curaciones inexplicables, 
                70 oficialmente reconocidas como milagros por la Iglesia.</p>
                
                <h4>Sitios Principales</h4>
                <ol>
                    <li><strong>Gruta de Massabielle</strong>
                        <ul>
                            <li>Lugar de las apariciones</li>
                            <li>Estatua de la Virgen</li>
                            <li>Manantial milagroso</li>
                            <li>Velas votivas</li>
                        </ul>
                    </li>
                    
                    <li><strong>Basílica Superior (Inmaculada Concepción)</strong>
                        <ul>
                            <li>Estilo neogótico</li>
                            <li>19 altares dedicados a misterios del Rosario</li>
                        </ul>
                    </li>
                    
                    <li><strong>Basílica del Rosario</strong>
                        <ul>
                            <li>Base de las dos basílicas</li>
                            <li>Mosaicos de misterios del Rosario</li>
                        </ul>
                    </li>
                    
                    <li><strong>Basílica Subterránea San Pío X</strong>
                        <ul>
                            <li>Capacidad: 25,000 personas</li>
                            <li>Bajo tierra (elíptica)</li>
                        </ul>
                    </li>
                    
                    <li><strong>Piscinas</strong>
                        <ul>
                            <li>Baño ritual en agua de la gruta</li>
                            <li>Símbolo de purificación espiritual</li>
                        </ul>
                    </li>
                    
                    <li><strong>Procesiones</strong>
                        <ul>
                            <li><strong>Procesión Mariana:</strong> 17:00 diariamente</li>
                            <li><strong>Procesión Eucarística:</strong> 21:00 con velas</li>
                        </ul>
                    </li>
                </ol>
                
                <h4>Estadísticas</h4>
                <ul>
                    <li><strong>Visitantes anuales:</strong> 6 millones</li>
                    <li><strong>Peregrinos enfermos:</strong> 80,000 al año</li>
                    <li><strong>Voluntarios:</strong> 90,000 anuales</li>
                    <li><strong>Misas diarias:</strong> 30-40</li>
                </ul>
                
                <hr>
                
                <h3>Fátima, Portugal</h3>
                
                <h4>Historia de las Apariciones</h4>
                <ul>
                    <li><strong>Fecha:</strong> Mayo-octubre 1917</li>
                    <li><strong>Videntes:</strong> Lucía dos Santos (10), Francisco (9) y Jacinta Marto (7)</li>
                    <li><strong>Número de apariciones:</strong> 6</li>
                    <li><strong>Lugar:</strong> Cova da Iria</li>
                    <li><strong>Día:</strong> 13 de cada mes</li>
                </ul>
                
                <h4>Los Tres Secretos de Fátima</h4>
                <ol>
                    <li><strong>Primer Secreto:</strong> Visión del infierno</li>
                    <li><strong>Segundo Secreto:</strong> Profecía sobre guerras y consagración de Rusia</li>
                    <li><strong>Tercer Secreto:</strong> Atentado contra el Papa (revelado en 2000)</li>
                </ol>
                
                <h4>El Milagro del Sol (13 octubre 1917)</h4>
                <p>Presenciado por 70,000 personas. El sol pareció danzar, cambiar de colores 
                y lanzarse hacia la tierra. Reportado por periódicos seculares de la época.</p>
                
                <h4>Sitios Principales</h4>
                <ol>
                    <li><strong>Capilla de las Apariciones</strong>
                        <ul>
                            <li>Lugar exacto de las apariciones</li>
                            <li>Columna marca donde estaba la encina</li>
                            <li>Estatua de Nuestra Señora de Fátima</li>
                        </ul>
                    </li>
                    
                    <li><strong>Basílica de Nuestra Señora del Rosario</strong>
                        <ul>
                            <li>Construida 1928-1953</li>
                            <li>Torre de 65 metros</li>
                            <li>Tumbas de los tres videntes</li>
                        </ul>
                    </li>
                    
                    <li><strong>Basílica de la Santísima Trinidad</strong>
                        <ul>
                            <li>Inaugurada 2007</li>
                            <li>Cuarta iglesia católica más grande del mundo</li>
                            <li>Capacidad: 8,633 personas</li>
                            <li>Arquitectura moderna</li>
                        </ul>
                    </li>
                    
                    <li><strong>Vía Sacra (Camino del Rosario)</strong>
                        <ul>
                            <li>15 capillas con esculturas</li>
                            <li>Representa misterios del Rosario</li>
                        </ul>
                    </li>
                    
                    <li><strong>Casas de los Pastorcitos</strong>
                        <ul>
                            <li>Aljustrel: pueblo natal de los videntes</li>
                            <li>Casas-museo preservadas</li>
                        </ul>
                    </li>
                </ol>
                
                <h4>Fechas Importantes</h4>
                <ul>
                    <li><strong>13 de cada mes:</strong> Peregrinación mensual</li>
                    <li><strong>13 de mayo:</strong> Aniversario primera aparición (mayor peregrinación)</li>
                    <li><strong>13 de octubre:</strong> Aniversario última aparición y Milagro del Sol</li>
                </ul>
                
                <h4>Estadísticas</h4>
                <ul>
                    <li><strong>Visitantes anuales:</strong> 6-9 millones</li>
                    <li><strong>Mayo 13:</strong> 200,000-500,000 peregrinos</li>
                    <li><strong>Área del santuario:</strong> 55 hectáreas</li>
                </ul>
                
                <h3>Comparación Lourdes vs Fátima</h3>
                <table border="1" cellpadding="10" style="width:100%; border-collapse: collapse;">
                    <tr>
                        <th>Aspecto</th>
                        <th>Lourdes</th>
                        <th>Fátima</th>
                    </tr>
                    <tr>
                        <td><strong>Enfoque</strong></td>
                        <td>Curaciones físicas y espirituales</td>
                        <td>Oración por la paz mundial</td>
                    </tr>
                    <tr>
                        <td><strong>Ambiente</strong></td>
                        <td>Montañas, naturaleza, íntimo</td>
                        <td>Planicie abierta, expansivo</td>
                    </tr>
                    <tr>
                        <td><strong>Arquitectura</strong></td>
                        <td>Neogótica tradicional</td>
                        <td>Mix: neoclásico + moderno</td>
                    </tr>
                    <tr>
                        <td><strong>Mejor época</strong></td>
                        <td>Abril-octubre</td>
                        <td>Mayo, octubre (peregrinaciones mayores)</td>
                    </tr>
                    <tr>
                        <td><strong>Duración recomendada</strong></td>
                        <td>2-3 días</td>
                        <td>1-2 días</td>
                    </tr>
                </table>
                
                <h3>Combinación de Tours</h3>
                <p>Muchos peregrinos visitan ambos santuarios en un solo viaje:</p>
                <ul>
                    <li><strong>Ruta Francia-España-Portugal:</strong> Lourdes → Santiago → Fátima</li>
                    <li><strong>Duración:</strong> 10-12 días</li>
                    <li><strong>Mejor época:</strong> Mayo-octubre</li>
                </ul>
                """,
            },
        ],
        "quiz": {
            "title": "Evaluación: Destinos Religiosos Principales",
            "description": "Evalúa tu conocimiento sobre los principales destinos de Spirit Tours",
            "passing_score": 85,
            "time_limit_minutes": 25,
            "questions": [
                {
                    "question_text": "¿En qué ciudad se encuentra la Basílica del Santo Sepulcro?",
                    "question_type": QuestionType.MULTIPLE_CHOICE,
                    "points": 10,
                    "options": {
                        "A": "Belén",
                        "B": "Jerusalén",
                        "C": "Nazaret",
                        "D": "Roma"
                    },
                    "correct_answer": "B",
                    "explanation": "La Basílica del Santo Sepulcro está en Jerusalén, construida sobre el Gólgota y la tumba de Jesús."
                },
                {
                    "question_text": "¿Cuál es la basílica más grande del mundo?",
                    "question_type": QuestionType.MULTIPLE_CHOICE,
                    "points": 10,
                    "options": {
                        "A": "Basílica de San Juan de Letrán",
                        "B": "Basílica de San Pedro",
                        "C": "Basílica de San Pablo Extramuros",
                        "D": "Basílica de Santa María la Mayor"
                    },
                    "correct_answer": "B",
                    "explanation": "La Basílica de San Pedro en el Vaticano es la iglesia más grande del mundo."
                },
                {
                    "question_text": "¿Cuántas apariciones marianas hubo en Lourdes?",
                    "question_type": QuestionType.MULTIPLE_CHOICE,
                    "points": 10,
                    "options": {
                        "A": "6",
                        "B": "12",
                        "C": "18",
                        "D": "24"
                    },
                    "correct_answer": "C",
                    "explanation": "La Virgen se apareció 18 veces a Bernadette Soubirous en Lourdes entre febrero y julio de 1858."
                },
                {
                    "question_text": "¿Qué evento milagroso ocurrió el 13 de octubre de 1917 en Fátima?",
                    "question_type": QuestionType.MULTIPLE_CHOICE,
                    "points": 10,
                    "options": {
                        "A": "Una curación masiva",
                        "B": "El Milagro del Sol",
                        "C": "Aparición de San Miguel",
                        "D": "Lluvia de flores"
                    },
                    "correct_answer": "B",
                    "explanation": "El Milagro del Sol fue presenciado por 70,000 personas en Fátima el 13 de octubre de 1917."
                },
                {
                    "question_text": "San Juan de Letrán es más importante que la Basílica de San Pedro.",
                    "question_type": QuestionType.TRUE_FALSE,
                    "points": 10,
                    "options": {"true": "Verdadero", "false": "Falso"},
                    "correct_answer": "true",
                    "explanation": "San Juan de Letrán es la catedral de Roma y 'Madre de todas las iglesias', siendo la sede oficial del Papa como Obispo de Roma."
                },
                {
                    "question_text": "¿Qué dijo la Virgen sobre su identidad en Lourdes?",
                    "question_type": QuestionType.MULTIPLE_CHOICE,
                    "points": 10,
                    "options": {
                        "A": "Yo soy Nuestra Señora del Rosario",
                        "B": "Yo soy la Inmaculada Concepción",
                        "C": "Yo soy la Madre de Dios",
                        "D": "Yo soy la Reina del Cielo"
                    },
                    "correct_answer": "B",
                    "explanation": "En Lourdes, la Virgen se identificó como 'Yo soy la Inmaculada Concepción' a Bernadette."
                },
                {
                    "question_text": "¿Cuántos videntes presenciaron las apariciones en Fátima?",
                    "question_type": QuestionType.MULTIPLE_CHOICE,
                    "points": 10,
                    "options": {
                        "A": "1 (solo Lucía)",
                        "B": "2 (Lucía y Francisco)",
                        "C": "3 (Lucía, Francisco y Jacinta)",
                        "D": "4 (incluyendo un pastor)"
                    },
                    "correct_answer": "C",
                    "explanation": "Los tres videntes fueron Lucía dos Santos, Francisco Marto y Jacinta Marto."
                },
                {
                    "question_text": "¿Dónde se encuentra el lugar del bautismo de Jesús?",
                    "question_type": QuestionType.MULTIPLE_CHOICE,
                    "points": 10,
                    "options": {
                        "A": "Mar Muerto",
                        "B": "Río Jordán",
                        "C": "Mar de Galilea",
                        "D": "Lago Tiberíades"
                    },
                    "correct_answer": "B",
                    "explanation": "Jesús fue bautizado por Juan el Bautista en el Río Jordán."
                },
                {
                    "question_text": "Aproximadamente 6 millones de personas visitan Lourdes anualmente.",
                    "question_type": QuestionType.TRUE_FALSE,
                    "points": 10,
                    "options": {"true": "Verdadero", "false": "Falso"},
                    "correct_answer": "true",
                    "explanation": "Lourdes recibe aproximadamente 6 millones de visitantes cada año, convirtiéndolo en uno de los santuarios más visitados del mundo."
                },
                {
                    "question_text": "¿Qué ciudad es conocida como 'Cuna del Cristianismo'?",
                    "question_type": QuestionType.MULTIPLE_CHOICE,
                    "points": 10,
                    "options": {
                        "A": "Roma",
                        "B": "Constantinopla",
                        "C": "Tierra Santa",
                        "D": "Antioquía"
                    },
                    "correct_answer": "C",
                    "explanation": "Tierra Santa (Israel/Palestina) es conocida como la Cuna del Cristianismo por ser donde nació, vivió, murió y resucitó Jesucristo."
                }
            ]
        }
    },
]

# ============================================================================
# FUNCIONES DE SEEDING
# ============================================================================

def create_module_with_content(session, module_data: Dict[str, Any]) -> TrainingModule:
    """Crea un módulo completo con lecciones y quiz"""
    
    print(f"\n📚 Creando módulo: {module_data['title']}")
    
    # Crear módulo
    module = TrainingModule(
        title=module_data['title'],
        description=module_data['description'],
        category=module_data['category'],
        estimated_hours=module_data['estimated_hours'],
        position=module_data['position'],
        passing_score=module_data.get('passing_score', 85),
        icon=module_data.get('icon'),
        color=module_data.get('color'),
        tags=module_data.get('tags', []),
        prerequisites=module_data.get('prerequisites', []),
        is_active=True
    )
    
    session.add(module)
    session.flush()  # Get module ID
    
    print(f"  ✅ Módulo creado: {module.id}")
    
    # Crear lecciones
    for lesson_data in module_data.get('lessons', []):
        print(f"    📖 Creando lección: {lesson_data['title']}")
        
        lesson = TrainingLesson(
            module_id=module.id,
            title=lesson_data['title'],
            description=lesson_data['description'],
            content=lesson_data.get('content', ''),
            content_type=lesson_data['content_type'],
            content_url=lesson_data.get('content_url'),
            duration_minutes=lesson_data.get('duration_minutes', 0),
            position=lesson_data.get('position', 0),
            is_mandatory=lesson_data.get('is_mandatory', False),
            resources=lesson_data.get('resources', {}),
        )
        
        session.add(lesson)
    
    # Crear quiz
    if 'quiz' in module_data:
        quiz_data = module_data['quiz']
        print(f"    📝 Creando quiz: {quiz_data['title']}")
        
        quiz = TrainingQuiz(
            module_id=module.id,
            title=quiz_data['title'],
            description=quiz_data['description'],
            passing_score=quiz_data.get('passing_score', 85),
            time_limit_minutes=quiz_data.get('time_limit_minutes', 30),
            is_active=True
        )
        
        session.add(quiz)
        session.flush()  # Get quiz ID
        
        # Crear preguntas
        for question_data in quiz_data.get('questions', []):
            question = TrainingQuestion(
                quiz_id=quiz.id,
                question_text=question_data['question_text'],
                question_type=question_data['question_type'],
                options=question_data.get('options', {}),
                correct_answer=question_data['correct_answer'],
                points=question_data.get('points', 10),
                explanation=question_data.get('explanation', ''),
                position=quiz_data['questions'].index(question_data) + 1
            )
            
            session.add(question)
        
        print(f"      ✅ Quiz con {len(quiz_data['questions'])} preguntas")
    
    return module

def seed_initial_content():
    """Función principal de seeding"""
    
    print("=" * 80)
    print("🌱 INICIANDO SEEDING DE CONTENIDO DE CAPACITACIÓN")
    print("=" * 80)
    
    session = SessionLocal()
    
    try:
        # Verificar si ya existe contenido
        existing_modules = session.query(TrainingModule).count()
        
        if existing_modules > 0:
            print(f"\n⚠️  Ya existen {existing_modules} módulos en la base de datos.")
            response = input("¿Desea continuar y agregar más módulos? (s/n): ")
            
            if response.lower() != 's':
                print("❌ Seeding cancelado")
                return
        
        # Crear módulos
        modules_created = 0
        
        for module_data in MODULES_DATA:
            module = create_module_with_content(session, module_data)
            modules_created += 1
        
        # Commit
        session.commit()
        
        print("\n" + "=" * 80)
        print(f"✅ SEEDING COMPLETADO EXITOSAMENTE")
        print("=" * 80)
        print(f"📊 Módulos creados: {modules_created}")
        print(f"📊 Total de módulos en DB: {session.query(TrainingModule).count()}")
        print(f"📊 Total de lecciones en DB: {session.query(TrainingLesson).count()}")
        print(f"📊 Total de quizzes en DB: {session.query(TrainingQuiz).count()}")
        print(f"📊 Total de preguntas en DB: {session.query(TrainingQuestion).count()}")
        print("=" * 80)
        
    except Exception as e:
        session.rollback()
        print(f"\n❌ ERROR durante el seeding: {str(e)}")
        raise
    
    finally:
        session.close()

if __name__ == "__main__":
    print("\n🚀 Script de Seeding - Contenido Inicial de Capacitación")
    print("Spirit Tours - Sistema de Capacitación\n")
    
    seed_initial_content()
    
    print("\n✨ Proceso completado. Los módulos están listos para usar.\n")
