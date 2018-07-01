(() => {
    'use strict';

    // Declare variables app
    const app = {
        isLoading    : true,
        allCurrencies: [],
        fromCurrency  : document.getElementById('fromCurrency'),
        toCurrency    : document.getElementById('toCurrency'),
        fromSymbol    : document.getElementById('fromSymbol'),
        toSymbol      : document.getElementById('toSymbol'),
        fromAmount    : document.getElementById('fromAmount'),
        toAmount      : document.getElementById('toAmount'),
        convert       : document.getElementById('convert'),
        switchCurrency: document.getElementById('switchCurrency'),
        message       : document.getElementById('message'),
        spinner       : document.querySelector('.loader'),
        container     : document.querySelector('.main')
    }

    const cc = new CurrencyConverter(app)
    cc.fillListsCurrencies()

    app.convert.addEventListener('click', cc.convert.bind(cc));
    app.switchCurrency.addEventListener('click', cc.switchCurrency.bind(cc));

    // EventListener on change list currency : from and to
    app.fromCurrency.addEventListener('change', cc.changeCurrency.bind(cc));
    app.toCurrency.addEventListener('change', cc.changeCurrency.bind(cc));

})(); 