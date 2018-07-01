self.importScripts('serviceworker-cache-polyfill.js');

const cacheName = 'CurrencyConverterPWA-v1';
const dataCacheName = 'CurrencyConverterData-v1';

const filesToCache = [
    '/',
    '/index.html',
    '/js/app.js',
    '/css/style.css',
    '/css/icons/exchange.svg'
];

/**
 * When SW is installed : cache all files
 */
self.addEventListener('install', (e) => {
    console.log('[ServiceWorker] Install');
    e.waitUntil(
        caches.open(cacheName).then( (cache) => {
            console.log('[ServiceWorker] Caching app shell');
            return cache.addAll(filesToCache);
        })
    );
});

/**
 * When SW activated : Delete old caches
 */
self.addEventListener('activate', (e) => {
    // console.log('[ServiceWorker] Activate');
    e.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map( (key) => {
                if (key !== cacheName && key !== dataCacheName) {
                    // console.log('[ServiceWorker] Removing old cache', key);
                    return caches.delete(key);
                }
            }));
        })
    );
    return self.clients.claim();
});

/**
 * Intercept request to cache correspondence url data
 * Intercept request to response with cached data
 */
self.addEventListener('fetch', (e) => {
    // console.log('[Service Worker] Fetch', e.request.url);
    var dataUrl = 'https://free.currencyconverterapi.com/api/v5';
    if (e.request.url.indexOf(dataUrl) > -1) {

    // console.log('[Service Worker] Fetch ', e.request.url);

        e.respondWith(
            caches.open(dataCacheName).then( (cache) => {
                return fetch(e.request).then( (response) => {
                    cache.put(e.request.url, response.clone());
                    return response;
                });
            })
        );
    } else {

        // console.log('[Service Worker] Fetch ', e.request.url);
        
        e.respondWith(
            caches.match(e.request).then( (response) => {
                return response || fetch(e.request);
            })
        );
    }
});

// listen for the "message" event, and call
// skipWaiting if you get the appropriate message
self.addEventListener('message', (event) => {

    if (event.data.action == 'skipWaiting') {
        this.self.skipWaiting();
    }
})