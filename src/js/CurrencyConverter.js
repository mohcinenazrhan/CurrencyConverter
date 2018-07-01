class CurrencyConverter {

    constructor (app) {
        this._container    = app.container
        this._fromCurrency = app.fromCurrency
        this._toCurrency   = app.toCurrency
        this._isLoading    = app.isLoading
        this._spinner      = app.spinner
        this._fromSymbol   = app.fromSymbol
        this._toSymbol     = app.toSymbol
        this._convertBtn   = app.convert
        this._fromAmount   = app.fromAmount
        this._toAmount     = app.toAmount
        this._message      = app.message
        this._refreshing   = false
        this._dbPromise    = this.openIdbStore();
        this.serviceWorkerRegistration();
    }

    /** 
     * Create store in IndexedDb using idb library
     */
    openIdbStore() {
        return idb.open('CurrencyConverter-store', 1, upgradeDB => {
            upgradeDB.createObjectStore('selectedCurrency');
            upgradeDB.createObjectStore('currencyList', {
                keyPath: 'currencyId'
            });
        })
    }

    /**
     * Service worker registration & Update Process
     */
    serviceWorkerRegistration () {
        if (!navigator.serviceWorker) return;

        const CurrencyConverter = this;

        // listen for the controlling service worker changing
        // and reload the page
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (this._refreshing) return;

            window.location.reload();
            this._refreshing = true;
        })

        navigator.serviceWorker
            .register('./service-worker.js')
            .then( (reg) => {
                console.log('Service Worker Registered');

                // if there's no controller, this page wasn't loaded
                // via a service worker, so they're looking at the latest version.
                // In that case, exit early
                if (!navigator.serviceWorker.controller) return;

                // if there's an updated worker already waiting, call
                // CurrencyConverter._updateReady()
                if (reg.waiting) {
                    CurrencyConverter._updateReady();
                    return;
                }

                // if there's an updated worker installing, track its
                // progress. If it becomes "installed", call
                // CurrencyConverter._updateReady()
                if (reg.installing) {
                    indexController.trackingprogressInstalled(reg.installing);
                    return;
                }

                // otherwise, listen for new installing workers arriving.
                // If one arrives, track its progress.
                // If it becomes "installed", call
                // CurrencyConverter._updateReady()
                reg.addEventListener('updatefound', () => {
                    CurrencyConverter.trackingprogressInstalled(reg.installing);
                });

            })
            .catch(error => console.log("Service worker not registered: ", error));
    }
    
    /**
     * Update notification Service Worker
     * @param {Object} worker 
     */
    updateReady(worker) {
        const ok = confirm("New version available online. Do you want to update? ");
        if (ok) {
            worker.postMessage({ action: 'skipWaiting' });
        };
    }

    /**
     * Update notification & Traking Service Worker
     * @param {Object} worker 
     */
    trackingprogressInstalled(worker) {
        const CurrencyConverter = this;
        worker.addEventListener('statechange', () => {
            if (worker.state == 'installed') {
                CurrencyConverter.updateReady(worker);
            }
        });
    }

    /**
     * Return array
     * Get List of all currencies: from cache or network => offline first
     */
    getAllCurrencies () {

        let url = 'https://free.currencyconverterapi.com/api/v5/countries'

        return this.getAllCurrenciesCache(url).then(res => {
            if (res === false) {
                return this.getAllCurrenciesNetwork(url)
            } else
                return res
        })
        .then(res => res.json())
        .then(data => {
            let currencies = []
            for (const key in data.results) {
                currencies.push(data.results[key])
            }
            return currencies
        }).then((arr) => {
            // Sort and prepare list select options
            // Get unique currency & avoid duplication : like U.S. Dollar
            let last = ''
            return arr.sort((c1, c2) => c1.currencyName > c2.currencyName ? 1 : -1)
                        .filter((row) => {
                            const lastcurrency = last
                                  last         = row.currencyName
                            if (row.currencyName != lastcurrency) return row
                        })
        })

    }

    /**
     * 
     * @param {String} url 
     */
    getAllCurrenciesCache (url) {
        if ('caches' in window) {
            return caches.match(url)
                .then((response) => {
                    return response || false
                }).catch(() =>
                    {
                        console.log("error cache");
                        return false
                    }
                )
        } else return false
    }

    /**
     * 
     * @param {String} url 
     */
    getAllCurrenciesNetwork (url) {
        return fetch(url)
            .then(res => {
                return res
            })
            .catch((error) =>
                console.log("error network", error)
            )
    }

    /**
     * Get currency list from Db
     */
    getCurrencyListDB () {
        return this._dbPromise.then(db => {
            if (!db) return false;
            const tx    = db.transaction('currencyList');
            const store = tx.objectStore('currencyList');
            return store.getAll().then(currencyList => {
                if(currencyList.length === 0) return false
                return currencyList;
            }).catch(() => false);
        }).catch(error => {
            console.log('db error: ', error);
            return false;
        });
    }

    /**
     * Set currency list to Db
     * @param {*} data 
     */
    setCurrencyListDB(data) {
        if (!data) {
            console.log('Data is undefined to be stored');
            return;
        }

        data.then((rows) =>{
            this._dbPromise.then(db => {
                if (!db) return;

                const tx    = db.transaction('currencyList', 'readwrite');
                const store = tx.objectStore('currencyList');
                for (const row of rows) {
                    store.put(row);                    
                }
            }).catch(error => console.log('idb error: ', error));
                 
        })
        
    }

    /**
     * Set Symbols Currency to Lists
     */
    setSymbolCurrency () {

        let from = this._fromCurrency
        let to = this._toCurrency
        from = from.options[from.selectedIndex].value
        to = to.options[to.selectedIndex].value
        
        this._dbPromise.then(db => {
            if (!db) return;
            const tx = db.transaction('currencyList')
            const store = tx.objectStore('currencyList')

            store.get(from).then((val) => {
                this._fromSymbol.innerHTML = val.currencySymbol
            })

            store.get(to).then((val) => {
                this._toSymbol.innerHTML = val.currencySymbol
            })
            
        }).catch(error => {
            console.log('idb error ', error);
        })
    }

    /**
    * Fill list select option of all currencies
    */
    fillListsCurrencies() {

        return this.getCurrencyListDB().then(res => {
            if (!res) {
                const data = this.getAllCurrencies()
                this.setCurrencyListDB(data)
                return data
            } else return res
        }).then((results) => { 
            let contentListOptions = ''
            results.forEach(row => {
                contentListOptions += `<option value="${row.currencyId}">${row.currencyName} | ${row.currencyId} (${row.currencySymbol})</option>`
            })
            
            // Fill lists select options of currencies 
            this._fromCurrency.innerHTML = contentListOptions
            this._toCurrency.innerHTML = contentListOptions

        }).then(() => {

            // Get last currency selected and then convert
            return this._dbPromise.then(db => {
                if (!db) return false;
                let tx     = db.transaction('selectedCurrency')
                let keyVal = tx.objectStore('selectedCurrency')
                return keyVal.get('lastSelect')
            })

        })
        .then((val) => {
            if (val) {
                this._fromCurrency.value = val.from
                this._toCurrency.value = val.to
                this.setSymbolCurrency()
                this.convert()
                return
            }

            let from = this._fromCurrency
            let to = this._toCurrency
            from = from.options[from.selectedIndex].value
            to = to.options[to.selectedIndex].value
            this.setSymbolCurrency()
            this.convert()
        })
        .then(() => {
            // When all is loaded display container & hide spinner
            if (this._isLoading) {
                this._spinner.setAttribute('hidden', true);
                this._container.removeAttribute('hidden');
                this._isLoading = false;
            }
        })
    }

    /**
     * Save last selected currency converted.
     * @param {String} from // LIKE 'USD'
     * @param {String} to // LIKE 'MAD'
     */
    saveSelectedCurrency (from, to) {
        this._dbPromise.then(db => {
            if (!db) return;
            const tx = db.transaction('selectedCurrency', 'readwrite');
            tx.objectStore('selectedCurrency').put({
                'from': from,
                'to'  : to
            }, 'lastSelect');
            return tx.complete;
        });
    }

    /**
     * Set Converted Value to input
     * @param {Number} val 
     * @param {Number} amount
     */
    setConvertedValue (val, amount) {
        this._toAmount.value    = val !== '' && val !== undefined ? (val * amount).toFixed(6) : ''
        this._convertBtn.innerHTML = 'Convert'
    }

    /**
     * Store value of Currencies converted to db for offline
     * @param {*} data 
     */
    setSelectedCurrenciesdb (data) {
        return this._dbPromise.then(db => {
            if (!db) return false;
            const tx = db.transaction('selectedCurrency', 'readwrite');
            for (const key in data) {
                tx.objectStore('selectedCurrency').put({
                    'val': data[key].val,
                }, key);
            }
        }).catch(error => {
            console.log('idb error ', error);
        })
    }

    /**
     * Convert currency: EventListener of click
     */
    convert () {

        this._convertBtn.innerHTML = 'Converting...'
        
        let from = this._fromCurrency
        let to = this._toCurrency
            from = from.options[from.selectedIndex].value
            to   = to.options[to.selectedIndex].value

        this.saveSelectedCurrency(from, to)

        let amount = this._fromAmount.value
        let fromTo = `${from}_${to}`
        let toFrom = `${to}_${from}`

        // Optimize calculate by avoid 
        if (fromTo === toFrom) {
            this.setConvertedValue(1, amount)
            return
        }

        const qurey = `https://free.currencyconverterapi.com/api/v5/convert?q=${fromTo},${toFrom}`
        
        let stateValueDb = true
        // First get value from indexedDb : offline first
        this._dbPromise.then(db => {
            if (!db) return false;
            let tx     = db.transaction('selectedCurrency')
            let keyVal = tx.objectStore('selectedCurrency')
            return keyVal.get(fromTo)
        }).then((change) => {
            if (change === undefined) {
                stateValueDb = false
                return
            }

            console.log('Get value currency from idb');
            this.setConvertedValue(change.val, amount)
        }).then(()=> {
            if (stateValueDb)
                this._message.innerHTML = "Value from cache. Go online and update."
            else if (!stateValueDb)
                this._message.innerHTML = "Value not available in cache. Go online and refresh."
        }).catch(error => {
            console.log(error);
            stateValueDb = null
        })

        // And Get value from network and update or set value in Db
        fetch(qurey)
            .then(res => res.json())
            .then(data => {
                // set updated currencies to idb
                this.setSelectedCurrenciesdb(data.results)
                return data.results[fromTo]
            })
            .then((change) => {
                    console.log('Get & update idb value currency from network');
                    this._message.innerHTML = ""
                    this.setConvertedValue(change.val, amount)
            }).catch(error => {
                console.log(error);
                this._convertBtn.innerHTML = 'Convert'
                this._message.innerHTML = "Go online and refresh."
            })
    }

    /**
     * Switch currency & convert
     */
    switchCurrency () {

        const fromList = this._fromCurrency
        const toList = this._toCurrency
        const from = fromList.options[fromList.selectedIndex].value
        const to = toList.options[toList.selectedIndex].value
        
        fromList.value = to
        toList.value = from
        
        this.setSymbolCurrency()

        this.convert()
    }

    /**
     * ON change currency selected
     */
    changeCurrency () {

        const fromList = this._fromCurrency
        const toList = this._toCurrency
        const from = fromList.options[fromList.selectedIndex].value
        const to = toList.options[toList.selectedIndex].value

        this.setSymbolCurrency()

        let amount = this._fromAmount.value
        let fromTo = `${from}_${to}`
        let toFrom = `${to}_${from}`

        // Optimize calculate by avoid 
        if (fromTo === toFrom) {
            this.setConvertedValue(1, amount)
            return
        }

        // Get value from IndexedDb & Tell user to update value
        this._dbPromise.then(db => {
            if (!db) return false;
            let tx = db.transaction('selectedCurrency')
            let keyVal = tx.objectStore('selectedCurrency')
            return keyVal.get(fromTo)
        }).then((change) => {
            const val = change ? change.val : ''
            this.setConvertedValue(val, amount)
            if (val != '') this._convertBtn.innerHTML = 'Update'
        }).catch(error => {
            console.log(error);
        });
    }
}