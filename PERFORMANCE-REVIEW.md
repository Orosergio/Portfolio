# Revisión del portafolio — 5 de septiembre de 2026

## Enfoque para recruiters de NVIDIA y Google

La portada permite evaluar proyectos, implementación, casos técnicos, GitHub y résumé sin iniciar WebGL. La ciudad es una experiencia opcional que demuestra ingeniería gráfica y capacidad de ejecución. Se mantiene Three.js y la generación procedural; cambiar de framework no resolvería el coste de los efectos, los píxeles ni las actualizaciones por fotograma.

La relevancia para NVIDIA se apoya en el trabajo real de gráficos, rendimiento y firmware que ya existe en el portafolio. Su documentación de contratación universitaria incluye graphics systems, arquitectura y programación de sistemas. Para Google, sus consejos de résumé recomiendan comunicar impacto y evidencia. Destacar esas señales es una inferencia de diseño, no una afirmación de que un estilo o un color asegure entrevistas. No se añadieron logotipos de empresas, experiencia con CUDA ni resultados no demostrados.

Fuentes primarias:
- [NVIDIA: áreas de ingeniería para contratación universitaria](https://www.nvidia.com/content/dam/en-zz/Solutions/careers/university-recruiting/corporate-web-hr-ur-digital-flyer-job-description.pdf).
- [NVIDIA: How We Hire](https://www.nvidia.com/en-us/about-nvidia/careers/how-we-hire/).
- [Google: Resume Overview](https://services.google.com/fh/files/misc/resumetipshandout2016.pdf) — documento histórico; se usa por su consejo estable sobre evidencia, no como política actual.

## Referencias de mercado y decisiones

[Bruno Simon, folio-2025](https://github.com/brunosimon/folio-2025) demuestra que la exploración 3D conducible es un formato viable de portafolio. El producto debe ofrecer además acceso directo al trabajo. Se eligió una entrada classic ligera y una ciudad opcional con selector de proyectos, mapa, autopilot y salida clara. Se evita hacer obligatorio aprender a conducir para encontrar evidencia técnica.

[Three.js: Optimize Lots of Objects](https://threejs.org/manual/en/optimize-lots-of-objects.html) explica el coste de las llamadas de dibujo y la combinación de geometrías. El proyecto ya utilizaba batching e instancing; se conservaron. [Three.js: Responsive Design](https://threejs.org/manual/en/responsive.html) explica el coste de resolución y DPR. Se añadió un presupuesto de píxeles total, que también limita ventanas 4K.

[web.dev: Rendering performance](https://web.dev/articles/rendering-performance) describe el coste de layout, paint y composición. Los tooltips ahora se posicionan con transformaciones, el minimapa no se repinta en cada fotograma, y las superficies del HUD no aplican blur al canvas animado.

## Color y cámara

| Decisión implementada | Efecto buscado en el visitante |
| --- | --- |
| Classic: papel claro, tinta oscura, gris legible y acento rojo oscuro | Lectura rápida y jerarquía; el acento distingue las acciones sin competir con todas las tarjetas. |
| Imágenes reales de productos y de la ciudad en portada | Mostrar evidencia concreta junto al mensaje profesional. |
| Ciudad: terreno arena desaturado y ambiente más neutro | Separar calles, edificios y proyectos; reducir el tinte naranja general. |
| Colores fuertes reservados a hitos y señales | Facilitar orientación. Se añaden nombres, por lo que navegar no depende solo del color. |
| Corrección de doble conversión sRGB y salida del shader del cielo | Mantener colores consistentes entre materiales, instancias y render directo. |
| Cámara de seguimiento más abierta, horizonte y FOV estables | Más contexto alrededor del vehículo y menos movimiento secundario. |
| Overview y retorno a seguimiento | Entender la distribución de la isla y elegir cómo explorarla. |
| Tarjeta fija con pausa de la escena | Leer el proyecto sin perseguir un elemento que se mueve con la cámara. |

Estas son decisiones de diseño fundamentadas, no una medición de preferencias de recruiters. No se atribuye un efecto psicológico universal a verde, azul o rojo.

[W3C: contraste mínimo](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html) sustenta el contraste textual (4.5:1 para texto normal). [Microsoft XAG 117](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/117) trata las distracciones visuales y los movimientos de cámara que pueden provocar molestias. Se quitaron el balanceo y el cambio de FOV al acelerar, además del temblor al chocar; se conserva prefers-reduced-motion.

## Fallos corregidos

- PC arrancaba con GTAO, bloom, grading y un target flotante multisampleado. Ahora arranca con render directo; Detail carga únicamente bloom y salida de color cuando se solicita.
- Auto solo retiraba AO y reducía DPR una vez. Ahora puede llegar a render sin sombras y a un presupuesto de 500K píxeles; usa intervalos antes de truncar el tiempo de física y excluye las pausas deliberadas.
- Sombras recalculadas continuamente: actualización limitada a 15 Hz en Balanced, 20 Hz en Detail.
- Minimap actualizado a la frecuencia del render: ahora 10 Hz.
- Simulación/render detrás de tarjetas y ayuda: ahora se detienen; pestañas ocultas cancelan el bucle.
- Estados hidden anulados por display:flex: se respetan de nuevo.
- Marcas de carretera coplanares con el asfalto: se elevan para eliminar z-fighting. Se corrige la orientación de las rayas de los pasos de peatones.
- Nombres de proyectos enormes/cortados por edificios: tamaño aparente estable y etiquetas legibles sobre la geometría.
- Tarjetas que seguían al edificio y podían quedar fuera del viewport: panel fijo con botón de cierre y scroll en pantallas pequeñas.
- Vehículo sin recuperación visible: Reset y tecla R.
- Entrada persistente tras ocultar la pestaña: se limpia el teclado.
- Almacenamiento de visitas inválido: se valida el array y los identificadores.
- Pérdida de contexto WebGL o error de arranque: salida visible hacia classic.
- Cambios repetidos de Detail: se liberan targets y passes; las cargas asíncronas antiguas no reinstalan un perfil ya descartado.

## Medición local

Mismo navegador integrado, 1440 × 900 CSS px, DPR del dispositivo aproximadamente 1, día, kart, desde spawn hacia OpenClaw. Una ventana de cuatro segundos por versión tras cargar. La referencia se reconstruyó desde HEAD en .qa/baseline; solo se añadieron contadores de render. El otro tab mostraba una página estática.

| Métrica | Original | Revisión |
| --- | ---: | ---: |
| FPS realmente renderizados | 36.94 | 54.47 |
| Frames renderizados | 148 | 218 |
| Mediana de intervalo rAF | 25.2 ms | 16.7 ms |
| Percentil 95 de intervalo rAF | 29.3 ms | 21.0 ms |
| Mediana de llamadas de dibujo de frame completo | 259 | 174 |

Se compara la experiencia por defecto antes/después, incluida la nueva cámara más abierta. Los elementos decorativos procedurales son aleatorios. Es una muestra breve en este navegador; no demuestra 60 FPS universales, ni latencia GPU aislada, ni equivalencia en todas las GPUs. Las llamadas incluyen sombras cuando se actualizan y todos los passes, a diferencia de los números históricos de una pasada aislada. Los datos crudos están en .qa/benchmark.json.

## Verificación

- Build de Vite y pruebas con node --test.
- Presupuestos de píxeles en 4K, escritorio y móvil; degradación sostenida, tolerancia a picos, selección manual y reset.
- Color de vértices/instancias consistente con materiales y geometrías indexadas/no indexadas.
- Separación de profundidad entre asfalto y marcas.
- Simulación de las ocho rutas desde spawn con kart y bicicleta: 16/16 completadas (sin tráfico, con los obstáculos reales). No equivale a probar todos los pares de destinos ni todas las interacciones con tráfico.
- Browser: autopilot, tarjeta por teclado, foco en el enlace, cierre, pausa sin frames adicionales ni desplazamiento durante la lectura, calidad Detail y Performance, día/noche y Overview.
- Classic revisado en escritorio y 390 px, contenido visible sin animaciones obligatorias y sin desbordamiento horizontal de la página.

Los cambios están preparados localmente. No se publicó ni desplegó el sitio.
