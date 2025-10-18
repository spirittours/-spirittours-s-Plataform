"""
Script de Seeding - Parte 2
Módulos 3-5: Contenido Adicional sobre Turismo Religioso

Continuación del contenido de capacitación inicial
"""

# MÓDULOS 3, 4 y 5 para agregar a MODULES_DATA

MODULES_DATA_PART2 = [
    # MÓDULO 3
    {
        "title": "Técnicas de Ventas para Turismo Religioso",
        "description": """
        Aprende técnicas específicas para vender paquetes de turismo religioso. Este módulo
        te enseñará cómo comunicarte efectivamente con diferentes tipos de clientes religiosos.
        
        Contenido:
        - Lenguaje apropiado según denominación
        - Manejo de objeciones comunes
        - Técnicas de cierre consultivas
        - Construcción de confianza con clientes religiosos
        - Personalización de paquetes
        """,
        "category": "IMPORTANT",
        "estimated_hours": 3.5,
        "position": 3,
        "passing_score": 85,
        "icon": "💼",
        "color": "#27AE60",
        "tags": ["ventas", "comunicación", "clientes", "técnicas"],
        "lessons": [
            {
                "title": "Lenguaje y Comunicación Apropiada",
                "description": "Cómo comunicarse respetuosamente con clientes de diferentes denominaciones",
                "content_type": "ARTICLE",
                "content_url": None,
                "duration_minutes": 30,
                "position": 1,
                "is_mandatory": True,
                "content": """
                <h2>Lenguaje y Comunicación Apropiada en Turismo Religioso</h2>
                
                <h3>Importancia de la Terminología Correcta</h3>
                <p>El uso del lenguaje apropiado es fundamental en el turismo religioso. 
                Una palabra incorrecta puede ofender o hacer que el cliente pierda confianza.</p>
                
                <h3>Terminología por Denominación</h3>
                
                <h4>1. Católicos</h4>
                <table border="1" cellpadding="10" style="width:100%; border-collapse: collapse;">
                    <tr>
                        <th>✅ Correcto</th>
                        <th>❌ Incorrecto</th>
                    </tr>
                    <tr>
                        <td>Sacerdote, Padre</td>
                        <td>Pastor, Reverendo</td>
                    </tr>
                    <tr>
                        <td>Misa, Eucaristía</td>
                        <td>Culto, Servicio</td>
                    </tr>
                    <tr>
                        <td>Virgen María, Madre de Dios</td>
                        <td>María (solo), Señora María</td>
                    </tr>
                    <tr>
                        <td>Papa, Santo Padre</td>
                        <td>Líder católico</td>
                    </tr>
                    <tr>
                        <td>Basílica, Catedral, Santuario</td>
                        <td>Templo, Iglesia (genérico)</td>
                    </tr>
                    <tr>
                        <td>Peregrinación, Romería</td>
                        <td>Tour religioso, Viaje a iglesias</td>
                    </tr>
                </table>
                
                <h4>2. Evangélicos/Protestantes</h4>
                <table border="1" cellpadding="10" style="width:100%; border-collapse: collapse;">
                    <tr>
                        <th>✅ Correcto</th>
                        <th>❌ Incorrecto</th>
                    </tr>
                    <tr>
                        <td>Pastor, Reverendo</td>
                        <td>Padre, Sacerdote</td>
                    </tr>
                    <tr>
                        <td>Culto, Servicio</td>
                        <td>Misa</td>
                    </tr>
                    <tr>
                        <td>Iglesia, Templo</td>
                        <td>Basílica, Catedral</td>
                    </tr>
                    <tr>
                        <td>Hermano/Hermana</td>
                        <td>Feligrés</td>
                    </tr>
                    <tr>
                        <td>Biblia, Escrituras</td>
                        <td>Evangelio (exclusivo)</td>
                    </tr>
                </table>
                
                <h4>3. Ortodoxos</h4>
                <ul>
                    <li><strong>Sacerdote:</strong> Padre, Hieromónaco</li>
                    <li><strong>Servicio:</strong> Divina Liturgia</li>
                    <li><strong>Líder:</strong> Patriarca, Metropolitano</li>
                    <li><strong>Iglesia:</strong> Catedral Ortodoxa</li>
                </ul>
                
                <h3>Frases que Generan Confianza</h3>
                
                <h4>Para Católicos:</h4>
                <ul>
                    <li>"Nuestros guías conocen profundamente la historia de cada basílica y reliquia"</li>
                    <li>"Incluimos tiempo para misa diaria y adoración eucarística"</li>
                    <li>"Visitaremos los lugares donde los santos caminaron"</li>
                    <li>"Tendremos oportunidad de rezar el Rosario en sitios sagrados"</li>
                </ul>
                
                <h4>Para Evangélicos:</h4>
                <ul>
                    <li>"Visitaremos los lugares mencionados en las Escrituras"</li>
                    <li>"Tendremos devocionales diarios y tiempo de alabanza"</li>
                    <li>"Nuestro guía es un estudioso de la Biblia"</li>
                    <li>"Caminaremos donde Jesús caminó según las Escrituras"</li>
                </ul>
                
                <h3>Temas Sensibles</h3>
                
                <div style="background: #FFEBEE; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <h4>🚫 Evitar con Católicos:</h4>
                    <ul>
                        <li>Cuestionar la veneración de santos e imágenes</li>
                        <li>Minimizar importancia de reliquias</li>
                        <li>Referirse a María solo como "madre de Jesús"</li>
                        <li>Usar "religión" en lugar de "fe"</li>
                    </ul>
                </div>
                
                <div style="background: #FFF3E0; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <h4>🚫 Evitar con Evangélicos:</h4>
                    <ul>
                        <li>Enfatizar excesivamente imágenes y estatuas</li>
                        <li>Hablar de "adoración" a santos</li>
                        <li>Presionar para comprar objetos religiosos</li>
                        <li>Minimizar importancia de la Biblia</li>
                    </ul>
                </div>
                
                <h3>Lenguaje Corporal y Tono</h3>
                <ul>
                    <li><strong>Tono de voz:</strong> Respetuoso, cálido, nunca condescendiente</li>
                    <li><strong>Postura:</strong> Atenta, abierta, profesional</li>
                    <li><strong>Gestos:</strong> Moderados, nunca exagerados</li>
                    <li><strong>Contacto visual:</strong> Directo pero no intimidante</li>
                </ul>
                
                <h3>Adaptación en Tiempo Real</h3>
                <p><strong>Escuche cómo el cliente se refiere a su fe:</strong></p>
                <ul>
                    <li>Si dice "misa" → Es católico, use terminología católica</li>
                    <li>Si dice "culto" → Es evangélico, adapte su lenguaje</li>
                    <li>Si menciona "santos" positivamente → Católico u Ortodoxo</li>
                    <li>Si enfatiza "la Palabra" → Probablemente evangélico</li>
                </ul>
                
                <h3>Ejercicio Práctico</h3>
                <div style="background: #E3F2FD; padding: 15px; border-radius: 5px;">
                    <p><strong>Situación:</strong> Un cliente llama preguntando sobre un tour a Tierra Santa.</p>
                    
                    <p><strong>Cliente dice:</strong> "¿Habrá tiempo para ir a misa todos los días?"</p>
                    
                    <p><strong>✅ Respuesta correcta:</strong><br>
                    "Por supuesto, Padre/Señor(a). Incluimos misa diaria en lugares significativos 
                    como la Basílica del Santo Sepulcro y Betania. También tendremos tiempo para 
                    adoración eucarística en la Basílica de la Natividad."</p>
                    
                    <p><strong>❌ Respuesta incorrecta:</strong><br>
                    "Sí, hay servicios religiosos disponibles en los templos que visitamos."</p>
                </div>
                """,
            },
            {
                "title": "Manejo de Objeciones Comunes",
                "description": "Técnicas para responder objeciones típicas en turismo religioso",
                "content_type": "VIDEO",
                "content_url": "https://example.com/videos/manejo-objeciones.mp4",
                "duration_minutes": 25,
                "position": 2,
                "is_mandatory": True,
                "content": """
                <h2>Manejo de Objeciones en Turismo Religioso</h2>
                
                <h3>Objeción #1: "Es muy caro"</h3>
                
                <h4>🔍 Análisis de la objeción:</h4>
                <ul>
                    <li>No siempre es real falta de presupuesto</li>
                    <li>Puede ser: no ven el valor, comparan con tours seculares, buscan descuento</li>
                </ul>
                
                <h4>✅ Respuestas efectivas:</h4>
                
                <p><strong>Técnica 1: Desglose de valor</strong></p>
                <blockquote>
                "Entiendo su preocupación. Permítame mostrarle qué incluye el precio:
                <ul>
                    <li>Guías especializados en historia religiosa (no turistas comunes)</li>
                    <li>Acceso prioritario a sitios sagrados</li>
                    <li>Coordinación de misas/cultos diarios</li>
                    <li>Hoteles cerca de santuarios (no hoteles turísticos lejanos)</li>
                    <li>Seguro de viaje completo</li>
                </ul>
                Esto es una inversión en una experiencia espiritual que recordará toda la vida."
                </blockquote>
                
                <p><strong>Técnica 2: Comparación con gastos similares</strong></p>
                <blockquote>
                "Un viaje de este tipo es comparable al costo de una boda o quinceañera familiar. 
                Así como esos eventos marcan momentos importantes, esta peregrinación puede ser 
                un antes y después en su vida espiritual."
                </blockquote>
                
                <p><strong>Técnica 3: Opciones de pago</strong></p>
                <blockquote>
                "Ofrecemos planes de pago flexibles. Puede reservar con solo el 20% y 
                pagar el resto en 6 cuotas mensuales sin intereses. Muchas parroquias también 
                organizan rifas o eventos para ayudar a sus miembros a financiar el viaje."
                </blockquote>
                
                <hr>
                
                <h3>Objeción #2: "No tengo tiempo suficiente"</h3>
                
                <h4>✅ Respuestas efectivas:</h4>
                
                <p><strong>Técnica 1: Paquetes flexibles</strong></p>
                <blockquote>
                "Entiendo que su tiempo es limitado. Tenemos opciones de 5, 7 y 10 días. 
                El paquete de 7 días le permite visitar los sitios más importantes sin sentirse 
                apurado. ¿Cuántos días podría considerar?"
                </blockquote>
                
                <p><strong>Técnica 2: Eficiencia del itinerario</strong></p>
                <blockquote>
                "Nuestros itinerarios están diseñados para maximizar cada día. Mientras otros 
                tours dedican medio día a hoteles lejanos, nosotros nos hospedamos estratégicamente 
                cerca de los santuarios principales."
                </blockquote>
                
                <hr>
                
                <h3>Objeción #3: "Tengo problemas de salud/movilidad"</h3>
                
                <h4>✅ Respuestas efectivas:</h4>
                
                <p><strong>Técnica 1: Adaptaciones disponibles</strong></p>
                <blockquote>
                "Entiendo su preocupación. Trabajamos con muchos peregrinos con necesidades 
                especiales:
                <ul>
                    <li>Hoteles con ascensor y habitaciones accesibles</li>
                    <li>Transporte privado (no caminar largas distancias)</li>
                    <li>Ritmo pausado con descansos frecuentes</li>
                    <li>Silla de ruedas disponible si es necesario</li>
                    <li>Guías capacitados para asistir</li>
                </ul>
                ¿Qué necesidades específicas tiene? Podemos personalizar el viaje."
                </blockquote>
                
                <p><strong>Técnica 2: Testimonios</strong></p>
                <blockquote>
                "Recientemente llevamos un grupo donde había una señora de 78 años con 
                problemas de rodilla. Con las adaptaciones adecuadas, pudo visitar cada 
                sitio significativo y quedó encantada. Tengo su testimonio si desea leerlo."
                </blockquote>
                
                <hr>
                
                <h3>Objeción #4: "No confío en viajar a esos países"</h3>
                
                <h4>✅ Respuestas efectivas:</h4>
                
                <p><strong>Técnica 1: Datos de seguridad</strong></p>
                <blockquote>
                "Esa es una preocupación válida. Déjeme compartir algunos datos:
                <ul>
                    <li>Llevamos 15 años organizando viajes sin incidentes de seguridad</li>
                    <li>Los sitios religiosos tienen seguridad reforzada</li>
                    <li>Nuestros guías locales conocen las zonas seguras</li>
                    <li>Mantenemos comunicación 24/7 con nuestra oficina</li>
                    <li>Incluimos seguro de viaje completo</li>
                </ul>
                Más de 6 millones de peregrinos visitan Tierra Santa cada año de forma segura."
                </blockquote>
                
                <p><strong>Técnica 2: Experiencia personal</strong></p>
                <blockquote>
                "Yo personalmente he visitado Tierra Santa 8 veces y siempre me he sentido 
                seguro. Las autoridades locales cuidan especialmente a los peregrinos porque 
                el turismo religioso es vital para su economía."
                </blockquote>
                
                <hr>
                
                <h3>Objeción #5: "Prefiero ir con mi familia/solo"</h3>
                
                <h4>✅ Respuestas efectivas:</h4>
                
                <p><strong>Técnica 1: Ventajas del grupo</strong></p>
                <blockquote>
                "Entiendo que prefiera privacidad. Sin embargo, permítame compartir las 
                ventajas de viajar en grupo organizado:
                <ul>
                    <li><strong>Costo:</strong> 40-60% más económico que viaje privado</li>
                    <li><strong>Seguridad:</strong> Mayor protección en grupo</li>
                    <li><strong>Experiencia comunitaria:</strong> Compartir la fe con otros</li>
                    <li><strong>Logística:</strong> Nosotros nos encargamos de todo</li>
                    <li><strong>Guías expertos:</strong> No disponibles para individuales</li>
                </ul>
                Muchos de nuestros peregrinos llegan sin conocerse y se vuelven amigos de por vida."
                </blockquote>
                
                <p><strong>Técnica 2: Tour privado familiar</strong></p>
                <blockquote>
                "Si prefiere viajar solo con su familia, podemos organizar un tour privado 
                para grupos de 10+ personas. Tendría el mismo itinerario pero con total 
                privacidad. ¿Cuántas personas serían?"
                </blockquote>
                
                <hr>
                
                <h3>Objeción #6: "Déjeme pensarlo"</h3>
                
                <h4>🔍 Análisis:</h4>
                <p>Esta NO es una objeción real. Es una forma educada de terminar la conversación.</p>
                
                <h4>✅ Respuestas efectivas:</h4>
                
                <p><strong>Técnica 1: Identificar preocupación real</strong></p>
                <blockquote>
                "Por supuesto, es una decisión importante. ¿Hay algo específico que le 
                preocupa y que pueda aclarar ahora? A veces es el presupuesto, las fechas, 
                o quizás una duda sobre el itinerario. ¿Cuál es su principal inquietud?"
                </blockquote>
                
                <p><strong>Técnica 2: Crear urgencia genuina</strong></p>
                <blockquote>
                "Entiendo completamente. Solo quiero mencionarle que este viaje tiene solo 
                35 lugares disponibles y ya tenemos 28 reservas confirmadas. Para las fechas 
                especiales como Semana Santa, los cupos se llenan 4-6 meses antes. ¿Le gustaría 
                que reserve su lugar con la opción de cancelar si cambia de opinión?"
                </blockquote>
                
                <hr>
                
                <h3>Fórmula General para Manejar Objeciones</h3>
                
                <div style="background: #E8F5E9; padding: 20px; border-radius: 5px;">
                    <ol>
                        <li><strong>Escuchar completamente</strong> - No interrumpir</li>
                        <li><strong>Validar la preocupación</strong> - "Entiendo perfectamente..."</li>
                        <li><strong>Aclarar si es necesario</strong> - "¿Su preocupación es X o Y?"</li>
                        <li><strong>Responder con datos/testimonios</strong> - Hechos, no opiniones</li>
                        <li><strong>Confirmar resolución</strong> - "¿Esto responde su inquietud?"</li>
                        <li><strong>Avanzar</strong> - "Perfecto, entonces el siguiente paso es..."</li>
                    </ol>
                </div>
                
                <h3>Lo que NUNCA debe hacer:</h3>
                <ul>
                    <li>❌ Ponerse a la defensiva</li>
                    <li>❌ Discutir o contradecir agresivamente</li>
                    <li>❌ Presionar con técnicas de venta agresiva</li>
                    <li>❌ Minimizar las preocupaciones del cliente</li>
                    <li>❌ Mentir o exagerar</li>
                    <li>❌ Hablar mal de la competencia</li>
                </ul>
                
                <h3>Ejercicio de Role-Play</h3>
                <p>Practica estas objeciones con tu gerente o un compañero:</p>
                <ol>
                    <li>Cliente preocupado por seguridad en Medio Oriente</li>
                    <li>Sacerdote con presupuesto limitado para grupo parroquial</li>
                    <li>Persona mayor con problemas de movilidad</li>
                    <li>Familia que quiere privacidad pero le interesa el tour</li>
                </ol>
                """,
            },
            {
                "title": "Técnicas de Cierre Consultivas",
                "description": "Cómo cerrar ventas de forma respetuosa y efectiva",
                "content_type": "DOCUMENT",
                "content_url": "https://example.com/docs/tecnicas-cierre.pdf",
                "duration_minutes": 20,
                "position": 3,
                "is_mandatory": True,
                "content": """
                <h2>Técnicas de Cierre en Turismo Religioso</h2>
                
                <p><strong>Principio fundamental:</strong> En turismo religioso, el cierre debe 
                ser consultivo, nunca agresivo. Estamos ayudando a tomar una decisión importante, 
                no empujando una venta.</p>
                
                <h3>Señales de Compra</h3>
                
                <h4>Señales Verbales:</h4>
                <ul>
                    <li>"¿Cuándo serían las salidas?"</li>
                    <li>"¿Qué incluye exactamente?"</li>
                    <li>"¿Cómo son las formas de pago?"</li>
                    <li>"¿Puedo llevar a mi esposa/esposo?"</li>
                    <li>"¿Qué documentos necesito?"</li>
                    <li>"Mi grupo tiene X personas, ¿hay cupo?"</li>
                </ul>
                
                <h4>Señales No Verbales:</h4>
                <ul>
                    <li>Inclinarse hacia adelante</li>
                    <li>Tomar notas</li>
                    <li>Revisar calendario</li>
                    <li>Mostrar el folleto a acompañante</li>
                    <li>Dejar de hacer objeciones</li>
                    <li>Preguntar detalles específicos</li>
                </ul>
                
                <h3>Técnicas de Cierre Efectivas</h3>
                
                <h4>1. Cierre Consultivo (El Más Recomendado)</h4>
                <blockquote>
                <p><strong>Asesor:</strong> "Basado en todo lo que hemos conversado, veo que 
                le interesa especialmente visitar Tierra Santa y que prefiere un grupo pequeño. 
                También mencionó que el presupuesto es una consideración importante. ¿Es correcto?"</p>
                
                <p><strong>Cliente:</strong> "Sí, exacto."</p>
                
                <p><strong>Asesor:</strong> "Perfecto. Entonces le recomendaría nuestro paquete 
                de 8 días a Tierra Santa con salida en mayo. Es un grupo de máximo 25 personas, 
                con plan de pagos en 6 cuotas sin intereses. ¿Le gustaría que reserve su lugar?"</p>
                </blockquote>
                
                <h4>2. Cierre por Alternativa</h4>
                <blockquote>
                <p>"¿Prefiere la salida del 15 de mayo o la del 2 de junio? Ambas tienen cupos 
                disponibles."</p>
                </blockquote>
                
                <h4>3. Cierre por Escasez Genuina</h4>
                <blockquote>
                <p>"Le cuento que para esta fecha en particular solo nos quedan 7 lugares 
                disponibles. La experiencia nos dice que para Semana Santa los cupos se agotan 
                rápido. ¿Le gustaría asegurar su lugar hoy con el depósito?"</p>
                </blockquote>
                
                <h4>4. Cierre por Beneficio</h4>
                <blockquote>
                <p>"Si reserva esta semana, podemos incluirle sin costo adicional la excursión 
                a Petra que normalmente tiene un suplemento de $150. ¿Le gustaría aprovechar 
                esta oferta?"</p>
                </blockquote>
                
                <h4>5. Cierre por Pregunta Directa</h4>
                <blockquote>
                <p>"¿Hay algo que le impida tomar la decisión hoy? Si hay alguna duda pendiente, 
                con gusto la resuelvo."</p>
                </blockquote>
                
                <h4>6. Cierre por Testimonio</h4>
                <blockquote>
                <p>"Déjeme compartirle que el Padre Rodríguez de la Parroquia San José viajó 
                con nosotros el año pasado con un grupo de 35 feligreses. Quedaron tan contentos 
                que ya reservaron para este año con 50 personas. Aquí tengo su testimonio. 
                ¿Le gustaría unirse a la próxima peregrinación?"</p>
                </blockquote>
                
                <h4>7. Cierre con Plan de Acción</h4>
                <blockquote>
                <p>"Perfecto. Entonces los siguientes pasos serían:
                <ol>
                    <li>Hoy: Reservar su lugar con depósito de $500</li>
                    <li>Esta semana: Enviar copia de su pasaporte</li>
                    <li>15 días antes: Reunión pre-viaje para detalles finales</li>
                </ol>
                ¿Le parece bien comenzar con el primer paso?"</p>
                </blockquote>
                
                <h3>Cierres que EVITAR</h3>
                
                <div style="background: #FFEBEE; padding: 15px; border-radius: 5px;">
                    <h4>❌ Cierre Agresivo:</h4>
                    <p>"¿Qué le impide firmar ahora mismo? Ya le di toda la información."</p>
                    <p><em>Problema: Demasiado presionante, no respeta el proceso de decisión.</em></p>
                </div>
                
                <div style="background: #FFF3E0; padding: 15px; border-radius: 5px; margin-top: 10px;">
                    <h4>❌ Cierre Manipulador:</h4>
                    <p>"Este es el último cupo. Si no decide ahora, lo perderá para siempre."</p>
                    <p><em>Problema: Crea falsa urgencia, puede dañar la confianza.</em></p>
                </div>
                
                <div style="background: #FCE4EC; padding: 15px; border-radius: 5px; margin-top: 10px;">
                    <h4>❌ Cierre Culpabilizador:</h4>
                    <p>"¿No quiere vivir esta experiencia espiritual? Es una oportunidad única."</p>
                    <p><em>Problema: Usa la fe como herramienta de presión, inapropiado.</em></p>
                </div>
                
                <h3>Manejo de "Déjeme Pensarlo"</h3>
                
                <p><strong>Respuesta efectiva en 3 pasos:</strong></p>
                
                <p><strong>Paso 1: Validar</strong></p>
                <blockquote>
                "Por supuesto, es una decisión importante que requiere reflexión."
                </blockquote>
                
                <p><strong>Paso 2: Aclarar</strong></p>
                <blockquote>
                "Solo para asegurarme de que tiene toda la información necesaria, ¿hay algún 
                aspecto específico que le gustaría revisar antes de decidir?"
                </blockquote>
                
                <p><strong>Paso 3: Establecer siguiente paso</strong></p>
                <blockquote>
                "Perfecto. ¿Le parece si le envío por email el itinerario detallado y los 
                testimonios de otros peregrinos? ¿Le puedo llamar el jueves para ver si tiene 
                alguna pregunta adicional?"
                </blockquote>
                
                <h3>Seguimiento Post-Cierre</h3>
                
                <h4>Si el cliente NO compró:</h4>
                <ul>
                    <li><strong>Día 1:</strong> Email de agradecimiento con información adicional</li>
                    <li><strong>Día 3:</strong> Llamada de seguimiento (no presionar)</li>
                    <li><strong>Día 7:</strong> Compartir testimonio relevante</li>
                    <li><strong>Día 14:</strong> Informar sobre disponibilidad actualizada</li>
                </ul>
                
                <h4>Si el cliente SÍ compró:</h4>
                <ul>
                    <li><strong>Inmediato:</strong> Email de confirmación con resumen</li>
                    <li><strong>24 horas:</strong> Llamada de bienvenida</li>
                    <li><strong>Semanal:</strong> Actualizaciones sobre el viaje</li>
                    <li><strong>30 días antes:</strong> Reunión pre-viaje</li>
                </ul>
                
                <h3>Métricas de Cierre Exitoso</h3>
                
                <table border="1" cellpadding="10" style="width:100%; border-collapse: collapse;">
                    <tr>
                        <th>Métrica</th>
                        <th>Meta</th>
                    </tr>
                    <tr>
                        <td>Tasa de conversión (primera llamada)</td>
                        <td>15-25%</td>
                    </tr>
                    <tr>
                        <td>Tasa de conversión (con seguimiento)</td>
                        <td>35-45%</td>
                    </tr>
                    <tr>
                        <td>Tiempo promedio de cierre</td>
                        <td>3-7 días</td>
                    </tr>
                    <tr>
                        <td>Satisfacción post-venta</td>
                        <td>90%+</td>
                    </tr>
                </table>
                
                <h3>Recuerda:</h3>
                <div style="background: #E3F2FD; padding: 15px; border-radius: 5px;">
                    <p><strong>Un cierre exitoso en turismo religioso NO es hacer que alguien 
                    compre, es ayudar a que alguien que quiere viajar tome la decisión de hacerlo 
                    contigo.</strong></p>
                    
                    <p>Si el cliente no está listo, forzar el cierre solo creará una mala 
                    experiencia y un posible cancelación futura. La paciencia y el respeto 
                    generan más ventas a largo plazo.</p>
                </div>
                """,
            },
        ],
        "quiz": {
            "title": "Evaluación: Técnicas de Ventas",
            "description": "Evalúa tu dominio de técnicas de venta para turismo religioso",
            "passing_score": 85,
            "time_limit_minutes": 20,
            "questions": [
                {
                    "question_text": "¿Cuál es el término correcto para referirse a un líder religioso católico?",
                    "question_type": "MULTIPLE_CHOICE",
                    "points": 10,
                    "options": {
                        "A": "Pastor",
                        "B": "Reverendo",
                        "C": "Sacerdote o Padre",
                        "D": "Hermano"
                    },
                    "correct_answer": "C",
                    "explanation": "Los líderes religiosos católicos se llaman Sacerdote o Padre. Pastor y Reverendo se usan para evangélicos."
                },
                {
                    "question_text": "¿Qué término usan los evangélicos para referirse a su servicio religioso?",
                    "question_type": "MULTIPLE_CHOICE",
                    "points": 10,
                    "options": {
                        "A": "Misa",
                        "B": "Eucaristía",
                        "C": "Liturgia",
                        "D": "Culto o Servicio"
                    },
                    "correct_answer": "D",
                    "explanation": "Los evangélicos usan 'Culto' o 'Servicio' para sus reuniones religiosas, no 'Misa' que es término católico."
                },
                {
                    "question_text": "Cuando un cliente dice 'Es muy caro', la mejor respuesta es atacar su presupuesto.",
                    "question_type": "TRUE_FALSE",
                    "points": 10,
                    "options": {"true": "Verdadero", "false": "Falso"},
                    "correct_answer": "false",
                    "explanation": "Nunca se debe atacar el presupuesto del cliente. En cambio, hay que demostrar el valor, ofrecer opciones de pago o comparar con inversiones similares."
                },
                {
                    "question_text": "¿Cuál es la fórmula correcta para manejar objeciones?",
                    "question_type": "MULTIPLE_CHOICE",
                    "points": 10,
                    "options": {
                        "A": "Interrumpir → Contradecir → Cerrar",
                        "B": "Escuchar → Validar → Aclarar → Responder → Confirmar → Avanzar",
                        "C": "Ignorar → Cambiar tema → Presionar cierre",
                        "D": "Negar → Defender → Discutir"
                    },
                    "correct_answer": "B",
                    "explanation": "La fórmula correcta es: Escuchar completamente, Validar la preocupación, Aclarar si es necesario, Responder con datos, Confirmar resolución y Avanzar."
                },
                {
                    "question_text": "¿Qué técnica de cierre es más recomendada para turismo religioso?",
                    "question_type": "MULTIPLE_CHOICE",
                    "points": 10,
                    "options": {
                        "A": "Cierre agresivo",
                        "B": "Cierre manipulador",
                        "C": "Cierre consultivo",
                        "D": "Cierre culpabilizador"
                    },
                    "correct_answer": "C",
                    "explanation": "El cierre consultivo es el más apropiado porque respeta el proceso de decisión y ayuda al cliente a elegir la mejor opción."
                },
                {
                    "question_text": "Una señal de compra verbal es cuando el cliente pregunta sobre fechas de salida.",
                    "question_type": "TRUE_FALSE",
                    "points": 10,
                    "options": {"true": "Verdadero", "false": "Falso"},
                    "correct_answer": "true",
                    "explanation": "Preguntar sobre fechas, formas de pago o documentos necesarios son señales claras de interés en comprar."
                },
                {
                    "question_text": "¿Qué NO debes hacer al manejar objeciones?",
                    "question_type": "MULTIPLE_CHOICE",
                    "points": 10,
                    "options": {
                        "A": "Escuchar completamente",
                        "B": "Validar la preocupación",
                        "C": "Ponerse a la defensiva",
                        "D": "Responder con datos"
                    },
                    "correct_answer": "C",
                    "explanation": "Nunca debes ponerte a la defensiva o discutir agresivamente. Mantén la calma y profesionalismo siempre."
                },
                {
                    "question_text": "El cierre 'por escasez genuina' usa información real sobre disponibilidad limitada.",
                    "question_type": "TRUE_FALSE",
                    "points": 10,
                    "options": {"true": "Verdadero", "false": "Falso"},
                    "correct_answer": "true",
                    "explanation": "El cierre por escasez genuina informa al cliente sobre cupos realmente limitados, sin crear falsa urgencia."
                },
                {
                    "question_text": "¿Qué debes hacer cuando un cliente dice 'Déjeme pensarlo'?",
                    "question_type": "MULTIPLE_CHOICE",
                    "points": 10,
                    "options": {
                        "A": "Insistir agresivamente para cerrar hoy",
                        "B": "Validar, aclarar dudas pendientes, establecer siguiente paso",
                        "C": "Dejarlo ir sin seguimiento",
                        "D": "Culparlo por no decidir"
                    },
                    "correct_answer": "B",
                    "explanation": "La mejor respuesta es validar su decisión, aclarar si hay dudas específicas y establecer un siguiente paso concreto de seguimiento."
                },
                {
                    "question_text": "¿Cuál es la tasa de conversión meta con seguimiento apropiado?",
                    "question_type": "MULTIPLE_CHOICE",
                    "points": 10,
                    "options": {
                        "A": "10-20%",
                        "B": "35-45%",
                        "C": "60-70%",
                        "D": "80-90%"
                    },
                    "correct_answer": "B",
                    "explanation": "La tasa de conversión meta con seguimiento apropiado es de 35-45%, significativamente mayor que en la primera llamada (15-25%)."
                }
            ]
        }
    },
]

# Nota: Este archivo contiene solo la definición del módulo 3.
# Los módulos 4 y 5 se encuentran en seed_training_content_part3.py
# para mantener archivos de tamaño manejable.
