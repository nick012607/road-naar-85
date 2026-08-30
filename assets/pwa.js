/* Registreert de service worker zodat de pagina offline werkt en als
   app op het beginscherm gezet kan worden. */
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
          navigator.serviceWorker.register('./sw.js').catch(() => {
                  /* geen probleem als dit faalt, de pagina werkt gewoon door */
          });
    });
}
