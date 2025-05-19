
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';

// IMPORTANTE: Configuración de Firebase
// -----------------------------------------
// ESTA ES LA FUENTE MÁS COMÚN DE ERRORES DE AUTENTICACIÓN.
// Para usar los servicios de Firebase, DEBES configurar este archivo con las credenciales
// de tu proyecto de Firebase creando un archivo `.env.local`.
//
// 1. Ve a la consola de Firebase (https://console.firebase.google.com/).
// 2. Crea un nuevo proyecto de Firebase o selecciona uno existente.
// 3. En tu proyecto, ve a Configuración del proyecto (haz clic en el icono de engranaje).
// 4. Desplázate hacia abajo hasta "Tus apps" y haz clic en el icono "Web" (</>) para agregar una aplicación web
//    o selecciona una aplicación web existente.
// 5. Firebase te proporcionará un objeto `firebaseConfig` que contiene tus credenciales.
//
// 6. **CREA UN ARCHIVO `.env.local`**:
//    En el directorio RAÍZ de tu proyecto Next.js (la misma carpeta que `package.json`),
//    crea un nuevo archivo llamado exactamente `.env.local`.
//
// 7. **AGREGA TU CONFIGURACIÓN DE FIREBASE A `.env.local`**:
//    Copia las siguientes líneas en tu archivo `.env.local` y reemplaza
//    los valores de marcador de posición con TUS CREDENCIALES REALES
//    del proyecto de Firebase. Asegúrate de no tener errores tipográficos.
//
//    Ejemplo de contenido del archivo `.env.local`:
      const NEXT_PUBLIC_FIREBASE_API_KEY="AIzaSyDGu5EyKdGkfWpJx_Jm2wpsXr9DhwaLK10"
      const NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="firebase-uid-for-alexis.firebaseapp.com"
      const NEXT_PUBLIC_FIREBASE_PROJECT_ID="firebase-uid-for-alexis"
      const NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="firebase-uid-for-alexis.appspot.com"
    //  const NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=TU_SENDER_ID_AQUI
      const NEXT_PUBLIC_FIREBASE_APP_ID="firebase-uid-for-alexis"
//    const NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=TU_MEASUREMENT_ID_AQUI (opcional)
//
// 8. **GUARDA EL ARCHIVO `.env.local`.**
//
// 9. **REINICIA TU SERVIDOR DE DESARROLLO**:
// Detén tu servidor de desarrollo Next.js (por ejemplo, Ctrl+C en la terminal)
// y reinícialo (por ejemplo, `npm run dev` o `yarn dev`). Esto es crucial
//    para que Next.js cargue las nuevas variables de entorno.
//
// La aplicación NO FUNCIONARÁ CORRECTAMENTE y verás errores si estas variables faltan o son incorrectas.

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID, // Opcional
};

// Registrar la configuración cargada para depuración.
// En un entorno de producción, considera no registrar la apiKey directamente o enmascararla.
console.log("Firebase Configuration Loaded:", {
  apiKey: firebaseConfig.apiKey ? '********' : 'MISSING_OR_EMPTY', // Enmascarar API key
  authDomain: firebaseConfig.authDomain || 'MISSING_OR_EMPTY',
  projectId: firebaseConfig.projectId || 'MISSING_OR_EMPTY',
  storageBucket: firebaseConfig.storageBucket || 'OPTIONAL_OR_MISSING',
  messagingSenderId: firebaseConfig.messagingSenderId || 'OPTIONAL_OR_MISSING',
  appId: firebaseConfig.appId || 'OPTIONAL_OR_MISSING',
  measurementId: firebaseConfig.measurementId || 'OPTIONAL_OR_MISSING',
});

// Verificar si las variables de entorno críticas están ausentes.
if (!firebaseConfig.apiKey) {
  const errorMessage =
    'ERROR CRÍTICO DE CONFIGURACIÓN DE FIREBASE: NEXT_PUBLIC_FIREBASE_API_KEY está ausente. \n' +
    'Esta variable de entorno es esencial para que Firebase funcione.\n' +
    '1. Asegúrate de tener un archivo `.env.local` en la raíz de tu proyecto.\n' +
    '2. Asegúrate de que NEXT_PUBLIC_FIREBASE_API_KEY=TU_API_KEY_REAL esté configurada correctamente en este archivo.\n' +
    '3. IMPORTANTE: DEBES reiniciar tu servidor de desarrollo Next.js (por ejemplo, ejecutando `npm run dev` o `yarn dev` nuevamente) después de crear o modificar el archivo `.env.local` para que los cambios surtan efecto.\n' +
    'Consulta las instrucciones de configuración detalladas en los comentarios al inicio de `src/lib/firebase.ts`.\n' +
    'LA APLICACIÓN NO PUEDE INICIALIZAR FIREBASE SIN ESTA CLAVE.';
  console.error(errorMessage);
  if (typeof window === 'undefined') { // Lado del servidor
     throw new Error(errorMessage);
  } else { // Lado del cliente
    alert(errorMessage); // Hacerlo muy obvio en el cliente también
    throw new Error(errorMessage); // Detener la ejecución del script del lado del cliente
  }
}


// Inicializar Firebase
let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
  console.log("Firebase app inicializada correctamente.");
} else {
  app = getApp();
  console.log("Firebase app ya estaba inicializada, obteniendo la instancia existente.");
}

// Obtener instancia de Auth
let authInstance: Auth;
try {
    authInstance = getAuth(app);
    console.log("Instancia de Firebase Auth obtenida correctamente.");
} catch (error: any) {
    console.error("Error detallado al obtener la instancia de Auth:", error);
    let userFriendlyMessage = 'Error al obtener la instancia de Auth de Firebase.\n' +
    '1. Verifica tu configuración de Firebase en `.env.local` (API Key, Auth Domain, Project ID).\n' +
    '2. Asegúrate de que Firebase Authentication esté HABILITADO en la Consola de Firebase (Authentication > Sign-in method).\n' +
    '3. Si hiciste cambios en `.env.local`, REINICIA tu servidor de desarrollo.\n\n';

    if (error.code === 'auth/invalid-api-key') {
        userFriendlyMessage += 'Error específico de Firebase: Clave API inválida (auth/invalid-api-key).\n';
    } else if (error.code === 'auth/configuration-not-found') {
        userFriendlyMessage += 'Error específico de Firebase: Configuración de autenticación no encontrada (auth/configuration-not-found).\n' +
        '   Esto usualmente significa:\n' +
        '   a) Firebase Authentication NO está habilitado en tu proyecto en la Firebase Console.\n' +
        '   b) El `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` en `.env.local` es incorrecto.\n';
    } else {
        userFriendlyMessage += `Mensaje de error original de Firebase: ${error.message} (Código: ${error.code || 'N/A'})\n`;
    }
    console.error("MENSAJE DETALLADO PARA EL USUARIO:", userFriendlyMessage);
    if (typeof window !== 'undefined') {
        alert(userFriendlyMessage);
    }
    // Lanzar un error para detener la ejecución si Auth no se pudo inicializar.
    // @ts-ignore: authInstance podría no estar asignada.
    if (!authInstance) {
        const criticalFailMessage = "Error crítico: La instancia de Firebase Auth no pudo ser inicializada. " + userFriendlyMessage;
        console.error(criticalFailMessage);
        throw new Error(criticalFailMessage);
    }
}

export { app, authInstance as auth };

