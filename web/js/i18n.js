/* i18n.js — mecanismo de idiomas, compartido por tele, micro, portada y administración.
   Las claves son la cadena en castellano; así una cadena mal escrita no rompe nada, simplemente no se traduce.
   Los diccionarios los generan tools/i18n/generar.py a partir de los inventarios. No editarlos a mano. */
(function () {
  const IDIOMAS = { es: 'Castellano', ca: 'Català', en: 'English' };
  const CLAVE_LS = 'gramola-lang';
  const DICTS = {};                                   // idioma -> {castellano: traducción}
  const PATRONES = {};                                // idioma -> [[regexp, plantilla, [placeholders]], ...]
  const FALSO = /\$\{[^}]*\}|\{[a-z]+\}/g;

  /* Las cadenas con hueco (`${n} resultados`) no pueden coincidir literalmente al renderizar: se compilan. */
  function compilar(idioma, diccionario) {
    const lista = [];
    for (const clave of Object.keys(diccionario)) {
      const huecos = clave.match(FALSO);
      if (!huecos) continue;
      let re = '^';
      let i = 0;
      for (const h of huecos) {
        re += clave.slice(i, clave.indexOf(h, i)).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '([\\s\\S]+?)';
        i = clave.indexOf(h, i) + h.length;
      }
      re += clave.slice(i).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$';
      lista.push([new RegExp(re), diccionario[clave], huecos]);
    }
    PATRONES[idioma] = lista;
  }

  function porPatrón(cadena, idioma) {
    for (const [re, plantilla, huecos] of PATRONES[idioma] || []) {
      const m = cadena.match(re);
      if (!m) continue;
      let salida = plantilla;
      huecos.forEach((h, k) => { if (salida.includes(h)) salida = salida.split(h).join(m[k + 1]); });
      return salida;
    }
    return null;
  }
  const originales = new WeakMap();                   // nodo de texto -> su texto de origen
  const originalesAtributo = new WeakMap();           // elemento -> {atributo: valor de origen}
  const ATRIBUTOS = ['title', 'placeholder', 'aria-label'];

  let idioma = 'es';
  let raiz = null;
  let observador = null;
  const oyentes = [];                                 // pantallas que quieren saber cuando cambia

  /* Traduce una cadena. Si no está en el diccionario, la deja como está (castellano). */
  function t(cadena) {
    if (idioma === 'es') return cadena;
    const d = DICTS[idioma];
    if (!d) return cadena;
    if (Object.prototype.hasOwnProperty.call(d, cadena)) return d[cadena];
    const porPatr = porPatrón(cadena, idioma);
    return porPatr === null ? cadena : porPatr;
  }

  /* --- DOM --- */
  function texto(nodo) {
    const d = DICTS[idioma];
    if (!d) return;                                   // sin diccionario (castellano): no tocar nada
    const crudo = originales.has(nodo) ? originales.get(nodo) : nodo.nodeValue;
    let clave = crudo, hueco = null;
    if (!Object.prototype.hasOwnProperty.call(d, clave)) {
      // Los nodos del diseño suelen traer espacios alrededor; la clave es la cadena recortada.
      const recortado = crudo.trim();
      const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(crudo);
      if (recortado && Object.prototype.hasOwnProperty.call(d, recortado)) { clave = recortado; hueco = [m[1], m[3]]; }
      else if (porPatrón(crudo, idioma) === null) return;
    }
    const nueva = t(clave);
    if (nueva === crudo) return;
    const definitiva = hueco ? hueco[0] + nueva + hueco[1] : nueva;
    if (nodo.nodeValue !== definitiva) { originales.set(nodo, crudo); nodo.nodeValue = definitiva; }
  }

  function atributos(el) {
    const d = DICTS[idioma];
    if (!d) return;
    const guardados = originalesAtributo.get(el) || {};
    for (const a of ATRIBUTOS) {
      if (!el.hasAttribute(a)) continue;
      const original = a in guardados ? guardados[a] : el.getAttribute(a);
      if (!Object.prototype.hasOwnProperty.call(d, original) && porPatrón(original, idioma) === null) continue;
      const nueva = d[original];
      if (el.getAttribute(a) !== nueva) { guardados[a] = original; originalesAtributo.set(el, guardados); el.setAttribute(a, nueva); }
    }
  }

  function repasar(nodo) {
    if (nodo.nodeType === 3) texto(nodo);
    else if (nodo.nodeType === 1) {
      atributos(nodo);
      const w = document.createTreeWalker(nodo, 4 | 1);
      let n = w.nextNode();
      while (n) { if (n.nodeType === 3) texto(n); else atributos(n); n = w.nextNode(); }
    }
  }

  /* El diseño re-renderiza a cada estado, así que el repaso va por observer, no una sola vez. */
  function observar(container) {
    if (observador) observador.disconnect();
    raiz = container || document.body;
    observador = new MutationObserver(muts => {
      for (const m of muts) {
        if (m.type === 'characterData') { if (!DICTS[idioma]) continue; texto(m.target); }
        else { for (const n of m.addedNodes) repasar(n); }
      }
    });
    observador.observe(raiz, { childList: true, subtree: true, characterData: true });
    repasar(raiz);
  }

  /* --- canvas: se envuelve el trazado de texto, y las medidas tienen que cuadrar con lo que se pinta --- */
  function parchearCanvas() {
    const P = window.CanvasRenderingContext2D && CanvasRenderingContext2D.prototype;
    if (!P || P.__gramolaI18N) return;
    P.__gramolaI18N = true;
    for (const metodo of ['fillText', 'strokeText']) {
      const original = P[metodo];
      P[metodo] = function (texto, ...resto) { return original.call(this, t(String(texto)), ...resto); };
    }
    const medir = P.measureText;
    P.measureText = function (texto) { return medir.call(this, t(String(texto))); };
  }

  /* --- control --- */
  /* Estilo del control: hereda tipografía y color de la pantalla que lo mete. Una sola hoja para todas. */
  const ESTILO = '.i18n{display:inline-flex;gap:.7em;align-items:center;font:inherit;color:inherit}' +
    '.i18n button{appearance:none;background:none;border:0;padding:0;font:inherit;color:inherit;opacity:.5;cursor:pointer;letter-spacing:inherit;text-transform:inherit}' +
    '.i18n button[aria-pressed="true"]{opacity:1;text-decoration:underline;text-underline-offset:.35em}';
  let hoja = false;

  function montar(container) {
    if (!container) return null;
    if (!hoja) {
      hoja = true;
      const est = document.createElement('style');
      est.textContent = ESTILO;
      document.head.appendChild(est);
    }
    const control = document.createElement('span');
    control.className = 'i18n';
    control.setAttribute('role', 'group');
    control.setAttribute('aria-label', 'Language');
    const pintar = () => {
      control.textContent = '';
      for (const codigo of Object.keys(IDIOMAS)) {
        const opcion = document.createElement('button');
        opcion.type = 'button';
        opcion.textContent = IDIOMAS[codigo];
        opcion.dataset.lang = codigo;
        opcion.setAttribute('aria-pressed', String(codigo === idioma));
        opcion.addEventListener('click', () => cambiar(codigo));
        control.appendChild(opcion);
      }
    };
    pintar();
    container.appendChild(control);
    return control;
  }

  function cambiar(codigo) {
    if (!IDIOMAS[codigo]) return;
    idioma = codigo;
    try { localStorage.setItem(CLAVE_LS, codigo); } catch (_) { }
    // Con castellano no hay diccionario: hay que restaurar lo que cambiemos antes, desde el origen guardado.
    if (!DICTS[idioma]) {
      restaurar();
    }
    repasar(raiz || document.body);
    for (const f of oyentes) { try { f(idioma); } catch (_) { } }
  }

  function restaurar() {
    // Solo se puede restaurar lo que seguimos teniendo referenciado; lo demás lo pinta el diseño de nuevo.
    const raizActual = raiz || document.body;
    const w = document.createTreeWalker(raizActual, 4 | 1);
    let n = w.currentNode;
    while (n) {
      if (n.nodeType === 3 && originales.has(n)) n.nodeValue = originales.get(n);
      else if (n.nodeType === 1) {
        const guardados = originalesAtributo.get(n);
        if (guardados) for (const a of Object.keys(guardados)) n.setAttribute(a, guardados[a]);
      }
      n = w.nextNode();
    }
  }

  window.I18N = {
    idiomas: IDIOMAS,
    get lang() { return idioma; },
    t, cambiar, montar, observar,
    cargar(diccionario, opciones) {
      const idiomaDict = (opciones && opciones.idioma) ? opciones.idioma : 'en';
      DICTS[idiomaDict] = diccionario;
      compilar(idiomaDict, diccionario);
      if (idioma === idiomaDict) repasar(raiz || document.body);
    },
    empezar(opciones) {
      let guardado = 'es';
      try { guardado = localStorage.getItem(CLAVE_LS) || 'es'; } catch (_) { }
      if (IDIOMAS[guardado]) idioma = guardado;
      parchearCanvas();
      observar((opciones && opciones.container) || document.body);
      return idioma;
    },
    onLangChange(f) { oyentes.push(f); }
  };

  // Las pantallas que dejan un hueco en el HTML (portada, micro, administración) reciben el control aquí.
  // La tele no: usa la fila de Idioma de Ajustes, que ya existe en el diseño.
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', montarHuecos);
  else montarHuecos();
  function montarHuecos() {
    window.I18N.empezar();                             // arranca el observer: el diseño re-renderiza después
    for (const hueco of document.querySelectorAll('[data-i18n-control]')) montar(hueco);
  }
})();
