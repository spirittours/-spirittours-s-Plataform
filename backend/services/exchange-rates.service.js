/**
 * Exchange Rates Service
 * 
 * Servicio para gestionar tipos de cambio entre múltiples monedas.
 * Soporta actualización automática desde APIs externas y almacenamiento
 * en base de datos para uso offline y auditoría.
 * 
 * Características:
 * - Conversión multi-moneda con tipos de cambio históricos
 * - Integración con múltiples proveedores de tipos de cambio
 * - Cache en memoria para alto rendimiento
 * - Fallback a base de datos cuando API falla
 * - Soporte para tipos de cambio manuales
 * 
 * @module services/exchange-rates
 * @author Spirit Tours Dev Team - GenSpark AI Developer
 * @version 1.0.0
 */

const axios = require('axios');
const { Pool } = require('pg');

class ExchangeRatesService {
    constructor(dbPool, config = {}) {
        this.db = dbPool;
        this.config = {
            apiProvider: config.apiProvider || 'exchangerate_api', // exchangerate_api, fixer, openexchangerates
            apiKey: config.apiKey || process.env.EXCHANGE_RATE_API_KEY,
            baseCurrency: config.baseCurrency || 'USD',
            updateFrequency: config.updateFrequency || 'daily', // hourly, daily, weekly
            cacheDuration: config.cacheDuration || 3600000, // 1 hour in milliseconds
            fallbackToDb: config.fallbackToDb !== false, // Default true
            ...config
        };
        
        // Cache en memoria
        this.cache = new Map();
        this.lastUpdate = null;
        
        // Monedas soportadas por Spirit Tours
        this.supportedCurrencies = ['USD', 'MXN', 'AED', 'EUR', 'ILS', 'GBP', 'CAD'];
        
        // Proveedores de API disponibles
        this.apiProviders = {
            exchangerate_api: {
                url: 'https://api.exchangerate-api.com/v4/latest/{base}',
                requiresKey: false,
                rateLimit: 1500 // requests per month for free tier
            },
            fixer: {
                url: 'http://data.fixer.io/api/latest',
                requiresKey: true,
                rateLimit: 1000 // requests per month for free tier
            },
            openexchangerates: {
                url: 'https://openexchangerates.org/api/latest.json',
                requiresKey: true,
                rateLimit: 1000 // requests per month for free tier
            },
            currencyapi: {
                url: 'https://api.currencyapi.com/v3/latest',
                requiresKey: true,
                rateLimit: 300 // requests per month for free tier
            }
        };
    }

    /**
     * Obtiene el tipo de cambio entre dos monedas
     * @param {string} fromCurrency - Moneda origen (ISO 4217)
     * @param {string} toCurrency - Moneda destino (ISO 4217)
     * @param {Date} date - Fecha del tipo de cambio (default: hoy)
     * @returns {Promise<number>} Tipo de cambio
     */
    async getExchangeRate(fromCurrency, toCurrency, date = new Date()) {
        // Si las monedas son iguales, retornar 1
        if (fromCurrency === toCurrency) {
            return 1.0;
        }

        // Validar monedas
        this._validateCurrency(fromCurrency);
        this._validateCurrency(toCurrency);

        // Normalizar fecha (solo fecha, sin hora)
        const dateStr = this._formatDate(date);
        const cacheKey = `${fromCurrency}_${toCurrency}_${dateStr}`;

        // Verificar cache
        if (this._isCacheValid(cacheKey)) {
            return this.cache.get(cacheKey).rate;
        }

        // Si la fecha es hoy, intentar obtener desde API
        const isToday = this._isToday(date);
        if (isToday) {
            try {
                const rate = await this._fetchFromApi(fromCurrency, toCurrency);
                if (rate) {
                    // Guardar en cache y DB
                    this._setCache(cacheKey, rate);
                    await this._saveToDatabase(fromCurrency, toCurrency, rate, dateStr);
                    return rate;
                }
            } catch (error) {
                console.warn(`API fetch failed, falling back to database: ${error.message}`);
            }
        }

        // Fallback: obtener desde base de datos
        if (this.config.fallbackToDb) {
            const rate = await this._fetchFromDatabase(fromCurrency, toCurrency, dateStr);
            if (rate) {
                this._setCache(cacheKey, rate);
                return rate;
            }
        }

        throw new Error(`Exchange rate not found for ${fromCurrency} to ${toCurrency} on ${dateStr}`);
    }

