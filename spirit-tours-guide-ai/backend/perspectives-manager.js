/**
 * Perspectives Manager
 * Sistema de gestión de perspectivas religiosas/culturales
 * para puntos de interés turísticos
 */

const { MultiAIOrchestrator, OPTIMIZATION_STRATEGIES } = require('./multi-ai-orchestrator');

// Definición de perspectivas disponibles
const PERSPECTIVES = {
  ISLAMIC: {
    id: 'islamic',
    name: 'Perspectiva Islámica',
    icon: '🕌',
    color: '#00A86B',
    description: 'Explicación desde el punto de vista del Islam',
    systemPrompt: 'Eres un erudito islámico experto. Explica este lugar desde la perspectiva islámica, con respeto y precisión histórica. Menciona referencias del Corán o Hadith cuando sea relevante.'
  },
  JEWISH: {
    id: 'jewish',
    name: 'Perspectiva Judía',
    icon: '✡️',
    color: '#0038B8',
    description: 'Explicación desde el punto de vista del Judaísmo',
    systemPrompt: 'Eres un rabino erudito. Explica este lugar desde la perspectiva judía, con respeto y precisión histórica. Menciona referencias de la Torá, Talmud o textos sagrados cuando sea relevante.'
  },
  CHRISTIAN: {
    id: 'christian',
    name: 'Perspectiva Cristiana',
    icon: '✝️',
    color: '#FFA500',
    description: 'Explicación desde el punto de vista del Cristianismo',
    systemPrompt: 'Eres un teólogo cristiano experto. Explica este lugar desde la perspectiva cristiana, con respeto y precisión histórica. Menciona referencias de la Biblia cuando sea relevante.'
  },
  HISTORICAL: {
    id: 'historical',
    name: 'Perspectiva Histórica',
    icon: '🏛️',
    color: '#8B4513',
    description: 'Explicación histórica académica y objetiva',
    systemPrompt: 'Eres un historiador académico. Explica este lugar desde una perspectiva histórica objetiva, basada en evidencia arqueológica y documentación histórica, sin sesgos religiosos.'
  },
  CULTURAL: {
    id: 'cultural',
    name: 'Perspectiva Cultural',
    icon: '🌐',
    color: '#4B0082',
    description: 'Explicación cultural y antropológica',
    systemPrompt: 'Eres un antropólogo cultural. Explica este lugar desde una perspectiva cultural, destacando tradiciones, costumbres y el impacto social en las comunidades locales.'
  },
  ARCHAEOLOGICAL: {
    id: 'archaeological',
    name: 'Perspectiva Arqueológica',
    icon: '⚱️',
    color: '#D2691E',
    description: 'Explicación basada en hallazgos arqueológicos',
    systemPrompt: 'Eres un arqueólogo experto. Explica este lugar desde una perspectiva arqueológica, mencionando descubrimientos, métodos de datación y significado de los hallazgos.'
  }
};

