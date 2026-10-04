// clove-i18n.js — langue de l'app (français, espagnol, anglais).
// Chargé par clove-api.js. Le design (index.html) est écrit en français : ce module traduit à l'écran
// chaque texte affiché, à partir du dictionnaire ci-dessous (français → espagnol, anglais), sans toucher
// au design. Les textes composés (prénom, date, distance…) passent par des règles (RULES).
// Au premier lancement, une page de choix de la langue s'affiche. Le choix est gardé sur l'appareil ;
// Profil → Langue permet d'en changer (window.CloveI18n.open()).
(function () {
  const KEY = 'clove_lang';
  const LANGS = ['fr', 'es', 'en'];
  const store = {
    get: () => { try { return localStorage.getItem(KEY); } catch (_) { return null; } },
    set: (v) => { try { localStorage.setItem(KEY, v); } catch (_) {} },
  };
  const forced = new URLSearchParams(location.search).get('lang');
  let lang = LANGS.includes(forced) ? forced : (LANGS.includes(store.get()) ? store.get() : null);

  // [français, español, english]
  const T = [
    // ── Accueil, histoire, onboarding ──
    ['ANTI-DATING', 'ANTI-DATING', 'ANTI-DATING'],
    ['NO SWIPE', 'NO SWIPE', 'NO SWIPE'],
    ['IRL FIRST', 'IRL FIRST', 'IRL FIRST'],
    ['ANTI—DATING · NO SWIPE', 'ANTI—DATING · NO SWIPE', 'ANTI—DATING · NO SWIPE'],
    ['CLOVE · ANTI-DATING', 'CLOVE · ANTI-DATING', 'CLOVE · ANTI-DATING'],
    ['PRÊT', 'LISTO', 'READY'],
    ['À', 'PARA', 'TO'],
    ['VIBRER ?', '¿VIBRAR?', 'VIBE?'],
    ['ZÉRO', 'CERO', 'ZERO'],
    ['SWIPE.', 'SWIPE.', 'SWIPE.'],
    ['UN DÉFI,', 'UN RETO,', 'A CHALLENGE,'],
    ['EN VRAI.', 'EN PERSONA.', 'IN REAL LIFE.'],
    ['ON SE', 'NOS', 'WE'],
    ['RENCONTRE.', 'CONOCEMOS.', 'MEET.'],
    ['COMMENCER →', 'EMPEZAR →', 'START →'],
    ['COMMENT MARCHE', 'CÓMO FUNCIONA', 'HOW IT WORKS'],
    ['EN CLOVE.', 'CLOVE.', 'CLOVE.'],
    ['RENCONTRES RÉELLES UNIQUEMENT', 'SOLO ENCUENTROS REALES', 'REAL-LIFE MEETINGS ONLY'],
    ['On discute ensuite. Clove repère quelqu’un de compatible tout près, lance un défi, et n’ouvre le chat qu’après la rencontre.',
      'Se habla después. Clove detecta a alguien compatible muy cerca, lanza un reto y solo abre el chat tras el encuentro.',
      'Talk comes later. Clove spots someone compatible nearby, launches a challenge, and only opens the chat after you meet.'],
    ['CRÉER MON PROFIL →', 'CREAR MI PERFIL →', 'CREATE MY PROFILE →'],
    ['SUIVANT →', 'SIGUIENTE →', 'NEXT →'],
    ['CONTINUER →', 'CONTINUAR →', 'CONTINUE →'],
    ['J’AI COMPRIS →', 'ENTENDIDO →', 'GOT IT →'],
    ['Plus tard', 'Más tarde', 'Later'],
    ['AVANT DE COMMENCER', 'ANTES DE EMPEZAR', 'BEFORE YOU START'],
    ['POUR CRÉER TON PROFIL', 'PARA CREAR TU PERFIL', 'TO CREATE YOUR PROFILE'],
    ['RAVI DE TE', 'ENCANTADOS DE', 'NICE TO'],
    ['RENCONTRER !', 'CONOCERTE!', 'MEET YOU!'],
    ['PRÉNOM', 'NOMBRE', 'FIRST NAME'],
    ['Prénom', 'Nombre', 'First name'],
    ['NOM', 'APELLIDO', 'LAST NAME'],
    ['Nom', 'Apellido', 'Last name'],
    ['DATE DE NAISSANCE', 'FECHA DE NACIMIENTO', 'DATE OF BIRTH'],
    ['DATE DE NAISSANCE À RENSEIGNER', 'FALTA LA FECHA DE NACIMIENTO', 'DATE OF BIRTH NEEDED'],
    ['RÉSERVÉ AUX 17 ANS ET PLUS', 'SOLO PARA MAYORES DE 17 AÑOS', 'FOR AGES 17 AND UP ONLY'],
    ['Ton nom complet sert à la vérification. Les autres ne voient que ton prénom et ton âge.',
      'Tu nombre completo sirve para la verificación. Los demás solo ven tu nombre y tu edad.',
      'Your full name is used for verification. Others only see your first name and age.'],
    ['COMPATI-', 'COMPATI-', 'COMPATI-'],
    ['BILITÉ', 'BILIDAD', 'BILITY'],
    ['JE SUIS', 'SOY', 'I AM'],
    ['JE CHERCHE À RENCONTRER', 'QUIERO CONOCER A', 'I WANT TO MEET'],
    ['Homme', 'Hombre', 'Man'],
    ['Femme', 'Mujer', 'Woman'],
    ['Autre', 'Otro', 'Other'],
    ['Hommes', 'Hombres', 'Men'],
    ['Femmes', 'Mujeres', 'Women'],
    ['Les deux', 'Ambos', 'Both'],
    ['Aucun profil public.', 'Ningún perfil público.', 'No public profile.'],
    ['Ces réponses servent seulement à filtrer qui peut te croiser.',
      'Estas respuestas solo sirven para filtrar quién puede cruzarse contigo.',
      'These answers are only used to filter who can cross your path.'],
    ['PLUTÔT EXTRAVERTI·E', 'MÁS BIEN EXTROVERTIDO/A', 'MORE OF AN EXTROVERT'],
    ['PLUTÔT INTROVERTI·E', 'MÁS BIEN INTROVERTIDO/A', 'MORE OF AN INTROVERT'],
    ['Partant·e pour un défi IRL spontané, tout de suite.', 'Listo/a para un reto IRL espontáneo, ya mismo.', 'Up for a spontaneous IRL challenge, right now.'],
    ['J’y vais doucement — je m’allume rarement.', 'Voy despacio: me enciendo pocas veces.', 'I take it slow — I rarely switch on.'],

    // ── Empreinte ──
    ['TON EMPREINTE', 'TU HUELLA', 'YOUR PRINT'],
    ['TON', 'TU', 'YOUR'],
    ['EMPREINTE', 'HUELLA', 'PRINT'],
    ['Touche une branche et étire-la. Vers l’extérieur : c’est tout toi.', 'Toca una rama y estírala. Hacia fuera: eres totalmente tú.', 'Touch a branch and stretch it. Outward: that’s so you.'],
    ['Chaque branche est une habitude. Sa longueur dit à quel point elle te ressemble.', 'Cada rama es un hábito. Su longitud dice cuánto se parece a ti.', 'Each branch is a habit. Its length shows how much it’s like you.'],
    ['Vers l’extérieur : c’est tout toi. Vers le centre : pas du tout.', 'Hacia fuera: eres totalmente tú. Hacia el centro: nada.', 'Outward: that’s so you. Toward the center: not at all.'],
    ['Les 12 branches dessinent ta forme : c’est ton avatar, unique.', 'Las 12 ramas dibujan tu forma: es tu avatar, único.', 'The 12 branches draw your shape: it’s your one-of-a-kind avatar.'],
    ['Pose ton doigt sur une branche.', 'Pon el dedo en una rama.', 'Put your finger on a branch.'],
    ['SORTIES · PAS DU TOUT', 'SALIDAS · NADA', 'GOING OUT · NOT AT ALL'],
    ['SPORT · À FOND', 'DEPORTE · A TOPE', 'SPORT · ALL IN'],
    ['PAS DU TOUT', 'NADA', 'NOT AT ALL'],
    ['UN PEU', 'UN POCO', 'A LITTLE'],
    ['BEAUCOUP', 'MUCHO', 'A LOT'],
    ['À FOND', 'A TOPE', 'ALL IN'],
    ['MODIFICATION DE L’EMPREINTE · UNE FOIS PAR MOIS. APRÈS VALIDATION, ELLE SERA VERROUILLÉE 30 JOURS. ← POUR ANNULER.',
      'CAMBIO DE HUELLA · UNA VEZ AL MES. TRAS VALIDAR, QUEDARÁ BLOQUEADA 30 DÍAS. ← PARA CANCELAR.',
      'PRINT EDIT · ONCE A MONTH. AFTER YOU CONFIRM, IT’S LOCKED FOR 30 DAYS. ← TO CANCEL.'],
    ['VALIDER · VERROUILLÉE 30 JOURS', 'VALIDAR · BLOQUEADA 30 DÍAS', 'CONFIRM · LOCKED 30 DAYS'],
    ['CAFÉ', 'CAFÉ', 'COFFEE'], ['RÉVEIL', 'DESPERTAR', 'WAKE-UP'], ['SÉRIES', 'SERIES', 'SERIES'], ['CUISINE', 'COCINA', 'COOKING'],
    ['DANSE', 'BAILE', 'DANCE'], ['VOCAUX', 'AUDIOS', 'VOICE NOTES'], ['SPORT', 'DEPORTE', 'SPORT'], ['VOYAGE', 'VIAJE', 'TRAVEL'],
    ['PLANTES', 'PLANTAS', 'PLANTS'], ['KARAOKÉ', 'KARAOKE', 'KARAOKE'], ['CHIENS', 'PERROS', 'DOGS'], ['NUIT', 'NOCHE', 'NIGHT'],
    ['Cafés par jour', 'Cafés al día', 'Coffees a day'],
    ['Ton réveil', 'Tu despertar', 'Your wake-up'],
    ['Séries en une soirée', 'Series en una noche', 'Episodes in one evening'],
    ['Toi en cuisine', 'Tú en la cocina', 'You in the kitchen'],
    ['Sur une piste de danse', 'En una pista de baile', 'On a dance floor'],
    ['Tes messages vocaux', 'Tus mensajes de voz', 'Your voice notes'],
    ['Le sport', 'El deporte', 'Sport'],
    ['Partir sur un coup de tête', 'Irse por un impulso', 'Leaving on a whim'],
    ['Tes plantes', 'Tus plantas', 'Your plants'],
    ['Au karaoké', 'En el karaoke', 'At karaoke'],
    ['Un chien croisé dans la rue', 'Un perro por la calle', 'A dog in the street'],
    ['Tes fins de soirée', 'Tus finales de noche', 'Your late nights'],
    ['Zéro. Tu carbures à l’eau plate.', 'Cero. Funcionas con agua sin gas.', 'Zero. You run on still water.'],
    ['Tu comptes en litres, pas en tasses.', 'Cuentas en litros, no en tazas.', 'You count in liters, not cups.'],
    ['Un petit café le matin, pas plus.', 'Un cafecito por la mañana, nada más.', 'One small coffee in the morning, that’s it.'],
    ['Deux ou trois tasses, et la journée démarre.', 'Dos o tres tazas, y arranca el día.', 'Two or three cups, and the day begins.'],
    ['Debout avant le soleil, sans alarme.', 'En pie antes que el sol, sin alarma.', 'Up before the sun, no alarm.'],
    ['Le matin, pour toi, c’est 13 h.', 'Para ti, la mañana empieza a la 1 de la tarde.', 'For you, morning starts at 1 p.m.'],
    ['Réveillé·e tôt, mais avec deux alarmes.', 'Te despiertas pronto, pero con dos alarmas.', 'Up early, but with two alarms.'],
    ['Tu repousses l’alarme trois fois, minimum.', 'Pospones la alarma tres veces, mínimo.', 'You hit snooze three times, minimum.'],
    ['Un épisode, et au lit.', 'Un episodio, y a la cama.', 'One episode, then bed.'],
    ['« Épisode suivant » ne te fait plus peur.', '«Siguiente episodio» ya no te da miedo.', '“Next episode” doesn’t scare you anymore.'],
    ['Deux épisodes, parfois trois.', 'Dos episodios, a veces tres.', 'Two episodes, sometimes three.'],
    ['Une saison entière le week-end, ça arrive.', 'Una temporada entera el fin de semana, a veces pasa.', 'A whole season over the weekend happens.'],
    ['Tes pâtes collent. Toujours.', 'Tu pasta se pega. Siempre.', 'Your pasta sticks. Always.'],
    ['Un risotto avec trois restes, sans recette.', 'Un risotto con tres sobras, sin receta.', 'A risotto from three leftovers, no recipe.'],
    ['Tu suis la recette, à la lettre.', 'Sigues la receta al pie de la letra.', 'You follow the recipe to the letter.'],
    ['Tu improvises, et c’est souvent bon.', 'Improvisas, y suele salir bien.', 'You improvise, and it’s often good.'],
    ['Toi, ton verre et le mur.', 'Tú, tu copa y la pared.', 'You, your drink and the wall.'],
    ['Premier sur la piste, dernier à partir.', 'El primero en la pista, el último en irse.', 'First on the floor, last to leave.'],
    ['Tu bouges la tête, sans quitter le bar.', 'Mueves la cabeza sin dejar la barra.', 'You nod along without leaving the bar.'],
    ['Tu danses dès que ta chanson passe.', 'Bailas en cuanto suena tu canción.', 'You dance as soon as your song comes on.'],
    ['Jamais. Tu écris.', 'Nunca. Escribes.', 'Never. You type.'],
    ['Des podcasts de quatre minutes.', 'Pódcasts de cuatro minutos.', 'Four-minute podcasts.'],
    ['Un vocal de temps en temps, court.', 'Un audio de vez en cuando, corto.', 'A short voice note now and then.'],
    ['Tu parles plus que tu n’écris.', 'Hablas más de lo que escribes.', 'You talk more than you type.'],
    ['Tu cours… après le bus.', 'Corres… detrás del autobús.', 'You run… after the bus.'],
    ['Salle, run, vélo : tu ne rates rien.', 'Gimnasio, correr, bici: no te pierdes nada.', 'Gym, running, cycling: you never miss a thing.'],
    ['Une balade, un footing de temps en temps.', 'Un paseo, un trote de vez en cuando.', 'A walk, a jog now and then.'],
    ['Deux ou trois séances par semaine.', 'Dos o tres sesiones por semana.', 'Two or three sessions a week.'],
    ['Tu réserves six mois avant.', 'Reservas con seis meses de antelación.', 'You book six months ahead.'],
    ['Ta valise est toujours à moitié faite.', 'Tu maleta siempre está medio hecha.', 'Your suitcase is always half packed.'],
    ['Un week-end improvisé, une fois l’an.', 'Un fin de semana improvisado, una vez al año.', 'One spur-of-the-moment weekend a year.'],
    ['Un billet pris la veille ? Pourquoi pas.', '¿Un billete comprado la víspera? ¿Por qué no?', 'A ticket booked the day before? Why not.'],
    ['Même le cactus n’a pas survécu.', 'Ni el cactus sobrevivió.', 'Even the cactus didn’t make it.'],
    ['Ton salon est une jungle, et elles ont des noms.', 'Tu salón es una jungla, y tienen nombre.', 'Your living room is a jungle, and they have names.'],
    ['Une plante, et elle tient le coup.', 'Una planta, y aguanta.', 'One plant, and it’s hanging in there.'],
    ['Une étagère entière, et tu les arroses.', 'Una estantería entera, y las riegas.', 'A whole shelf, and you water them.'],
    ['Plutôt mourir.', 'Antes muerto/a.', 'Over my dead body.'],
    ['Tu as une chanson signature, et tu la réclames.', 'Tienes tu canción estrella, y la pides.', 'You have a signature song, and you ask for it.'],
    ['Seulement en chœur, et au fond.', 'Solo en grupo, y al fondo.', 'Only in a group, at the back.'],
    ['Tu prends le micro après deux verres.', 'Coges el micro tras dos copas.', 'You grab the mic after two drinks.'],
    ['Tu passes ton chemin.', 'Sigues tu camino.', 'You walk on by.'],
    ['Tu lui dis bonjour avant de voir le maître.', 'Lo saludas antes que a su dueño.', 'You say hi to it before the owner.'],
    ['Un sourire en passant.', 'Una sonrisa al pasar.', 'A smile in passing.'],
    ['Tu t’arrêtes pour le caresser.', 'Te paras a acariciarlo.', 'You stop to pet it.'],
    ['Rentré·e à 23 h, au lit à 23 h 05.', 'En casa a las 23 h, en la cama a las 23:05.', 'Home at 11 p.m., in bed by 11:05.'],
    ['Tu vois souvent le soleil se lever.', 'Sueles ver salir el sol.', 'You often see the sunrise.'],
    ['Tu rentres vers minuit, raisonnable.', 'Vuelves hacia medianoche, razonable.', 'Home around midnight, sensible.'],
    ['Tu fermes souvent le bar.', 'Sueles cerrar el bar.', 'You often close the bar.'],

    // ── Couleurs, signature, photo, final ──
    ['TES', 'TUS', 'YOUR'],
    ['COULEURS', 'COLORES', 'COLORS'],
    ['Trois réponses à l’instinct. Tes couleurs restent', 'Tres respuestas por instinto. Tus colores siguen', 'Three gut answers. Your colors stay'],
    ['secrètes', 'secretos', 'secret'],
    ['jusqu’à la validation : impossible de choisir à l’œil.', 'hasta validar: imposible elegir a ojo.', 'until you confirm: no choosing by eye.'],
    ['À QUELLE HEURE TU ES LE PLUS TOI ?', '¿A QUÉ HORA ERES MÁS TÚ?', 'WHAT TIME ARE YOU MOST YOU?'],
    ['GLISSE LE SOLEIL', 'DESLIZA EL SOL', 'SLIDE THE SUN'],
    ['TON VOLUME DANS UNE PIÈCE', 'TU VOLUMEN EN UNA SALA', 'YOUR VOLUME IN A ROOM'],
    ['CHUCHOTE → REMPLIT LA PIÈCE', 'SUSURRA → LLENA LA SALA', 'WHISPERS → FILLS THE ROOM'],
    ['CHUCHOTE', 'SUSURRA', 'WHISPERS'], ['POSÉ·E', 'TRANQUILO/A', 'CALM'], ['NATUREL', 'NATURAL', 'NATURAL'], ['PORTE', 'SE OYE', 'CARRIES'], ['REMPLIT LA PIÈCE', 'LLENA LA SALA', 'FILLS THE ROOM'],
    ['SI TU ÉTAIS UN ÉLÉMENT', 'SI FUERAS UN ELEMENTO', 'IF YOU WERE AN ELEMENT'],
    ['FEU', 'FUEGO', 'FIRE'], ['EAU', 'AGUA', 'WATER'], ['TERRE', 'TIERRA', 'EARTH'], ['AIR', 'AIRE', 'AIR'],
    ['RÉVÉLER MES COULEURS →', 'REVELAR MIS COLORES →', 'REVEAL MY COLORS →'],
    ['NUIT', 'NOCHE', 'NIGHT'], ['AUBE', 'AMANECER', 'DAWN'], ['MATIN', 'MAÑANA', 'MORNING'], ['APRÈS-MIDI', 'TARDE', 'AFTERNOON'], ['GOLDEN HOUR', 'GOLDEN HOUR', 'GOLDEN HOUR'], ['SOIR', 'NOCHE', 'EVENING'],
    ['RÉVÉLATION', 'REVELACIÓN', 'REVEAL'],
    ['FOND', 'FONDO', 'BACKGROUND'], ['FORME', 'FORMA', 'SHAPE'], ['ACCENT', 'ACENTO', 'ACCENT'],
    ['MOTIF · UN AU CHOIX', 'MOTIVO · ELIGE UNO', 'PATTERN · PICK ONE'],
    ['RAYURES', 'RAYAS', 'STRIPES'], ['POIS', 'LUNARES', 'DOTS'], ['TRAME', 'TRAMA', 'GRID'], ['DAMIER', 'DAMERO', 'CHECKS'],
    ['Tu brilles quand tout le monde dort : les chauves-souris te respectent.', 'Brillas cuando todos duermen: los murciélagos te respetan.', 'You shine while everyone sleeps: the bats respect you.'],
    ['Au top dès le matin : ton café te dit merci, ton entourage un peu moins.', 'A tope desde la mañana: tu café te lo agradece, tu entorno algo menos.', 'On top form from the morning: your coffee thanks you, the people around you less so.'],
    ['Au sommet l’après-midi, pile quand les autres font la sieste.', 'En la cima por la tarde, justo cuando los demás duermen la siesta.', 'At your peak in the afternoon, right when everyone else naps.'],
    ['Tu t’allumes à l’heure de l’apéro. Coïncidence ? Aucune.', 'Te enciendes a la hora del aperitivo. ¿Casualidad? Ninguna.', 'You light up at happy hour. Coincidence? None.'],
    ['Tu démarres quand les bars ferment. Les lampadaires te connaissent.', 'Arrancas cuando cierran los bares. Las farolas te conocen.', 'You get going when the bars close. The streetlights know you.'],
    ['Tu chuchotes : il faut se pencher pour t’entendre, c’est fait exprès.', 'Susurras: hay que acercarse para oírte, y es a propósito.', 'You whisper: people have to lean in to hear you, on purpose.'],
    ['Posé·e, tu parles quand ça vaut le coup.', 'Tranquilo/a, hablas cuando merece la pena.', 'Calm, you speak when it’s worth it.'],
    ['Volume naturel : ni la bibliothèque, ni le stade.', 'Volumen natural: ni biblioteca, ni estadio.', 'Natural volume: neither library nor stadium.'],
    ['Plaza Mayor, côté sud, sous les arcades · Madrid', 'Plaza Mayor, lado sur, bajo los soportales · Madrid', 'Plaza Mayor, south side, under the arcades · Madrid'],
    ['VERROUILLÉE', 'BLOQUEADA', 'LOCKED'], ['TOI,', 'TÚ,', 'YOU,'],
    ['Tu portes : même au fond du bus, on t’entend.', 'Se te oye: incluso al fondo del autobús.', 'Your voice carries: even at the back of the bus.'],
    ['Tu remplis la pièce, et la pièce d’à côté aussi.', 'Llenas la sala, y la de al lado también.', 'You fill the room, and the next one too.'],
    ['Et côté feu : tu t’enflammes vite, surtout pour une bonne pizza.', 'Y en fuego: te enciendes rápido, sobre todo por una buena pizza.', 'And as fire: you fire up fast, especially for a good pizza.'],
    ['Et côté eau : tu t’adaptes à tout, sauf aux douches froides.', 'Y en agua: te adaptas a todo, menos a las duchas frías.', 'And as water: you adapt to anything, except cold showers.'],
    ['Et côté terre : solide comme un roc, têtu·e comme une mule.', 'Y en tierra: sólido/a como una roca, terco/a como una mula.', 'And as earth: solid as a rock, stubborn as a mule.'],
    ['Et côté air : insaisissable, même pour ton agenda.', 'Y en aire: imposible de atrapar, hasta para tu agenda.', 'And as air: impossible to pin down, even for your calendar.'],
    ['LE GRAIN DE TA FORME', 'LA TEXTURA DE TU FORMA', 'YOUR SHAPE’S TEXTURE'],
    ['LISSE', 'LISO', 'SMOOTH'], ['RAYÉ', 'RAYADO', 'STRIPED'],
    ['Dernière touche : trace un trait d’un seul geste, directement sur ton avatar. Il s’y grave pour de bon — même toi, tu ne pourrais pas le refaire à l’identique.',
      'Último toque: traza una línea de un solo gesto, directamente sobre tu avatar. Queda grabada para siempre: ni tú podrías repetirla igual.',
      'Final touch: draw one line in a single stroke, right on your avatar. It’s etched for good — even you couldn’t redo it exactly.'],
    ['TRACE ICI', 'TRAZA AQUÍ', 'DRAW HERE'],
    ['Effacer', 'Borrar', 'Clear'],
    ['C’EST SIGNÉ →', 'FIRMADO →', 'SIGNED →'],
    ['UNE', 'UNA', 'A'],
    ['PHOTO', 'FOTO', 'PHOTO'],
    ['Jamais montrée telle quelle : on la fond dans ton avatar. On devine ton allure, pas ton visage.',
      'Nunca se muestra tal cual: la fundimos en tu avatar. Se intuye tu estilo, no tu cara.',
      'Never shown as is: we blend it into your avatar. People sense your vibe, not your face.'],
    ['PRENDRE OU CHOISIR UNE PHOTO', 'HACER O ELEGIR UNA FOTO', 'TAKE OR CHOOSE A PHOTO'],
    ['CONVERSION DE LA PHOTO…', 'CONVIRTIENDO LA FOTO…', 'CONVERTING PHOTO…'],
    ['FORMAT ILLISIBLE · RÉESSAIE', 'FORMATO ILEGIBLE · REINTÉNTALO', 'UNREADABLE FORMAT · TRY AGAIN'],
    ['GLISSE POUR CADRER', 'DESLIZA PARA ENCUADRAR', 'DRAG TO FRAME'],
    ['Changer de photo', 'Cambiar de foto', 'Change photo'],
    ['TRANSFORMER →', 'TRANSFORMAR →', 'TRANSFORM →'],
    ['Sans photo, ton avatar reste abstrait. Tu pourras en ajouter une plus tard depuis ton profil.',
      'Sin foto, tu avatar sigue siendo abstracto. Podrás añadir una más tarde desde tu perfil.',
      'Without a photo, your avatar stays abstract. You can add one later from your profile.'],
    ['APERÇU DE TON PROFIL', 'VISTA PREVIA DE TU PERFIL', 'YOUR PROFILE PREVIEW'],
    ['PHOTO DE PROFIL · N°', 'FOTO DE PERFIL · N.º', 'PROFILE PHOTO · NO.'],
    ['Ta photo, réduite en pixels et repeinte avec tes couleurs, découpée par ton empreinte et effleurée par ta signature. On devine ton allure — pas ton visage.',
      'Tu foto, pixelada y repintada con tus colores, recortada por tu huella y rozada por tu firma. Se intuye tu estilo, no tu cara.',
      'Your photo, pixelated and repainted in your colors, cut by your print and brushed by your signature. People sense your vibe — not your face.'],
    ['LIRE TA FORME', 'LEER TU FORMA', 'READ YOUR SHAPE'],
    ['pointe longue = ça te ressemble', 'punta larga = se parece a ti', 'long point = that’s you'],
    ['POINTE', 'PICO', 'PEAK'], ['CREUX', 'HUECO', 'DIP'],
    ['ENTRER DANS CLOVE', 'ENTRAR EN CLOVE', 'ENTER CLOVE'],
    ['1 ÉPISODE MAX', '1 EPISODIO MÁX', '1 EPISODE MAX'], ['ANTI-SPORT', 'ANTIDEPORTE', 'ANTI-SPORT'], ['COUCHE-TÔT', 'SE ACUESTA PRONTO', 'EARLY TO BED'],
    ['COUP DE TÊTE', 'IMPULSOS', 'ON A WHIM'], ['GRASSE MAT’', 'DORMIR HASTA TARDE', 'LIE-INS'], ['LÈVE-TÔT', 'MADRUGADOR/A', 'EARLY BIRD'],
    ['NUITS BLANCHES', 'NOCHES EN VELA', 'ALL-NIGHTERS'], ['PAS CHIEN', 'NADA DE PERROS', 'NOT A DOG PERSON'], ['PAS DANSEUR', 'NO BAILA', 'NOT A DANCER'],
    ['PAS DE KARAOKÉ', 'NADA DE KARAOKE', 'NO KARAOKE'], ['PAS DE VOCAUX', 'NADA DE AUDIOS', 'NO VOICE NOTES'], ['PÂTES COLLÉES', 'PASTA PEGADA', 'STICKY PASTA'],
    ['TOUT PLANIFIÉ', 'TODO PLANIFICADO', 'ALL PLANNED'], ['ZÉRO CAFÉ', 'CERO CAFÉ', 'ZERO COFFEE'], ['ZÉRO PLANTE', 'CERO PLANTAS', 'ZERO PLANTS'],
    ['SA FORME, EN BREF', 'SU FORMA, EN BREVE', 'THEIR SHAPE, IN BRIEF'],
    ['DISCRET', 'DISCRETO', 'SUBTLE'], ['ÉQUILIBRÉ', 'EQUILIBRADO', 'BALANCED'], ['RECONNAISSABLE', 'RECONOCIBLE', 'RECOGNIZABLE'],

    // ── Radar et rencontre ──
    ['RADAR', 'RADAR', 'RADAR'], ['MATCHS', 'MATCHES', 'MATCHES'], ['PROFIL', 'PERFIL', 'PROFILE'], ['SÉCURITÉ', 'SEGURIDAD', 'SAFETY'],
    ['TU ES EN PAUSE', 'ESTÁS EN PAUSA', 'YOU’RE ON PAUSE'],
    ['Invisible. Touche le cœur pour devenir détectable.', 'Invisible. Toca el corazón para ser detectable.', 'Invisible. Touch the heart to become detectable.'],
    ['À L’ÉCOUTE D’UNE ÉTINCELLE…', 'ESPERANDO UNA CHISPA…', 'LISTENING FOR A SPARK…'],
    ['Le cœur scanne ton rayon. Reste dispo.', 'El corazón escanea tu radio. Sigue disponible.', 'The heart is scanning your radius. Stay available.'],
    ['○ ALLUME-MOI', '○ ENCIÉNDEME', '○ SWITCH ME ON'],
    ['● À L’ÉCOUTE', '● A LA ESCUCHA', '● LISTENING'],
    ['● EN DIRECT', '● EN DIRECTO', '● LIVE'],
    ['GHOST · INVISIBLE', 'GHOST · INVISIBLE', 'GHOST · INVISIBLE'],
    ['VISIBLE ·', 'VISIBLE ·', 'VISIBLE ·'],
    ['Rayon', 'Radio', 'Radius'],
    ['Jusqu’où Clove cherche quelqu’un pour toi.', 'Hasta dónde busca Clove a alguien para ti.', 'How far Clove looks for someone for you.'],
    ['MODE', 'MODO', 'MODE'], ['RAYON', 'RADIO', 'RADIUS'], ['RENCONTRES', 'ENCUENTROS', 'MEETINGS'], ['SUPER-HÉROS', 'SUPERHÉROE', 'SUPERHERO'],
    ['UNE ÉTINCELLE', 'UNA CHISPA', 'A SPARK'],
    ['À DEUX PAS.', 'A DOS PASOS.', 'RIGHT NEARBY.'],
    ['Pas maintenant', 'Ahora no', 'Not now'],
    ['INTÉRESSÉ·E', 'ME INTERESA', 'INTERESTED'],
    ['EN ATTENTE', 'EN ESPERA', 'WAITING'],
    ['Tu as dit oui. On attend qu’Emma accepte aussi.', 'Has dicho que sí. Esperamos a que Emma también acepte.', 'You said yes. Waiting for Emma to accept too.'],
    ['DÉFI IRL', 'RETO IRL', 'IRL CHALLENGE'],
    ['TROUVEZ UN', 'ENCONTRAD UN', 'FIND A'], ['TROUVEZ UNE', 'ENCONTRAD UNA', 'FIND A'], ['PHOTOGRAPHIEZ', 'FOTOGRAFIAD', 'PHOTOGRAPH'], ['SHOOTEZ LE', 'FOTOGRAFIAD EL', 'SHOOT THE'], ['SHOOTEZ UNE', 'FOTOGRAFIAD UNA', 'SHOOT A'],
    ['OBJET', 'OBJETO', 'OBJECT'], ['ROUGE', 'ROJO', 'RED'], ['ET SHOOTEZ-LE.', 'Y FOTOGRAFIADLO.', 'AND SHOOT IT.'],
    ['UN', 'UN', 'A'], ['CHIEN', 'PERRO', 'DOG'], ['QUI PASSE.', 'QUE PASE.', 'WALKING BY.'],
    ['LETTRE', 'LETRA', 'LETTER'], ['SUR UNE ENSEIGNE.', 'EN UN LETRERO.', 'ON A SIGN.'],
    ['PLUS', 'MÁS', 'TINIEST'], ['PETIT', 'PEQUEÑO', 'SMALLEST'], ['OBJET POSSIBLE.', 'OBJETO POSIBLE.', 'OBJECT YOU CAN.'],
    ['CŒUR', 'CORAZÓN', 'HEART'], ['CACHÉ DANS LA RUE.', 'ESCONDIDO EN LA CALLE.', 'HIDDEN IN THE STREET.'],
    ['FENÊTRE', 'VENTANA', 'WINDOW'], ['FLEURIE', 'FLORIDA', 'WITH FLOWERS'], ['PRÈS DE VOUS.', 'CERCA DE VOSOTROS.', 'NEAR YOU.'],
    ['NOMBRE', 'NÚMERO', 'NUMBER'], ['QUELQUE PART.', 'EN ALGÚN SITIO.', 'SOMEWHERE.'],
    ['TOUCHE POUR OUVRIR L’APPAREIL', 'TOCA PARA ABRIR LA CÁMARA', 'TAP TO OPEN THE CAMERA'],
    ['Cadre bien l’objet, c’est lui qui compte.', 'Encuadra bien el objeto, es lo que cuenta.', 'Frame the object well, that’s what counts.'],
    ['PHOTO DU DÉFI · CAPTURÉE', 'FOTO DEL RETO · HECHA', 'CHALLENGE PHOTO · TAKEN'],
    ['« Reprendre » pour refaire', '«Repetir» para rehacerla', '“Retake” to redo it'],
    ['Reprendre', 'Repetir', 'Retake'],
    ['Ouvrir l’appareil', 'Abrir la cámara', 'Open the camera'],
    ['↻ AUTRE DÉFI', '↻ OTRO RETO', '↻ ANOTHER CHALLENGE'],
    ['ENVOYER', 'ENVIAR', 'SEND'],
    ['TA PHOTO', 'TU FOTO', 'YOUR PHOTO'],
    ['TA PHOTO · ENVOYÉE ✓', 'TU FOTO · ENVIADA ✓', 'YOUR PHOTO · SENT ✓'],
    ['ÉTAPE 1 / 2 · ELLE DÉCIDE', 'PASO 1 / 2 · ELLA DECIDE', 'STEP 1 / 2 · SHE DECIDES'],
    ['ÉTAPE 2 / 2 · À TOI', 'PASO 2 / 2 · TE TOCA', 'STEP 2 / 2 · YOUR TURN'],
    ['EMMA DÉCIDE', 'EMMA DECIDE', 'EMMA DECIDES'],
    ['EN PREMIER.', 'PRIMERO.', 'FIRST.'],
    ['EMMA REGARDE TA PHOTO…', 'EMMA ESTÁ MIRANDO TU FOTO…', 'EMMA IS LOOKING AT YOUR PHOTO…'],
    ['Elle voit ta photo du défi. Si elle dit oui, sa photo se dévoile et c’est à toi de choisir. Si elle dit non, ça s’arrête là.',
      'Ella ve tu foto del reto. Si dice que sí, se revela su foto y te toca elegir. Si dice que no, se acaba ahí.',
      'She sees your challenge photo. If she says yes, her photo is revealed and it’s your turn to choose. If she says no, it ends there.'],
    ['DÉMO', 'DEMO', 'DEMO'], ['Elle accepte', 'Ella acepta', 'She accepts'], ['Elle refuse', 'Ella rechaza', 'She declines'],
    ['EMMA A DIT', 'EMMA HA DICHO', 'EMMA SAID'], ['OUI.', 'SÍ.', 'YES.'], ['ET TOI ?', '¿Y TÚ?', 'AND YOU?'],
    ['✓ A DIT OUI', '✓ HA DICHO QUE SÍ', '✓ SAID YES'],
    ['PHOTO D’EMMA', 'FOTO DE EMMA', 'EMMA’S PHOTO'], ['PHOTO EMMA', 'FOTO EMMA', 'EMMA PHOTO'],
    ['OUI, ON CONTINUE', 'SÍ, SEGUIMOS', 'YES, LET’S GO ON'],
    ['On en reste là', 'Lo dejamos aquí', 'Let’s leave it there'],
    ['MATCH.', 'MATCH.', 'MATCH.'],
    ['C’EST UN', 'ES UN', 'IT’S A'],
    ['VOTRE POINT DE RENCONTRE', 'VUESTRO PUNTO DE ENCUENTRO', 'YOUR MEETING POINT'],
    ['Côté sud, sous les arcades. Lieu public, ouvert jusqu’à 23 h.', 'Lado sur, bajo los soportales. Lugar público, abierto hasta las 23 h.', 'South side, under the arcades. Public place, open until 11 p.m.'],
    ['COMMENT Y ALLER', 'CÓMO LLEGAR', 'GET DIRECTIONS'],
    ['CE SERA POUR', 'SERÁ PARA', 'MAYBE'],
    ['UNE PROCHAINE', 'OTRA', 'NEXT'],
    ['(UNE DERNIÈRE FOIS)', '(UNA ÚLTIMA VEZ)', '(ONE LAST TIME)'],
    ['FOIS.', 'VEZ.', 'TIME.'],
    ['Emma a préféré passer son tour. Tu ne verras pas sa photo. Aucun historique, aucune trace.',
      'Emma ha preferido pasar. No verás su foto. Sin historial, sin rastro.',
      'Emma chose to pass. You won’t see her photo. No history, no trace.'],
    ['Aucun historique, aucune trace. On repart à neuf.', 'Sin historial, sin rastro. Empezamos de cero.', 'No history, no trace. Fresh start.'],
    ['REVENIR À L’ÉCOUTE', 'VOLVER A LA ESCUCHA', 'START LISTENING AGAIN'],
    ['DE L’AUTRE…', 'DEL OTRO…', 'FROM THE OTHER…'],
    ['D’ABORD.', 'PRIMERO.', 'FIRST.'],
    ['Matchs', 'Matches', 'Matches'],
    ['RIEN. ENCORE.', 'NADA. TODAVÍA.', 'NOTHING. YET.'],
    ['Passe en Full et laisse une étincelle arriver. Chaque ligne ici est une rencontre vécue.', 'Pasa a Full y deja que llegue una chispa. Cada línea aquí es un encuentro real.', 'Switch to Full and let a spark come. Every line here is a real meeting.'],
    ['VOUS VOUS ÊTES VUS EN VRAI. À VOUS DE JOUER.', 'OS HABÉIS VISTO EN PERSONA. OS TOCA.', 'YOU’VE MET IN REAL LIFE. OVER TO YOU.'],
    ['SIGNALER', 'DENUNCIAR', 'REPORT'], ['SIGNALÉ', 'DENUNCIADO', 'REPORTED'],
    ['Bien joué pour l’objet rouge. Le tien était un extincteur ?', 'Bien jugado con el objeto rojo. ¿El tuyo era un extintor?', 'Nice one on the red object. Was yours a fire extinguisher?'],
    ['Une boîte à lettres. J’ai couru 40 mètres.', 'Un buzón. Corrí 40 metros.', 'A mailbox. I ran 40 meters.'],
    ['Écris…', 'Escribe…', 'Write…'],

    // ── Profil, vérification ──
    ['NON VÉRIFIÉ', 'NO VERIFICADO', 'NOT VERIFIED'], ['✓ VÉRIFIÉ', '✓ VERIFICADO', '✓ VERIFIED'],
    ['VÉRIFIER MON PROFIL', 'VERIFICAR MI PERFIL', 'VERIFY MY PROFILE'],
    ['Pièce d’identité + selfie, 2 minutes. Sans ça, tu ne peux pas lancer de rencontre.', 'Documento de identidad + selfie, 2 minutos. Sin eso, no puedes iniciar un encuentro.', 'ID + selfie, 2 minutes. Without it, you can’t start a meeting.'],
    ['Mode', 'Modo', 'Mode'], ['Contact super-héros', 'Contacto superhéroe', 'Superhero contact'], ['Rencontres vécues', 'Encuentros vividos', 'Meetings so far'],
    ['À CONFIGURER', 'POR CONFIGURAR', 'TO SET UP'],
    ['Modifier mon empreinte', 'Modificar mi huella', 'Edit my print'],
    ['Tu peux la modifier maintenant. Ensuite, elle sera verrouillée 30 jours.', 'Puedes modificarla ahora. Después, quedará bloqueada 30 días.', 'You can edit it now. After that, it’s locked for 30 days.'],
    ['Personnes bloquées', 'Personas bloqueadas', 'Blocked people'],
    ['Conditions & confidentialité', 'Condiciones y privacidad', 'Terms & privacy'],
    ['Supprimer mon compte', 'Eliminar mi cuenta', 'Delete my account'],
    ['Langue', 'Idioma', 'Language'],
    ['VÉRIFICATION · 2 MIN', 'VERIFICACIÓN · 2 MIN', 'VERIFICATION · 2 MIN'],
    ['PROUVE QUE', 'DEMUESTRA QUE', 'PROVE IT’S'], ['C’EST TOI.', 'ERES TÚ.', 'REALLY YOU.'],
    ['Sur Clove, tout le monde est vérifié. C’est ce qui rend une rencontre IRL possible — et sûre.', 'En Clove, todo el mundo está verificado. Es lo que hace posible —y seguro— un encuentro IRL.', 'On Clove, everyone is verified. That’s what makes an IRL meeting possible — and safe.'],
    ['Ta pièce d’identité', 'Tu documento de identidad', 'Your ID'],
    ['Carte d’identité, passeport ou titre de séjour, recto et verso.', 'DNI, pasaporte o permiso de residencia, por las dos caras.', 'ID card, passport or residence permit, front and back.'],
    ['Un selfie vidéo de 3 s', 'Un selfi en vídeo de 3 s', 'A 3-second video selfie'],
    ['Pour vérifier que c’est bien toi, en vrai, maintenant.', 'Para comprobar que eres tú, de verdad, ahora.', 'To check it’s really you, right now.'],
    ['Contrôle automatique', 'Control automático', 'Automatic check'],
    ['Moins d’une minute. Tu reçois le badge ✓ Vérifié.', 'Menos de un minuto. Recibes la insignia ✓ Verificado.', 'Under a minute. You get the ✓ Verified badge.'],
    ['Tes documents sont chiffrés, lus uniquement par notre système de vérification et supprimés après 30 jours. Ils n’apparaissent jamais sur ton profil.',
      'Tus documentos se cifran, solo los lee nuestro sistema de verificación y se eliminan a los 30 días. Nunca aparecen en tu perfil.',
      'Your documents are encrypted, read only by our verification system and deleted after 30 days. They never appear on your profile.'],
    ['COMMENCER', 'EMPEZAR', 'START'],
    ['ÉTAPE 1 · PIÈCE D’IDENTITÉ', 'PASO 1 · DOCUMENTO DE IDENTIDAD', 'STEP 1 · ID'],
    ['Ta pièce,', 'Tu documento,', 'Your ID,'], ['bien à plat.', 'bien plano.', 'nice and flat.'],
    ['CARTE ID', 'DNI', 'ID CARD'], ['PASSEPORT', 'PASAPORTE', 'PASSPORT'], ['SÉJOUR', 'RESIDENCIA', 'RESIDENCE'],
    ['RECTO', 'ANVERSO', 'FRONT'], ['VERSO', 'REVERSO', 'BACK'], ['RECTO ✓', 'ANVERSO ✓', 'FRONT ✓'], ['VERSO ✓', 'REVERSO ✓', 'BACK ✓'], ['PAGE PHOTO', 'PÁGINA DE LA FOTO', 'PHOTO PAGE'], ['PAGE PHOTO ✓', 'PÁGINA DE LA FOTO ✓', 'PHOTO PAGE ✓'],
    ['Touche pour ouvrir l’appareil', 'Toca para abrir la cámara', 'Tap to open the camera'],
    ['Photo prise · touche pour refaire', 'Foto hecha · toca para repetir', 'Photo taken · tap to redo'],
    ['Pas de reflet, les quatre coins visibles, texte lisible. Document valide uniquement.', 'Sin reflejos, las cuatro esquinas visibles, texto legible. Solo documentos válidos.', 'No glare, all four corners visible, readable text. Valid documents only.'],
    ['CONTINUER', 'CONTINUAR', 'CONTINUE'],
    ['ÉTAPE 2 · SELFIE VIDÉO', 'PASO 2 · SELFI EN VÍDEO', 'STEP 2 · VIDEO SELFIE'],
    ['Regarde-nous,', 'Míranos,', 'Look at us,'], ['tourne la tête.', 'gira la cabeza.', 'turn your head.'],
    ['TOUCHE POUR OUVRIR LA CAMÉRA', 'TOCA PARA ABRIR LA CÁMARA', 'TAP TO OPEN THE CAMERA'],
    ['VISAGE CAPTURÉ ✓', 'CARA CAPTADA ✓', 'FACE CAPTURED ✓'],
    ['3 secondes : visage dans l’ovale, puis tourne lentement la tête à gauche. On compare avec la photo de ta pièce — ce selfie n’est jamais publié.',
      '3 segundos: la cara en el óvalo y luego gira despacio la cabeza a la izquierda. La comparamos con la foto de tu documento; este selfi nunca se publica.',
      '3 seconds: face in the oval, then slowly turn your head left. We compare it with your ID photo — this selfie is never published.'],
    ['On vérifie…', 'Lo estamos comprobando…', 'Checking…'],
    ['Authenticité du document, correspondance du visage, âge minimum de 17 ans.', 'Autenticidad del documento, coincidencia de la cara, edad mínima de 17 años.', 'Document authenticity, face match, minimum age 17.'],
    ['VÉRIFIÉ.', 'VERIFICADO.', 'VERIFIED.'],
    ['Le badge apparaît maintenant sur ton profil et sur tes propositions. Tu peux t’allumer sur le radar.', 'La insignia aparece ahora en tu perfil y en tus propuestas. Ya puedes encenderte en el radar.', 'The badge now shows on your profile and your matches. You can switch on the radar.'],
    ['RETOUR AU PROFIL', 'VOLVER AL PERFIL', 'BACK TO PROFILE'],
    ['Fermer', 'Cerrar', 'Close'],

    // ── Sécurité ──
    ['Qui prévenir', '¿A quién avisar', 'Who to alert'], ['si ça tourne mal ?', 'si algo va mal?', 'if things go wrong?'],
    ['Ton contact super-héros. Il ne reçoit rien tant que tu n’appuies pas.', 'Tu contacto superhéroe. No recibe nada mientras no pulses.', 'Your superhero contact. They get nothing until you press.'],
    ['Prénom (ex. Maman, Sam…)', 'Nombre (p. ej. Mamá, Sam…)', 'Name (e.g. Mom, Sam…)'],
    ['Numéro de mobile', 'Número de móvil', 'Mobile number'],
    ['CE N’EST PAS UN NUMÉRO DE MOBILE VALIDE · EX. 06 12 34 56 78', 'NO ES UN NÚMERO DE MÓVIL VÁLIDO · EJ. 612 34 56 78', 'NOT A VALID MOBILE NUMBER · E.G. 07 12 34 56 78'],
    ['ACTIVER LA SÉCURITÉ', 'ACTIVAR LA SEGURIDAD', 'TURN ON SAFETY'],
    ['SMS SEULEMENT', 'SOLO SMS', 'TEXT ONLY'], ['C’EST', 'ES', 'IT’S'], ['GÊNANT', 'INCÓMODO', 'AWKWARD'],
    ['URGENCE RÉELLE UNIQUEMENT', 'SOLO EMERGENCIAS REALES', 'REAL EMERGENCIES ONLY'],
    ['SMS + APPEL', 'SMS + LLAMADA', 'TEXT + CALL'], ['JE ME SENS', 'ME SIENTO', 'I FEEL'], ['EN DANGER', 'EN PELIGRO', 'IN DANGER'],
    ['Modifier', 'Modificar', 'Edit'],
    ['Chaque alerte est enregistrée dans nos données. Le profil concerné est signalé et étudié par notre modération, sans en être informé.',
      'Cada alerta queda registrada. El perfil afectado se denuncia y lo revisa nuestra moderación, sin que lo sepa.',
      'Every alert is logged. The profile involved is reported and reviewed by our moderators, without being told.'],
    ['AUCUN DATE EN COURS', 'NINGUNA CITA EN CURSO', 'NO DATE IN PROGRESS'],
    ['Les deux boutons restent actifs à tout moment.', 'Los dos botones siguen activos en todo momento.', 'Both buttons stay active at all times.'],
    ['LE MESSAGE ENVOYÉ', 'EL MENSAJE ENVIADO', 'THE MESSAGE SENT'],
    ['Message prêt.', 'Mensaje listo.', 'Message ready.'],
    ['Si tu ne peux pas parler, reste en ligne : ton contact entend ce qui se passe autour de toi.', 'Si no puedes hablar, no cuelgues: tu contacto oye lo que pasa a tu alrededor.', 'If you can’t talk, stay on the line: your contact can hear what’s going on around you.'],
    ['ALERTE ENREGISTRÉE DANS NOS DONNÉES DE SÉCURITÉ', 'ALERTA REGISTRADA EN NUESTROS DATOS DE SEGURIDAD', 'ALERT LOGGED IN OUR SAFETY RECORDS'],
    ['SIGNALEMENT ENREGISTRÉ · PROFIL D’EMMA EN COURS D’EXAMEN', 'DENUNCIA REGISTRADA · PERFIL DE EMMA EN REVISIÓN', 'REPORT LOGGED · EMMA’S PROFILE UNDER REVIEW'],
    ['17 · POLICE', '091 · POLICÍA', '17 · POLICE'], ['112 · URGENCES', '112 · EMERGENCIAS', '112 · EMERGENCY'],
    ['Terminer l’alerte', 'Terminar la alerta', 'End alert'], ['TERMINÉ', 'HECHO', 'DONE'],

    // ── Feuilles du profil, signalement ──
    ['Les personnes que tu as signalées ne te sont plus jamais proposées sur le radar. Elles ne savent pas que tu les as bloquées.',
      'Las personas que has denunciado no se te vuelven a proponer en el radar. No saben que las has bloqueado.',
      'People you’ve reported are never suggested to you on the radar again. They don’t know you blocked them.'],
    ['CHARGEMENT…', 'CARGANDO…', 'LOADING…'], ['Personne pour l’instant.', 'Nadie por ahora.', 'Nobody for now.'], ['Débloquer', 'Desbloquear', 'Unblock'],
    ['TES DONNÉES', 'TUS DATOS', 'YOUR DATA'],
    ['Pas de profil public, pas de publicité, pas de revente. Le détail, noir sur blanc :', 'Sin perfil público, sin publicidad, sin reventa. El detalle, negro sobre blanco:', 'No public profile, no ads, no reselling. The details, in black and white:'],
    ['Conditions générales d’utilisation', 'Condiciones generales de uso', 'Terms of use'],
    ['Règles du jeu, rencontres, sécurité, mentions légales', 'Reglas del juego, encuentros, seguridad, aviso legal', 'House rules, meetings, safety, legal notice'],
    ['Politique de confidentialité', 'Política de privacidad', 'Privacy policy'],
    ['Données collectées, position, durées, tes droits (RGPD)', 'Datos recogidos, ubicación, plazos, tus derechos (RGPD)', 'Data collected, location, retention, your rights (GDPR)'],
    ['SUPPRIMER TES DONNÉES : PROFIL → SUPPRIMER MON COMPTE', 'BORRAR TUS DATOS: PERFIL → ELIMINAR MI CUENTA', 'DELETE YOUR DATA: PROFILE → DELETE MY ACCOUNT'],
    ['IRRÉVERSIBLE', 'IRREVERSIBLE', 'IRREVERSIBLE'], ['Supprimer', 'Eliminar', 'Delete'], ['ton compte ?', 'tu cuenta?', 'your account?'],
    ['Ton profil, ton empreinte, tes photos, tes matchs et ton contact de confiance sont effacés tout de suite. On ne peut pas revenir en arrière.',
      'Tu perfil, tu huella, tus fotos, tus matches y tu contacto de confianza se borran al instante. No hay vuelta atrás.',
      'Your profile, print, photos, matches and trusted contact are erased right away. There’s no going back.'],
    ['SUPPRIMER DÉFINITIVEMENT', 'ELIMINAR DEFINITIVAMENTE', 'DELETE FOREVER'], ['SUPPRESSION…', 'ELIMINANDO…', 'DELETING…'], ['Garder mon compte', 'Mantener mi cuenta', 'Keep my account'],
    ['SIGNALEMENT', 'DENUNCIA', 'REPORT'], ['Signaler', 'Denunciar', 'Report'],
    ['Choisis la raison la plus proche.', 'Elige el motivo más cercano.', 'Pick the closest reason.'],
    ['ne saura pas que c’est toi.', 'no sabrá que has sido tú.', 'won’t know it was you.'],
    ['Photo déplacée ou choquante', 'Foto inapropiada o chocante', 'Inappropriate or shocking photo'],
    ['Faux profil ou photo volée', 'Perfil falso o foto robada', 'Fake profile or stolen photo'],
    ['Comportement insistant ou menaçant', 'Comportamiento insistente o amenazante', 'Pushy or threatening behavior'],
    ['Propos haineux ou offensants', 'Comentarios de odio u ofensivos', 'Hateful or offensive remarks'],
    ['Semble avoir moins de 18 ans', 'Parece menor de 18 años', 'Seems under 18'],
    ['Arnaque, spam ou publicité', 'Estafa, spam o publicidad', 'Scam, spam or advertising'],
    ['Autre raison', 'Otro motivo', 'Other reason'],
    ['ENVOYER LE SIGNALEMENT', 'ENVIAR LA DENUNCIA', 'SEND REPORT'],
    ['REÇU', 'RECIBIDO', 'RECEIVED'], ['MERCI.', 'GRACIAS.', 'THANK YOU.'],
    ['Notre équipe examine ton signalement sous 24 h.', 'Nuestro equipo revisa tu denuncia en 24 h.', 'Our team reviews your report within 24 hours.'],
    ['ne te sera plus proposé·e sur le radar, et ne saura pas que c’est toi.', 'no se te volverá a proponer en el radar, y no sabrá que has sido tú.', 'won’t be suggested to you on the radar again, and won’t know it was you.'],
    ['OK', 'OK', 'OK'], ['Annuler', 'Cancelar', 'Cancel'],

    // ── Pays (indicatifs) ──
    ['France', 'Francia', 'France'], ['Belgique', 'Bélgica', 'Belgium'], ['Suisse', 'Suiza', 'Switzerland'], ['Luxembourg', 'Luxemburgo', 'Luxembourg'],
    ['Monaco', 'Mónaco', 'Monaco'], ['Canada / États-Unis', 'Canadá / Estados Unidos', 'Canada / United States'], ['Espagne', 'España', 'Spain'],
    ['Italie', 'Italia', 'Italy'], ['Allemagne', 'Alemania', 'Germany'], ['Royaume-Uni', 'Reino Unido', 'United Kingdom'], ['Portugal', 'Portugal', 'Portugal'],
    ['Pays-Bas', 'Países Bajos', 'Netherlands'], ['Maroc', 'Marruecos', 'Morocco'], ['Algérie', 'Argelia', 'Algeria'], ['Tunisie', 'Túnez', 'Tunisia'],
    ['Sénégal', 'Senegal', 'Senegal'], ['Côte d’Ivoire', 'Costa de Marfil', 'Côte d’Ivoire'], ['La Réunion / Mayotte', 'La Reunión / Mayotte', 'Réunion / Mayotte'],
    ['Guadeloupe', 'Guadalupe', 'Guadeloupe'], ['Martinique', 'Martinica', 'Martinique'], ['Guyane', 'Guayana Francesa', 'French Guiana'],
    ['Nouvelle-Calédonie', 'Nueva Caledonia', 'New Caledonia'], ['Polynésie française', 'Polinesia Francesa', 'French Polynesia'],
  ];

  // Habitudes utilisées dans « D'après sa forme, … »
  const HAB = [
    ['carbure au café', 'funciona a base de café', 'runs on coffee'], ['fait la grasse matinée', 'duerme hasta tarde', 'sleeps in'],
    ['enchaîne les séries', 'encadena series', 'binge-watches'], ['cuisine sans recette', 'cocina sin receta', 'cooks without a recipe'],
    ['ouvre la piste de danse', 'abre la pista de baile', 'opens the dance floor'], ['envoie des vocaux interminables', 'manda audios eternos', 'sends endless voice notes'],
    ['ne rate jamais une séance de sport', 'nunca se salta un entrenamiento', 'never misses a workout'], ['part sur un coup de tête', 'se va por impulso', 'leaves on a whim'],
    ['vit dans une jungle de plantes', 'vive en una jungla de plantas', 'lives in a jungle of plants'], ['a une chanson signature au karaoké', 'tiene su canción estrella en el karaoke', 'has a karaoke signature song'],
    ['salue chaque chien croisé', 'saluda a cada perro que se cruza', 'greets every dog they pass'], ['voit souvent le soleil se lever', 'suele ver salir el sol', 'often sees the sunrise'],
    ['ne boit jamais de café', 'nunca toma café', 'never drinks coffee'], ['se lève avant le soleil', 'se levanta antes que el sol', 'gets up before the sun'],
    ['regarde un épisode puis dort', 've un episodio y a dormir', 'watches one episode, then sleeps'], ['rate ses pâtes à chaque fois', 'siempre se le pasa la pasta', 'ruins the pasta every time'],
    ['reste près du mur en soirée', 'se queda junto a la pared en las fiestas', 'sticks to the wall at parties'], ['préfère écrire que parler', 'prefiere escribir a hablar', 'prefers typing to talking'],
    ['court surtout après le bus', 'sobre todo corre detrás del autobús', 'mostly runs after the bus'], ['réserve six mois à l’avance', 'reserva con seis meses de antelación', 'books six months ahead'],
    ['a tué même le cactus', 'ha matado hasta el cactus', 'killed even the cactus'], ['fuit le karaoké', 'huye del karaoke', 'avoids karaoke'],
    ['passe son chemin devant les chiens', 'pasa de largo ante los perros', 'walks past dogs'], ['rentre avant minuit', 'vuelve antes de medianoche', 'is home before midnight'],
  ];
  const MONTHS = {
    janvier: ['enero', 'January'], février: ['febrero', 'February'], mars: ['marzo', 'March'], avril: ['abril', 'April'], mai: ['mayo', 'May'], juin: ['junio', 'June'],
    juillet: ['julio', 'July'], août: ['agosto', 'August'], septembre: ['septiembre', 'September'], octobre: ['octubre', 'October'], novembre: ['noviembre', 'November'], décembre: ['diciembre', 'December'],
  };

  const idx = () => (lang === 'es' ? 1 : 2);
  const dict = new Map();
  for (const row of T.concat(HAB)) dict.set(row[0], row);
  const tr = (s) => { const r = dict.get(s); return r ? r[idx()] : null; };
  const month = (s) => s.replace(/(\d+) (janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)( \d{4})?/gi,
    (m, d, mo, y) => { const M = MONTHS[mo.toLowerCase()]; const up = mo === mo.toUpperCase(); let out = lang === 'es' ? d + ' de ' + M[0] + (y ? ' de' + y : '') : M[1] + ' ' + d + (y ? ',' + y : ''); return up ? out.toUpperCase() : out; });
  const habits = (list) => {
    const parts = list.split(/, | et /).map((h) => tr(h) || h);
    const and = lang === 'es' ? ' y ' : ' and ';
    return parts.length > 1 ? parts.slice(0, -1).join(', ') + and + parts[parts.length - 1] : parts[0];
  };
  const L = (es, en) => (lang === 'es' ? es : en);

  // Textes composés : [motif, fonction(match) → traduction]
  const RULES = [
    [/^BONJOUR (.+?)( · VÉRIFIÉ)?$/, (m) => L('HOLA ', 'HELLO ') + m[1] + (m[2] ? L(' · VERIFICADO', ' · VERIFIED') : '')],
    [/^À ([\d,]+) (M|KM) DE TOI$/, (m) => L('A ' + m[1] + ' ' + m[2] + ' DE TI', m[1] + ' ' + m[2] + ' FROM YOU')],
    [/^(\d\d:\d\d) · (.+)$/, (m) => m[1] + ' · ' + (tr(m[2]) || m[2])],
    [/^Verrouillée jusqu’au (.+?)\. Une empreinte, c’est un engagement : une modification par mois\.$/,
      (m) => L('Bloqueada hasta el ' + month(m[1]) + '. Una huella es un compromiso: un cambio al mes.', 'Locked until ' + month(m[1]) + '. A print is a commitment: one edit a month.')],
    [/^RÉVÉLATION ·(.*)$/, (m) => L('REVELACIÓN ·', 'REVEAL ·') + m[1]],
    [/^NÉ·E LE (.+)$/, (m) => L('NACIDO/A EL ', 'BORN ON ') + month(m[1])],
    [/^BLOQUÉ·E LE (.+)$/, (m) => L('BLOQUEADO/A EL ', 'BLOCKED ON ') + month(m[1])],
    [/^(.+), (\d+) ANS$/, (m) => m[1] + ', ' + m[2] + L(' AÑOS', '')],
    [/^(.+), (\d+) ans$/, (m) => m[1] + ', ' + m[2] + L(' años', '')],
    [/^(\d+) POINTS$/, (m) => m[1] + L(' PUNTOS', ' POINTS')],
    [/^Signaler (.+)$/, (m) => L('Denunciar a ', 'Report ') + m[1]],
    [/^SMS PRÊT POUR (.+)$/, (m) => L('SMS LISTO PARA ', 'TEXT READY FOR ') + m[1]],
    [/^On prévient (.+)\.$/, (m) => L('Avisamos a ' + m[1] + '.', 'Alerting ' + m[1] + '.')],
    [/^ALERTE · (.+)$/, (m) => L('ALERTA · ', 'ALERT · ') + m[1]],
    [/^APPELER (.+)$/, (m) => L('LLAMAR A ', 'CALL ') + m[1]],
    [/^CONTACT · (.*)$/, (m) => L('CONTACTO · ', 'CONTACT · ') + m[1]],
    [/^Un SMS discret à (.+) : il t’appelle avec une excuse\.$/, (m) => L('Un SMS discreto a ' + m[1] + ': te llama con una excusa.', 'A discreet text to ' + m[1] + ': they call you with an excuse.')],
    [/^SMS avec ta position, puis appel direct à (.+)\.$/, (m) => L('SMS con tu ubicación y luego llamada directa a ' + m[1] + '.', 'Text with your location, then a direct call to ' + m[1] + '.')],
    [/^D’après sa forme, (\S+) (.+)\.$/, (m) => L('Según su forma, ' + m[1] + ' ' + habits(m[2]) + '.', 'Judging by their shape, ' + m[1] + ' ' + habits(m[2]) + '.')],
    [/^Forme équilibrée : (.+) fait un peu de tout, sans excès\.$/, (m) => L('Forma equilibrada: ' + m[1] + ' hace un poco de todo, sin excesos.', 'Balanced shape: ' + m[1] + ' does a bit of everything, nothing extreme.')],
    [/^Le Kiosque · Plaza Mayor · depuis (\d+) min$/, (m) => L('Le Kiosque · Plaza Mayor · desde hace ' + m[1] + ' min', 'Le Kiosque · Plaza Mayor · for ' + m[1] + ' min')],
    [/^(\S+)\s+(\+\d+)\s+(.+)$/, (m) => (dict.has(m[3]) ? m[1] + '  ' + m[2] + '  ' + tr(m[3]) : null)],
  ];

  // Traduit un texte (null si rien à faire). Plusieurs phrases connues à la suite sont traduites une à une.
  function translate(s) {
    if (!lang || lang === 'fr') return null;
    const t = s.trim(); if (!t) return null;
    let out = tr(t);
    if (out == null) for (const [re, fn] of RULES) { const m = t.match(re); if (m) { out = fn(m); if (out != null) break; } }
    if (out == null && /[.!?…]\s/.test(t)) {
      // Texte composé de plusieurs phrases connues (une entrée du dictionnaire peut en contenir plusieurs).
      const parts = t.split(/(?<=[.!?…])\s+/), best = [[]];
      for (let i = 1; i <= parts.length; i++) {
        for (let j = i - 1; j >= 0; j--) {
          if (!best[j]) continue;
          const x = tr(parts.slice(j, i).join(' '));
          if (x != null) { best[i] = best[j].concat(x); break; }
        }
      }
      if (best[parts.length]) out = best[parts.length].join(' ');
    }
    if (out == null) return null;
    return s.replace(t, out); // garde les espaces autour
  }

  // ── Application à l'écran ──────────────────────────────────────────────
  const ATTRS = ['placeholder', 'aria-label'];
  // Mémorise ce qu'on a écrit dans chaque nœud : un texte déjà traduit n'est jamais retraduit
  // (« NOMBRE », traduction de « PRÉNOM », est aussi un mot français).
  const mine = new WeakMap();
  function fixText(c) {
    if (mine.get(c) === c.nodeValue) return;
    const v = translate(c.nodeValue); if (v != null && v !== c.nodeValue) { c.nodeValue = v; mine.set(c, v); }
  }
  function fixAttrs(c) {
    for (const a of ATTRS) if (c.hasAttribute(a)) {
      const cur = c.getAttribute(a), k = a + '|'; const seen = mine.get(c) || {};
      if (seen[k] === cur) continue;
      const v = translate(cur); if (v != null && v !== cur) { c.setAttribute(a, v); seen[k] = v; mine.set(c, seen); }
    }
  }
  function fixNode(n) {
    if (n.nodeType === 3) {
      const p = n.parentNode; if (!p || p.closest && p.closest('#clove-lang,#clove-cover,script,style')) return;
      fixText(n);
    } else if (n.nodeType === 1) {
      if (n.closest('#clove-lang,#clove-cover') || n.tagName === 'SCRIPT' || n.tagName === 'STYLE') return;
      fixAttrs(n);
      const w = document.createTreeWalker(n, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT); let c;
      while ((c = w.nextNode())) { if (c.nodeType === 3) fixText(c); else fixAttrs(c); }
    }
  }

  let observed = null;
  const obs = new MutationObserver((list) => {
    for (const m of list) {
      if (m.type === 'characterData') fixNode(m.target);
      else if (m.type === 'attributes') fixNode(m.target);
      else m.addedNodes.forEach(fixNode);
    }
  });
  function watch() {
    if (!lang || lang === 'fr' || !document.body) return;
    if (observed !== document.documentElement) { // le chargeur de index.html remplace le document
      obs.disconnect(); observed = document.documentElement;
      obs.observe(observed, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
      fixNode(document.body);
    }
    if (document.documentElement.lang !== lang) document.documentElement.lang = lang;
  }

  // ── Page de choix de la langue ─────────────────────────────────────────
  const CHOICES = [
    ['fr', 'FRANÇAIS', 'Continuer en français', '#E24B0B', '#fff'],
    ['es', 'ESPAÑOL', 'Continuar en español', '#123C96', '#fff'],
    ['en', 'ENGLISH', 'Continue in English', '#0F6B60', '#fff'],
  ];
  function picker(reload) {
    if (document.getElementById('clove-lang')) return;
    const box = document.createElement('div'); box.id = 'clove-lang';
    box.style.cssText = 'position:fixed;inset:0;z-index:2147483646;background:#F4F0E8;color:#10182E;display:flex;flex-direction:column;font-family:Archivo,system-ui,sans-serif;overflow:hidden;touch-action:none';
    box.innerHTML =
      '<div style="display:grid;grid-template-columns:1.4fr .5fr 1fr .7fr;gap:5px;height:calc(84px + env(safe-area-inset-top,0px));background:#10182E;padding-bottom:5px">' +
      '<span style="background:#E24B0B"></span><span style="background:#F4F0E8"></span><span style="background:#123C96"></span><span style="background:#EFE4CE"></span></div>' +
      '<div style="flex:1;display:flex;flex-direction:column;gap:14px;padding:28px 22px calc(28px + env(safe-area-inset-bottom,0px))">' +
      '<span style="align-self:flex-start;padding:4px 8px;background:#10182E;color:#F4F0E8;font:700 10px \'IBM Plex Mono\',monospace;letter-spacing:.2em;transform:rotate(-1deg)">CLOVE</span>' +
      '<h1 style="margin:0;font:900 52px/.86 Archivo,sans-serif;letter-spacing:-.06em">LANGUE<br><span style="color:#123C96">IDIOMA</span><br><span style="color:#E24B0B">LANGUAGE</span></h1>' +
      '<div style="flex:1;min-height:12px"></div>' +
      CHOICES.map(([k, name, sub, bg, fg], i) =>
        '<button data-lang="' + k + '" style="display:grid;grid-template-columns:1fr 46px;text-align:left;padding:0;background:' + bg + ';color:' + fg + ';border:3px solid #10182E;box-shadow:4px 4px 0 #10182E;cursor:pointer;transform:rotate(' + ['-.6', '.5', '-.4'][i] + 'deg)">' +
        '<span style="display:block;padding:14px 16px"><span style="display:block;font:900 26px/1 Archivo,sans-serif;letter-spacing:-.03em">' + name + '</span>' +
        '<span style="display:block;margin-top:4px;font:600 13px Archivo,sans-serif;opacity:.9">' + sub + '</span></span>' +
        '<span style="display:flex;align-items:center;justify-content:center;background:#10182E;color:#F4F0E8;font:900 20px Archivo,sans-serif">→</span></button>').join('') +
      '</div>';
    box.addEventListener('click', (e) => {
      const b = e.target.closest('[data-lang]'); if (!b) return;
      const was = lang; lang = b.getAttribute('data-lang'); store.set(lang);
      if (reload && was !== lang) { location.reload(); return; }
      box.remove(); watch();
    });
    document.body.appendChild(box);
  }

  window.CloveI18n = {
    get lang() { return lang || 'fr'; },
    locale() { return { fr: 'fr-FR', es: 'es-ES', en: 'en-GB' }[lang || 'fr']; },
    t: (s) => translate(s) || s,
    open: () => picker(true),
  };

  // Au premier lancement : la page de choix, dès que l'app est affichée.
  setInterval(() => {
    watch();
    if (!lang && document.body && document.querySelector('[data-screen-label]')) picker(false);
  }, 60);
})();
