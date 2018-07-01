'use strict';

self.importScripts('serviceworker-cache-polyfill.js');

var cacheName = 'CurrencyConverterPWA-v1';
var dataCacheName = 'CurrencyConverterData-v1';

var filesToCache = ['/CurrencyConverter/', '/CurrencyConverter/index.html', '/CurrencyConverter/js/app.js', '/CurrencyConverter/css/style.css', '/CurrencyConverter/css/icons/exchange.svg'];

/**
 * When SW is installed : cache all files
 */
self.addEventListener('install', function (e) {
    console.log('[ServiceWorker] Install');
    e.waitUntil(caches.open(cacheName).then(function (cache) {
        console.log('[ServiceWorker] Caching app shell');
        return cache.addAll(filesToCache);
    }));
});

/**
 * When SW activated : Delete old caches
 */
self.addEventListener('activate', function (e) {
    // console.log('[ServiceWorker] Activate');
    e.waitUntil(caches.keys().then(function (keyList) {
        return Promise.all(keyList.map(function (key) {
            if (key !== cacheName && key !== dataCacheName) {
                // console.log('[ServiceWorker] Removing old cache', key);
                return caches.delete(key);
            }
        }));
    }));
    return self.clients.claim();
});

/**
 * Intercept request to cache correspondence url data
 * Intercept request to response with cached data
 */
self.addEventListener('fetch', function (e) {
    // console.log('[Service Worker] Fetch', e.request.url);
    var dataUrl = 'https://free.currencyconverterapi.com/api/v5';
    if (e.request.url.indexOf(dataUrl) > -1) {

        // console.log('[Service Worker] Fetch ', e.request.url);

        e.respondWith(caches.open(dataCacheName).then(function (cache) {
            return fetch(e.request).then(function (response) {
                cache.put(e.request.url, response.clone());
                return response;
            });
        }));
    } else {

        // console.log('[Service Worker] Fetch ', e.request.url);

        e.respondWith(caches.match(e.request).then(function (response) {
            return response || fetch(e.request);
        }));
    }
});

// listen for the "message" event, and call
// skipWaiting if you get the appropriate message
self.addEventListener('message', function (event) {

    if (event.data.action == 'skipWaiting') {
        undefined.self.skipWaiting();
    }
});