// Base de datos de lugares de interés con múltiples perspectivas
const POINTS_OF_INTEREST = {
  'western-wall': {
    id: 'western-wall',
    names: {
      es: 'Muro de los Lamentos / Al-Buraq',
      en: 'Western Wall / Al-Buraq',
      he: 'הכותל המערבי',
      ar: 'حائط البراق'
    },
    location: {
      lat: 31.7767,
      lng: 35.2345,
      city: 'Jerusalem',
      country: 'Israel'
    },
    category: 'religious-site',
    significance: ['judaism', 'islam'],
    perspectives: {
      jewish: {
        shortDescription: 'El lugar más sagrado del judaísmo, último remanente del Segundo Templo.',
        fullExplanation: `El Muro de los Lamentos (HaKotel HaMa'aravi) es el sitio más sagrado del judaísmo. Es lo que queda del muro de contención del Monte del Templo, donde estuvieron el Primer y Segundo Templo de Jerusalén.

**Significado Religioso:**
- Representa la presencia divina continua (Shejiná)
- Lugar de oración y peregrinación durante siglos
- Símbolo de la conexión eterna entre el pueblo judío y Jerusalén

**Historia:**
- Construido por Herodes el Grande alrededor del año 19 a.C.
- Sobrevivió a la destrucción del Segundo Templo en el año 70 d.C.
- Ha sido lugar de oración judía durante casi 2000 años

**Prácticas:**
- Inserción de notas de oración (kvitlach) en las grietas
- Separación por género en la oración
- Celebración de Bar/Bat Mitzvah y otras ceremonias`,
        
        aiPrompt: 'Genera una explicación detallada del Muro de los Lamentos desde la perspectiva judía.',
        references: ['Torá', 'Talmud', 'Midrash'],
        keywords: ['Templo', 'Shejiná', 'Peregrinación', 'Oración']
      },

      islamic: {
        shortDescription: 'Sitio donde el Profeta Muhammad (PBUH) ató a Al-Buraq durante el viaje nocturno.',
        fullExplanation: `Conocido en la tradición islámica como Hait Al-Buraq (حائط البراق), este muro tiene significado por su conexión con el Viaje Nocturno (Isra y Mi'raj) del Profeta Muhammad (PBUH).

**Significado en el Islam:**
- Lugar donde el Profeta Muhammad (PBUH) ató al Buraq antes de ascender al cielo
- Parte del complejo de Al-Aqsa, el tercer lugar más sagrado del Islam
- Conexión con el Viaje Nocturno mencionado en el Corán

**Historia Islámica:**
- Mencionado en relatos del Hadith
- Parte del Haram al-Sharif desde el siglo VII
- Significativo para los musulmanes durante 1400 años

**Contexto Coránico:**
- Relacionado con Surat Al-Isra (17:1)
- Conexión con la Mezquita Al-Aqsa
- Importancia en la tradición profética`,
        
        aiPrompt: 'Genera una explicación detallada del Hait Al-Buraq desde la perspectiva islámica.',
        references: ['Corán 17:1', 'Hadith Sahih', 'Sirah'],
        keywords: ['Al-Buraq', 'Isra', "Mi'raj", 'Al-Aqsa']
      },

      historical: {
        shortDescription: 'Muro de contención del Monte del Templo, construido por Herodes el Grande.',
        fullExplanation: `El Muro Occidental es una estructura antigua que data del período herodiano, construida como parte del complejo del Segundo Templo de Jerusalén.

**Construcción:**
- Erigido alrededor del 19 a.C. por Herodes el Grande
- Parte del muro de contención del Monte del Templo
- Construido con enormes bloques de piedra caliza de Jerusalén
- Técnica de construcción sin mortero

**Cronología Histórica:**
- 19 a.C.: Inicio de la construcción
- 70 d.C.: Destrucción del Segundo Templo por los romanos
- 1967: Acceso judío restaurado tras la Guerra de los Seis Días
- 2000+: Excavaciones arqueológicas continuas

**Evidencia Arqueológica:**
- Piedras que pesan hasta 628 toneladas
- Altura original de aproximadamente 15 metros
- Extensión total de 488 metros
- Túneles subterráneos descubiertos`,
        
        aiPrompt: 'Genera una explicación histórica objetiva del Muro Occidental.',
        references: ['Josefo', 'Arqueología', 'Documentos romanos'],
        keywords: ['Herodes', 'Templo', 'Construcción', 'Arqueología']
      },

      cultural: {
        shortDescription: 'Sitio de profundo significado cultural para múltiples comunidades.',
        fullExplanation: `El Muro Occidental/Al-Buraq es un espacio de intersección cultural única donde convergen diferentes tradiciones y comunidades.

**Impacto Cultural:**
- Punto de encuentro de culturas milenarias
- Símbolo de identidad para múltiples comunidades
- Espacio de rituales y celebraciones diversas
- Centro de peregrinación internacional

**Prácticas Culturales:**
- Ceremonias de transición de vida (Bar/Bat Mitzvah)
- Oraciones comunitarias e individuales
- Inserción de notas con deseos y oraciones
- Celebraciones de festividades religiosas

**Significado Social:**
- Lugar de memoria colectiva
- Espacio de consuelo y reflexión
- Centro turístico de importancia global
- Símbolo de herencia cultural compartida`,
        
        aiPrompt: 'Genera una explicación cultural del Muro Occidental/Al-Buraq.',
        references: ['Antropología', 'Estudios culturales', 'Sociología religiosa'],
        keywords: ['Identidad', 'Comunidad', 'Ritual', 'Memoria']
      }
    },
    
    media: {
      images: ['/media/western-wall-1.jpg', '/media/western-wall-2.jpg'],
      audio: ['/media/western-wall-audio.mp3'],
      video: ['/media/western-wall-video.mp4']
    },

    accessibility: {
      wheelchair: true,
      dressCode: 'modest',
      security: 'high',
      openingHours: '24/7 (with restrictions on Shabbat)'
    }
  },

  'dome-of-the-rock': {
    id: 'dome-of-the-rock',
    names: {
      es: 'Cúpula de la Roca',
      en: 'Dome of the Rock',
      ar: 'قبة الصخرة',
      he: 'כיפת הסלע'
    },
    location: {
      lat: 31.7780,
      lng: 35.2354,
      city: 'Jerusalem',
      country: 'Israel'
    },
    category: 'religious-site',
    significance: ['islam', 'judaism'],
    perspectives: {
      islamic: {
        shortDescription: 'Uno de los monumentos islámicos más antiguos, marca el lugar del Mi\'raj.',
        fullExplanation: `La Cúpula de la Roca (Qubbat al-Sakhrah) es una obra maestra arquitectónica islámica y uno de los edificios más sagrados del Islam.

**Significado Religioso:**
- Marca el lugar desde donde el Profeta Muhammad (PBUH) ascendió al cielo (Mi'raj)
- La roca sagrada (al-Sakhrah) bajo la cúpula
- Parte del complejo de Haram al-Sharif
- Relacionada con el Isra y Mi'raj del Profeta

**Historia y Construcción:**
- Construida en 691 d.C. por el califa omeya Abd al-Malik
- Arquitectura bizantina con decoración islámica
- Cúpula dorada icónica
- Inscripciones coránicas más antiguas

**Arquitectura:**
- Diseño octogonal único
- Mosaicos y caligrafía árabe exquisita
- Influencia de arquitectura bizantina y persa
- Cúpula de 20 metros de diámetro`,
        
        aiPrompt: 'Genera una explicación detallada de la Cúpula de la Roca desde la perspectiva islámica.',
        references: ['Corán', 'Historia islámica', 'Arquitectura islámica'],
        keywords: ['Mi\'raj', 'Omeyas', 'Arquitectura', 'Sagrado']
      },

      jewish: {
        shortDescription: 'Construida sobre la roca del Monte Moriah, sitio del sacrificio de Isaac.',
        fullExplanation: `Para la tradición judía, la roca bajo la Cúpula es Even Hashetiyah, la "piedra angular" de la creación.

**Significado en el Judaísmo:**
- Monte Moriah: sitio del sacrificio de Isaac (Akedat Yitzhak)
- Lugar del Santo de los Santos (Kodesh Kodashim) del Templo
- Even Hashetiyah: punto de origen de la creación del mundo
- Sitio de oración de los patriarcas

**Historia Judía:**
- Abraham e Isaac en el Monte Moriah
- Rey David adquirió el sitio
- Rey Salomón construyó el Primer Templo aquí
- Centro del Segundo Templo hasta el 70 d.C.

**Significado Espiritual:**
- Conexión entre el cielo y la tierra
- Portal de oración al cielo
- Presencia divina (Shejiná) residía aquí
- Esperanza de reconstrucción del Tercer Templo`,
        
        aiPrompt: 'Genera una explicación de la Cúpula de la Roca desde la perspectiva judía.',
        references: ['Torá Génesis 22', 'Talmud', 'Midrash'],
        keywords: ['Monte Moriah', 'Templo', 'Even Hashetiyah', 'Sacrificio de Isaac']
      },

      historical: {
        shortDescription: 'Monumento arquitectónico del período omeya, uno de los más antiguos del Islam.',
        fullExplanation: `La Cúpula de la Roca es uno de los edificios islámicos más antiguos que se conservan y una obra maestra de la arquitectura medieval.

**Construcción Histórica:**
- Construida entre 688-691 d.C.
- Comisionada por el califa Abd al-Malik ibn Marwan
- Arquitectos: Raja ibn Haywah y Yazid ibn Salam
- Costo: 7 años de ingresos fiscales de Egipto

**Arquitectura e Innovación:**
- Plano octogonal con doble ambulatorio
- Cúpula de madera recubierta de oro
- 240 metros de inscripciones coránicas
- Mosaicos bizantinos originales

**Evolución Histórica:**
- Restauraciones durante los períodos abasí, fatimí y otomano
- La cúpula actual fue restaurada en 1993 con oro real
- Cambios arquitectónicos documentados a través de los siglos
- Influencia en arquitectura islámica posterior`,
        
        aiPrompt: 'Genera una explicación histórica arquitectónica de la Cúpula de la Roca.',
        references: ['Fuentes históricas', 'Estudios arquitectónicos', 'Arqueología'],
        keywords: ['Omeyas', 'Arquitectura', '691 d.C.', 'Abd al-Malik']
      }
    },

    media: {
      images: ['/media/dome-rock-1.jpg', '/media/dome-rock-2.jpg'],
      audio: ['/media/dome-rock-audio.mp3'],
      video: ['/media/dome-rock-video.mp4']
    },

    accessibility: {
      wheelchair: false,
      dressCode: 'modest',
      security: 'very-high',
      restrictions: 'Non-Muslims cannot enter interior'
    }
  }

  // Aquí se pueden añadir más puntos de interés...
};

