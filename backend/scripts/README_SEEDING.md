# Training Content Seeding - Módulos de Capacitación

## 📚 Contenido Inicial de Capacitación

Este directorio contiene scripts para poblar la base de datos con contenido inicial
de capacitación sobre turismo religioso para Spirit Tours.

## 🗂️ Módulos Incluidos

### Módulo 1: Introducción a Spirit Tours y Turismo Religioso ✅
- **Categoría:** OBLIGATORY
- **Duración:** 3.0 horas
- **Lecciones:** 3
- **Quiz:** 10 preguntas
- **Contenido:**
  - Bienvenida a Spirit Tours (valores, misión)
  - ¿Qué es el Turismo Religioso?
  - Perfil de Nuestros Clientes

### Módulo 2: Destinos Religiosos Principales ✅
- **Categoría:** OBLIGATORY  
- **Duración:** 4.5 horas
- **Lecciones:** 3
- **Quiz:** 10 preguntas
- **Contenido:**
  - Tierra Santa (Israel, Palestina, Jordania)
  - Roma y El Vaticano
  - Santuarios Marianos (Lourdes, Fátima)

### Módulo 3: Técnicas de Ventas para Turismo Religioso ✅
- **Categoría:** IMPORTANT
- **Duración:** 3.5 horas  
- **Lecciones:** 3
- **Quiz:** 10 preguntas
- **Contenido:**
  - Lenguaje y Comunicación Apropiada
  - Manejo de Objeciones Comunes
  - Técnicas de Cierre Consultivas

### Módulo 4: Logística y Operaciones (PENDIENTE - Ver instrucciones abajo)
- **Categoría:** IMPORTANT
- **Duración:** 3.0 horas
- **Temas sugeridos:**
  - Documentación requerida (pasaportes, visas)
  - Seguros de viaje
  - Coordinación de grupos
  - Manejo de emergencias

### Módulo 5: Cultura y Costumbres Religiosas (PENDIENTE - Ver instrucciones abajo)
- **Categoría:** BASIC
- **Duración:** 2.5 horas
- **Temas sugeridos:**
  - Vestimenta apropiada en sitios religiosos
  - Protocolo en diferentes denominaciones
  - Calendario litúrgico y festividades
  - Sensibilidad cultural

## 🚀 Uso del Script

### Ejecutar Seeding Completo

```bash
cd /home/user/webapp
python -m backend.scripts.seed_training_content
```

### Variables de Entorno Requeridas

```bash
export DATABASE_URL="postgresql://user:password@localhost:5432/spirittours"
```

### Comportamiento del Script

1. **Verifica módulos existentes** - Pregunta si desea continuar si ya hay datos
2. **Crea módulos** con toda su metadata
3. **Crea lecciones** con contenido HTML rico
4. **Crea quizzes** con preguntas y respuestas
5. **Commit** a la base de datos
6. **Reporta estadísticas** finales

## 📊 Estadísticas del Contenido

- **Total Módulos:** 3 (completados) + 2 (pendientes)
- **Total Lecciones:** 9 (completadas)
- **Total Quizzes:** 3 (completados)
- **Total Preguntas:** 30 (completadas)
- **Horas de Contenido:** 11 horas (completadas)

## 🔧 Personalización

Para agregar más contenido:

1. Editar `seed_training_content.py`
2. Agregar módulos al array `MODULES_DATA`
3. Seguir la estructura existente
4. Ejecutar script

## 📝 Estructura de un Módulo

```python
{
    "title": "Título del Módulo",
    "description": "Descripción completa...",
    "category": ModuleCategory.OBLIGATORY,  # o IMPORTANT, BASIC
    "estimated_hours": 3.5,
    "position": 1,
    "passing_score": 85,
    "icon": "🎓",
    "color": "#4A90E2",
    "tags": ["etiqueta1", "etiqueta2"],
    "lessons": [
        {
            "title": "Título de Lección",
            "description": "Descripción...",
            "content_type": ContentType.ARTICLE,
            "content_url": None,  # o URL si es VIDEO/DOCUMENT
            "duration_minutes": 30,
            "position": 1,
            "is_mandatory": True,
            "content": "<h2>Contenido HTML...</h2>",
        }
    ],
    "quiz": {
        "title": "Evaluación del Módulo",
        "description": "Descripción del quiz...",
        "passing_score": 85,
        "time_limit_minutes": 20,
        "questions": [
            {
                "question_text": "Pregunta...",
                "question_type": QuestionType.MULTIPLE_CHOICE,
                "points": 10,
                "options": {"A": "...", "B": "..."},
                "correct_answer": "A",
                "explanation": "Explicación..."
            }
        ]
    }
}
```

## ⚠️ IMPORTANTE: Completar Módulos 4 y 5

Los módulos 4 y 5 están pendientes de contenido. Para completarlos:

### Opción 1: Crear contenido manualmente
1. Editar `seed_training_content.py`
2. Agregar los módulos 4 y 5 siguiendo la estructura anterior
3. Ejecutar el script

### Opción 2: Usar AI para generar contenido
Solicitar a Claude Code que genere el contenido de los módulos 4 y 5
con el mismo nivel de detalle que los módulos 1-3.

### Opción 3: Usar contenido placeholder
Si necesita lanzar rápidamente, puede usar contenido temporal
y actualizarlo después con información real.

## 🎯 Próximos Pasos

1. ✅ Módulos 1-3 completados
2. ⏳ Completar Módulos 4-5
3. ⏳ Crear documentación de ambiente de testing
4. ⏳ Desplegar a staging
5. ⏳ Pruebas de aceptación usuario

## 📞 Soporte

Para dudas sobre el contenido de capacitación:
- Revisar la documentación en `CONFIGURATION_SYSTEM_COMPLETE.md`
- Consultar el PR #6 en GitHub

---
**Última actualización:** October 18, 2025
**Estado:** Módulos 1-3 completos, 4-5 pendientes