    /**
     * Convierte un monto de una moneda a otra
     * @param {number} amount - Monto a convertir
     * @param {string} fromCurrency - Moneda origen
     * @param {string} toCurrency - Moneda destino
     * @param {Date} date - Fecha del tipo de cambio
     * @returns {Promise<Object>} Objeto con monto convertido y tipo de cambio usado
     */
    async convertCurrency(amount, fromCurrency, toCurrency, date = new Date()) {
        const rate = await this.getExchangeRate(fromCurrency, toCurrency, date);
        const convertedAmount = amount * rate;
        
        return {
            originalAmount: parseFloat(amount.toFixed(2)),
            originalCurrency: fromCurrency,
            convertedAmount: parseFloat(convertedAmount.toFixed(2)),
            convertedCurrency: toCurrency,
            exchangeRate: rate,
            date: this._formatDate(date)
        };
    }

    /**
     * Actualiza los tipos de cambio desde la API externa
     * @returns {Promise<Object>} Resultado de la actualización
     */
    async updateExchangeRates() {
        const startTime = Date.now();
        const results = {
            success: 0,
            failed: 0,
            errors: [],
            updatedAt: new Date().toISOString()
        };

        try {
            // Obtener tipos de cambio con USD como base
            const baseRates = await this._fetchRatesFromApi('USD');
            
            if (!baseRates) {
                throw new Error('Failed to fetch base rates from API');
            }

            // Guardar cada tipo de cambio en la base de datos
            for (const [currency, rate] of Object.entries(baseRates)) {
                if (!this.supportedCurrencies.includes(currency)) {
                    continue; // Skip unsupported currencies
                }

                try {
                    await this._saveToDatabase('USD', currency, rate);
                    results.success++;
                } catch (error) {
                    results.failed++;
                    results.errors.push({
                        pair: `USD/${currency}`,
                        error: error.message
                    });
                }
            }

            // Actualizar timestamp
            this.lastUpdate = new Date();
            
            // Limpiar cache para forzar recarga
            this.cache.clear();

            results.duration = Date.now() - startTime;
            console.log(`✅ Exchange rates updated: ${results.success} successful, ${results.failed} failed`);
            
            return results;
        } catch (error) {
            console.error('❌ Failed to update exchange rates:', error.message);
            throw error;
        }
    }

    /**
     * Registra un tipo de cambio manualmente
     * @param {string} fromCurrency - Moneda origen
     * @param {string} toCurrency - Moneda destino
     * @param {number} rate - Tipo de cambio
     * @param {Date} date - Fecha del tipo de cambio
     * @param {string} userId - ID del usuario que registra
     * @returns {Promise<Object>} Tipo de cambio creado
     */
    async setManualExchangeRate(fromCurrency, toCurrency, rate, date = new Date(), userId = null) {
        this._validateCurrency(fromCurrency);
        this._validateCurrency(toCurrency);

        if (fromCurrency === toCurrency) {
            throw new Error('Cannot set exchange rate for same currency');
        }

        if (rate <= 0) {
            throw new Error('Exchange rate must be positive');
        }

        const dateStr = this._formatDate(date);
        
        const query = `
            INSERT INTO tipos_cambio (
                moneda_origen,
                moneda_destino,
                tipo_cambio,
                fecha,
                fecha_hora,
                fuente,
                tipo,
                es_oficial,
                actualizado_por
            ) VALUES ($1, $2, $3, $4, NOW(), 'manual', 'oficial', true, $5)
            ON CONFLICT (moneda_origen, moneda_destino, fecha, tipo)
            DO UPDATE SET
                tipo_cambio = EXCLUDED.tipo_cambio,
                fecha_hora = NOW(),
                actualizado_por = EXCLUDED.actualizado_por
            RETURNING *
        `;

        const result = await this.db.query(query, [
            fromCurrency,
            toCurrency,
            rate,
            dateStr,
            userId
        ]);

        // Limpiar cache para esta moneda
        const cacheKey = `${fromCurrency}_${toCurrency}_${dateStr}`;
        this.cache.delete(cacheKey);

        return result.rows[0];
    }