class PerspectivesManager {
  constructor(aiOrchestrator = null) {
    this.aiOrchestrator = aiOrchestrator || new MultiAIOrchestrator({
      defaultStrategy: OPTIMIZATION_STRATEGIES.SPECIALIZED
    });

    this.cache = new Map();
    this.cacheExpiry = 24 * 60 * 60 * 1000; // 24 horas
  }

  /**
   * Obtiene todas las perspectivas disponibles
   */
  getAvailablePerspectives() {
    return Object.values(PERSPECTIVES);
  }

  /**
   * Obtiene información de un punto de interés específico
   */
  getPointOfInterest(poiId) {
    return POINTS_OF_INTEREST[poiId] || null;
  }

  /**
   * Obtiene todos los puntos de interés
   */
  getAllPointsOfInterest() {
    return Object.values(POINTS_OF_INTEREST);
  }

  /**
   * Busca puntos de interés por ubicación
   */
  findNearbyPoints(lat, lng, radiusKm = 5) {
    const points = this.getAllPointsOfInterest();
    
    return points.filter(poi => {
      const distance = this._calculateDistance(
        lat, lng,
        poi.location.lat, poi.location.lng
      );
      return distance <= radiusKm;
    }).sort((a, b) => {
      const distA = this._calculateDistance(lat, lng, a.location.lat, a.location.lng);
      const distB = this._calculateDistance(lat, lng, b.location.lat, b.location.lng);
      return distA - distB;
    });
  }