    /**
     * Obtiene el historial de tipos de cambio
     * @param {string} fromCurrency - Moneda origen
     * @param {string} toCurrency - Moneda destino
     * @param {Date} startDate - Fecha inicio
     * @param {Date} endDate - Fecha fin
     * @returns {Promise<Array>} Array de tipos de cambio históricos
     */
    async getExchangeRateHistory(fromCurrency, toCurrency, startDate, endDate = new Date()) {
        this._validateCurrency(fromCurrency);
        this._validateCurrency(toCurrency);

        const query = `
            SELECT 
                moneda_origen,
                moneda_destino,
                tipo_cambio,
                fecha,
                fecha_hora,
                fuente,
                tipo,
                es_oficial
            FROM tipos_cambio
            WHERE moneda_origen = $1
            AND moneda_destino = $2
            AND fecha BETWEEN $3 AND $4
            ORDER BY fecha DESC, fecha_hora DESC
        `;

        const result = await this.db.query(query, [
            fromCurrency,
            toCurrency,
            this._formatDate(startDate),
            this._formatDate(endDate)
        ]);

        return result.rows;
    }

    /**
     * Obtiene todos los tipos de cambio vigentes
     * @returns {Promise<Object>} Objeto con todos los pares de monedas y sus tipos de cambio
     */
    async getAllCurrentRates() {
        const query = `
            SELECT DISTINCT ON (moneda_origen, moneda_destino)
                moneda_origen,
                moneda_destino,
                tipo_cambio,
                fecha,
                fuente
            FROM tipos_cambio
            WHERE es_oficial = true
            AND (valido_hasta IS NULL OR valido_hasta > NOW())
            ORDER BY moneda_origen, moneda_destino, fecha DESC, fecha_hora DESC
        `;

        const result = await this.db.query(query);
        
        // Convertir a objeto estructurado
        const rates = {};
        for (const row of result.rows) {
            if (!rates[row.moneda_origen]) {
                rates[row.moneda_origen] = {};
            }
            rates[row.moneda_origen][row.moneda_destino] = {
                rate: parseFloat(row.tipo_cambio),
                date: row.fecha,
                source: row.fuente
            };
        }

        return rates;
    }

    // ============================================================================
    // MÉTODOS PRIVADOS
    // ============================================================================

    /**
     * Valida que el código de moneda sea válido
     */
    _validateCurrency(currency) {
        if (!currency || typeof currency !== 'string' || currency.length !== 3) {
            throw new Error(`Invalid currency code: ${currency}`);
        }
        // Opcional: validar contra lista de monedas soportadas
        // if (!this.supportedCurrencies.includes(currency.toUpperCase())) {
        //     throw new Error(`Unsupported currency: ${currency}`);
        // }
    }

    /**
     * Formatea una fecha a string YYYY-MM-DD
     */
    _formatDate(date) {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    /**
     * Verifica si una fecha es hoy
     */
    _isToday(date) {
        const today = new Date();
        const compareDate = new Date(date);
        return this._formatDate(today) === this._formatDate(compareDate);
    }

    /**
     * Verifica si el cache es válido para una clave
     */
    _isCacheValid(cacheKey) {
        if (!this.cache.has(cacheKey)) {
            return false;
        }
        const cached = this.cache.get(cacheKey);
        const now = Date.now();
        return (now - cached.timestamp) < this.config.cacheDuration;
    }

    /**
     * Guarda un valor en cache
     */
    _setCache(cacheKey, rate) {
        this.cache.set(cacheKey, {
            rate: rate,
            timestamp: Date.now()
        });
    }

    /**
     * Obtiene tipo de cambio desde API externa
     */
    async _fetchFromApi(fromCurrency, toCurrency) {
        try {
            const rates = await this._fetchRatesFromApi(fromCurrency);
            return rates ? rates[toCurrency] : null;
        } catch (error) {
            console.error(`API fetch error: ${error.message}`);
            return null;
        }
    }

    /**
     * Obtiene todos los tipos de cambio desde API
     */
    async _fetchRatesFromApi(baseCurrency) {
        const provider = this.apiProviders[this.config.apiProvider];
        
        if (!provider) {
            throw new Error(`Unknown API provider: ${this.config.apiProvider}`);
        }

        try {
            let url = provider.url.replace('{base}', baseCurrency);
            const config = {
                timeout: 10000,
                headers: {
                    'User-Agent': 'SpiritTours/1.0'
                }
            };

            // Agregar API key si es requerida
            if (provider.requiresKey) {
                if (!this.config.apiKey) {
                    throw new Error('API key required but not configured');
                }
                
                // Configurar según proveedor
                if (this.config.apiProvider === 'fixer' || this.config.apiProvider === 'openexchangerates') {
                    config.params = { 
                        access_key: this.config.apiKey,
                        base: baseCurrency
                    };
                } else if (this.config.apiProvider === 'currencyapi') {
                    config.params = {
                        apikey: this.config.apiKey,
                        base_currency: baseCurrency
                    };
                }
            }

            const response = await axios.get(url, config);
            
            // Parsear respuesta según proveedor
            if (this.config.apiProvider === 'exchangerate_api') {
                return response.data.rates;
            } else if (this.config.apiProvider === 'fixer' || this.config.apiProvider === 'openexchangerates') {
                return response.data.rates;
            } else if (this.config.apiProvider === 'currencyapi') {
                // CurrencyAPI tiene estructura diferente
                const rates = {};
                for (const [currency, data] of Object.entries(response.data.data)) {
                    rates[currency] = data.value;
                }
                return rates;
            }

            return null;
        } catch (error) {
            console.error(`Failed to fetch from ${this.config.apiProvider}:`, error.message);
            throw error;
        }
    }

    /**
     * Obtiene tipo de cambio desde base de datos
     */
    async _fetchFromDatabase(fromCurrency, toCurrency, dateStr) {
        const query = `
            SELECT tipo_cambio
            FROM tipos_cambio
            WHERE moneda_origen = $1
            AND moneda_destino = $2
            AND fecha <= $3
            AND es_oficial = true
            AND (valido_hasta IS NULL OR valido_hasta > NOW())
            ORDER BY fecha DESC, fecha_hora DESC
            LIMIT 1
        `;

        const result = await this.db.query(query, [fromCurrency, toCurrency, dateStr]);
        
        if (result.rows.length > 0) {
            return parseFloat(result.rows[0].tipo_cambio);
        }

        return null;
    }

    /**
     * Guarda tipo de cambio en base de datos
     */
    async _saveToDatabase(fromCurrency, toCurrency, rate, dateStr = null) {
        const date = dateStr || this._formatDate(new Date());
        
        const query = `
            INSERT INTO tipos_cambio (
                moneda_origen,
                moneda_destino,
                tipo_cambio,
                fecha,
                fecha_hora,
                fuente,
                tipo,
                es_oficial
            ) VALUES ($1, $2, $3, $4, NOW(), $5, 'oficial', true)
            ON CONFLICT (moneda_origen, moneda_destino, fecha, tipo)
            DO UPDATE SET
                tipo_cambio = EXCLUDED.tipo_cambio,
                fecha_hora = NOW(),
                fuente = EXCLUDED.fuente
            RETURNING id
        `;

        const result = await this.db.query(query, [
            fromCurrency,
            toCurrency,
            rate,
            date,
            this.config.apiProvider
        ]);

        return result.rows[0];
    }

    /**
     * Limpia cache expirado
     */
    cleanExpiredCache() {
        const now = Date.now();
        let cleaned = 0;
        
        for (const [key, value] of this.cache.entries()) {
            if ((now - value.timestamp) >= this.config.cacheDuration) {
                this.cache.delete(key);
                cleaned++;
            }
        }

        if (cleaned > 0) {
            console.log(`🧹 Cleaned ${cleaned} expired cache entries`);
        }
    }
}

module.exports = ExchangeRatesService;