  /**
   * Obtiene explicación de un punto de interés según perspectiva
   */
  async getExplanation(poiId, perspectiveId, options = {}) {
    const {
      language = 'es',
      length = 'medium', // short, medium, long
      includeReferences = true,
      useAI = false
    } = options;

    const poi = this.getPointOfInterest(poiId);
    if (!poi) {
      throw new Error(`Point of interest ${poiId} not found`);
    }

    const perspective = PERSPECTIVES[perspectiveId.toUpperCase()];
    if (!perspective) {
      throw new Error(`Perspective ${perspectiveId} not found`);
    }

    const perspectiveData = poi.perspectives[perspectiveId];
    if (!perspectiveData) {
      throw new Error(`Perspective ${perspectiveId} not available for ${poiId}`);
    }

    // Si no usa IA, retorna la explicación predefinida
    if (!useAI) {
      return {
        poi: {
          id: poi.id,
          name: poi.names[language] || poi.names.es,
          location: poi.location
        },
        perspective: {
          id: perspective.id,
          name: perspective.name,
          icon: perspective.icon,
          color: perspective.color
        },
        explanation: {
          short: perspectiveData.shortDescription,
          full: perspectiveData.fullExplanation,
          references: includeReferences ? perspectiveData.references : []
        },
        media: poi.media,
        source: 'database'
      };
    }

    // Usar IA para generar explicación dinámica
    const cacheKey = `${poiId}-${perspectiveId}-${language}-${length}`;
    
    // Verificar cache
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheExpiry) {
        return { ...cached.data, source: 'cache' };
      }
    }

    // Generar con IA
    const prompt = this._buildPrompt(poi, perspective, perspectiveData, language, length);
    
    const aiResponse = await this.aiOrchestrator.generate(prompt, {
      strategy: OPTIMIZATION_STRATEGIES.SPECIALIZED,
      useCase: 'religious-perspective',
      language,
      maxTokens: length === 'long' ? 2000 : length === 'medium' ? 1000 : 500,
      temperature: 0.7,
      systemPrompt: perspective.systemPrompt
    });

    const result = {
      poi: {
        id: poi.id,
        name: poi.names[language] || poi.names.es,
        location: poi.location
      },
      perspective: {
        id: perspective.id,
        name: perspective.name,
        icon: perspective.icon,
        color: perspective.color
      },
      explanation: {
        content: aiResponse.content,
        references: includeReferences ? perspectiveData.references : []
      },
      media: poi.media,
      aiMetadata: {
        model: aiResponse.model,
        tokens: aiResponse.tokens,
        cost: aiResponse.cost,
        responseTime: aiResponse.responseTime
      },
      source: 'ai'
    };

    // Guardar en cache
    this.cache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });

    return result;
  }

  /**
   * Obtiene múltiples perspectivas simultáneamente
   */
  async getMultiplePerspectives(poiId, perspectiveIds, options = {}) {
    const promises = perspectiveIds.map(perspectiveId =>
      this.getExplanation(poiId, perspectiveId, options)
        .catch(error => ({ error: error.message, perspectiveId }))
    );

    const results = await Promise.all(promises);
    
    return {
      poi: results.find(r => !r.error)?.poi,
      perspectives: results
    };
  }

  /**
   * Construye el prompt para la IA
   */
  _buildPrompt(poi, perspective, perspectiveData, language, length) {
    const lengthInstructions = {
      short: 'Genera una explicación breve (150-200 palabras)',
      medium: 'Genera una explicación detallada (400-500 palabras)',
      long: 'Genera una explicación completa y profunda (800-1000 palabras)'
    };

    return `Explica el lugar "${poi.names.es}" desde la perspectiva ${perspective.name}.

Contexto base:
${perspectiveData.shortDescription}

Instrucciones:
- ${lengthInstructions[length]}
- Idioma: ${language}
- Incluye detalles históricos y religiosos relevantes
- Menciona referencias específicas cuando sea apropiado
- Usa un tono respetuoso y educativo
- Enfócate en los aspectos ${perspective.id}s del lugar

Keywords a incluir: ${perspectiveData.keywords.join(', ')}

Genera la explicación:`;
  }

  /**
   * Calcula distancia entre dos puntos (fórmula de Haversine)
   */
  _calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radio de la Tierra en km
    const dLat = this._toRad(lat2 - lat1);
    const dLon = this._toRad(lon2 - lon1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this._toRad(lat1)) * Math.cos(this._toRad(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  _toRad(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * Limpia el cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Obtiene estadísticas de uso
   */
  getStats() {
    return {
      cachedExplanations: this.cache.size,
      availablePerspectives: Object.keys(PERSPECTIVES).length,
      pointsOfInterest: Object.keys(POINTS_OF_INTEREST).length,
      aiStats: this.aiOrchestrator.getStats()
    };
  }
}

module.exports = {
  PerspectivesManager,
  PERSPECTIVES,
  POINTS_OF_INTEREST
};
