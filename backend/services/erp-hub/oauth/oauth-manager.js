/**
 * OAuth 2.0 Manager
 * 
 * Gestiona los flujos de autenticación OAuth 2.0 para sistemas ERP que lo requieren.
 * Maneja autorización, tokens, refresh automático, y almacenamiento seguro.
 * 
 * Características:
 * - Generación de URLs de autorización
 * - Intercambio de código por tokens
 * - Refresh automático de tokens
 * - Almacenamiento encriptado de credenciales
 * - Revocación de tokens
 * - Manejo de múltiples proveedores OAuth
 * 
 * @module services/erp-hub/oauth/oauth-manager
 * @author Spirit Tours Dev Team - GenSpark AI Developer
 * @version 1.0.0
 */

const crypto = require('crypto');
const axios = require('axios');
const querystring = require('querystring');

class OAuthManager {
    constructor(dbPool, config = {}) {
        this.db = dbPool;
        this.config = {
            encryptionKey: config.encryptionKey || process.env.OAUTH_ENCRYPTION_KEY,
            encryptionAlgorithm: config.encryptionAlgorithm || 'aes-256-cbc',
            tokenRefreshBuffer: config.tokenRefreshBuffer || 300, // Refresh 5 min before expiry
            ...config
        };

        // OAuth configurations por proveedor
        this.providers = {
            quickbooks: {
                authorizationEndpoint: 'https://appcenter.intuit.com/connect/oauth2',
                tokenEndpoint: 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer',
                revokeEndpoint: 'https://developer.api.intuit.com/v2/oauth2/tokens/revoke',
                scope: 'com.intuit.quickbooks.accounting',
                requiresPKCE: false,
                supportsRefresh: true
            },
            xero: {
                authorizationEndpoint: 'https://login.xero.com/identity/connect/authorize',
                tokenEndpoint: 'https://identity.xero.com/connect/token',
                revokeEndpoint: 'https://identity.xero.com/connect/revocation',
                scope: 'accounting.transactions accounting.contacts accounting.settings',
                requiresPKCE: true,
                supportsRefresh: true
            },
            zoho_books: {
                authorizationEndpoint: 'https://accounts.zoho.com/oauth/v2/auth',
                tokenEndpoint: 'https://accounts.zoho.com/oauth/v2/token',
                revokeEndpoint: 'https://accounts.zoho.com/oauth/v2/token/revoke',
                scope: 'ZohoBooks.fullaccess.all',
                requiresPKCE: false,
                supportsRefresh: true
            },
            freshbooks: {
                authorizationEndpoint: 'https://auth.freshbooks.com/oauth/authorize',
                tokenEndpoint: 'https://api.freshbooks.com/auth/oauth/token',
                revokeEndpoint: null, // FreshBooks doesn't have revoke endpoint
                scope: 'user:profile user:invoices user:payments',
                requiresPKCE: false,
                supportsRefresh: true
            }
        };

        // Almacenamiento temporal de estados OAuth (en producción usar Redis)
        this.stateStore = new Map();
    }

    // ============================================================================
    // AUTHORIZATION FLOW
    // ============================================================================

    /**
     * Genera URL de autorización OAuth 2.0
     * @param {string} provider - Proveedor ERP (quickbooks, xero, etc.)
     * @param {string} sucursalId - ID de la sucursal
     * @param {Object} credentials - Credenciales del cliente OAuth
     * @param {string} redirectUri - URI de redirección
     * @returns {Object} URL de autorización y estado
     */
    generateAuthorizationUrl(provider, sucursalId, credentials, redirectUri) {
        const providerConfig = this.providers[provider.toLowerCase()];
        if (!providerConfig) {
            throw new Error(`OAuth provider ${provider} not supported`);
        }

        // Generar estado único para prevenir CSRF
        const state = this._generateState(sucursalId, provider);
        
        // Almacenar estado temporalmente
        this.stateStore.set(state, {
            sucursalId,
            provider,
            createdAt: Date.now(),
            expiresAt: Date.now() + (10 * 60 * 1000) // 10 minutos
        });

        // Parámetros base
        const params = {
            client_id: credentials.clientId,
            redirect_uri: redirectUri,
            response_type: 'code',
            scope: providerConfig.scope,
            state: state
        };

        // PKCE si es requerido
        let codeVerifier = null;
        if (providerConfig.requiresPKCE) {
            codeVerifier = this._generateCodeVerifier();
            const codeChallenge = this._generateCodeChallenge(codeVerifier);
            
            params.code_challenge = codeChallenge;
            params.code_challenge_method = 'S256';
            
            // Almacenar verifier para usarlo después
            this.stateStore.get(state).codeVerifier = codeVerifier;
        }

        const authUrl = `${providerConfig.authorizationEndpoint}?${querystring.stringify(params)}`;

        return {
            authorizationUrl: authUrl,
            state: state,
            codeVerifier: codeVerifier,
            expiresAt: this.stateStore.get(state).expiresAt
        };
    }

    /**
     * Intercambia código de autorización por tokens
     * @param {string} provider - Proveedor ERP
     * @param {string} code - Código de autorización
     * @param {string} state - Estado OAuth
     * @param {Object} credentials - Credenciales del cliente OAuth
     * @param {string} redirectUri - URI de redirección
     * @returns {Promise<Object>} Tokens de acceso y refresh
     */
    async exchangeCodeForTokens(provider, code, state, credentials, redirectUri) {
        // Validar estado
        const stateData = this.stateStore.get(state);
        if (!stateData) {
            throw new Error('Invalid or expired OAuth state');
        }

        if (stateData.provider.toLowerCase() !== provider.toLowerCase()) {
            throw new Error('Provider mismatch');
        }

        const providerConfig = this.providers[provider.toLowerCase()];
        if (!providerConfig) {
            throw new Error(`OAuth provider ${provider} not supported`);
        }

        try {
            // Preparar request
            const tokenData = {
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: redirectUri,
                client_id: credentials.clientId,
                client_secret: credentials.clientSecret
            };

            // Agregar code_verifier si PKCE fue usado
            if (providerConfig.requiresPKCE && stateData.codeVerifier) {
                tokenData.code_verifier = stateData.codeVerifier;
            }

            // Realizar request
            const response = await axios.post(
                providerConfig.tokenEndpoint,
                querystring.stringify(tokenData),
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Accept': 'application/json'
                    },
                    timeout: 30000
                }
            );

            const tokens = response.data;

            // Limpiar estado usado
            this.stateStore.delete(state);

            // Encriptar tokens antes de devolver
            const encryptedTokens = {
                accessToken: this._encrypt(tokens.access_token),
                refreshToken: tokens.refresh_token ? this._encrypt(tokens.refresh_token) : null,
                tokenType: tokens.token_type || 'Bearer',
                expiresIn: tokens.expires_in,
                expiresAt: tokens.expires_in ? new Date(Date.now() + (tokens.expires_in * 1000)) : null,
                scope: tokens.scope,
                realmId: tokens.realmId || null // QuickBooks specific
            };

            // Guardar en base de datos
            await this._saveTokens(stateData.sucursalId, provider, encryptedTokens, credentials);

            return {
                success: true,
                sucursalId: stateData.sucursalId,
                tokens: encryptedTokens
            };
        } catch (error) {
            console.error('Token exchange failed:', error.response?.data || error.message);
            throw new Error(`Failed to exchange code for tokens: ${error.message}`);
        }
    }

    /**
     * Refresca un token de acceso
     * @param {string} sucursalId - ID de la sucursal
     * @param {string} provider - Proveedor ERP
     * @returns {Promise<Object>} Nuevos tokens
     */
    async refreshAccessToken(sucursalId, provider) {
        const providerConfig = this.providers[provider.toLowerCase()];
        if (!providerConfig) {
            throw new Error(`OAuth provider ${provider} not supported`);
        }

        if (!providerConfig.supportsRefresh) {
            throw new Error(`Provider ${provider} does not support token refresh`);
        }

        try {
            // Obtener configuración actual
            const erpConfig = await this._getERPConfig(sucursalId);
            if (!erpConfig || !erpConfig.refresh_token) {
                throw new Error('No refresh token available');
            }

            // Desencriptar refresh token
            const refreshToken = this._decrypt(erpConfig.refresh_token);

            // Obtener credenciales del cliente (necesitamos client_id y client_secret)
            const clientId = process.env[`${provider.toUpperCase()}_CLIENT_ID`];
            const clientSecret = process.env[`${provider.toUpperCase()}_CLIENT_SECRET`];

            if (!clientId || !clientSecret) {
                throw new Error('OAuth client credentials not configured');
            }

            // Preparar request
            const tokenData = {
                grant_type: 'refresh_token',
                refresh_token: refreshToken,
                client_id: clientId,
                client_secret: clientSecret
            };

            // Realizar request
            const response = await axios.post(
                providerConfig.tokenEndpoint,
                querystring.stringify(tokenData),
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Accept': 'application/json'
                    },
                    timeout: 30000
                }
            );

            const tokens = response.data;

            // Encriptar nuevos tokens
            const encryptedTokens = {
                accessToken: this._encrypt(tokens.access_token),
                refreshToken: tokens.refresh_token ? this._encrypt(tokens.refresh_token) : erpConfig.refresh_token,
                tokenType: tokens.token_type || 'Bearer',
                expiresIn: tokens.expires_in,
                expiresAt: tokens.expires_in ? new Date(Date.now() + (tokens.expires_in * 1000)) : null,
                scope: tokens.scope
            };

            // Actualizar en base de datos
            await this._updateTokens(sucursalId, encryptedTokens);

            console.log(`✅ Tokens refreshed successfully for sucursal ${sucursalId}`);

            return {
                success: true,
                tokens: encryptedTokens
            };
        } catch (error) {
            console.error('Token refresh failed:', error.response?.data || error.message);
            throw new Error(`Failed to refresh access token: ${error.message}`);
        }
    }

    /**
     * Revoca tokens OAuth
     * @param {string} sucursalId - ID de la sucursal
     * @param {string} provider - Proveedor ERP
     * @returns {Promise<Object>} Resultado
     */
    async revokeTokens(sucursalId, provider) {
        const providerConfig = this.providers[provider.toLowerCase()];
        if (!providerConfig || !providerConfig.revokeEndpoint) {
            console.warn(`Provider ${provider} does not support token revocation`);
            // Aún así, limpiar tokens de la base de datos
            await this._clearTokens(sucursalId);
            return { success: true, message: 'Tokens cleared from database' };
        }

        try {
            // Obtener configuración actual
            const erpConfig = await this._getERPConfig(sucursalId);
            if (!erpConfig || !erpConfig.access_token) {
                throw new Error('No tokens available to revoke');
            }

            // Desencriptar tokens
            const accessToken = this._decrypt(erpConfig.access_token);
            const refreshToken = erpConfig.refresh_token ? this._decrypt(erpConfig.refresh_token) : null;

            // Obtener credenciales del cliente
            const clientId = process.env[`${provider.toUpperCase()}_CLIENT_ID`];
            const clientSecret = process.env[`${provider.toUpperCase()}_CLIENT_SECRET`];

            // Revocar access token
            if (accessToken) {
                await axios.post(
                    providerConfig.revokeEndpoint,
                    querystring.stringify({
                        token: accessToken,
                        client_id: clientId,
                        client_secret: clientSecret
                    }),
                    {
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded',
                            'Accept': 'application/json'
                        },
                        timeout: 30000
                    }
                );
            }

            // Revocar refresh token
            if (refreshToken) {
                await axios.post(
                    providerConfig.revokeEndpoint,
                    querystring.stringify({
                        token: refreshToken,
                        client_id: clientId,
                        client_secret: clientSecret
                    }),
                    {
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded',
                            'Accept': 'application/json'
                        },
                        timeout: 30000
                    }
                );
            }

            // Limpiar tokens de la base de datos
            await this._clearTokens(sucursalId);

            console.log(`✅ Tokens revoked successfully for sucursal ${sucursalId}`);

            return { success: true, message: 'Tokens revoked successfully' };
        } catch (error) {
            console.error('Token revocation failed:', error.response?.data || error.message);
            // Aún así, limpiar tokens localmente
            await this._clearTokens(sucursalId);
            throw new Error(`Failed to revoke tokens: ${error.message}`);
        }
    }

    /**
     * Verifica si un token necesita ser refrescado
     * @param {string} sucursalId - ID de la sucursal
     * @returns {Promise<boolean>} True si necesita refresh
     */
    async needsTokenRefresh(sucursalId) {
        const erpConfig = await this._getERPConfig(sucursalId);
        if (!erpConfig || !erpConfig.expires_at) {
            return false;
        }

        const expiresAt = new Date(erpConfig.expires_at);
        const now = new Date();
        const bufferTime = this.config.tokenRefreshBuffer * 1000; // Convert to ms

        return (expiresAt.getTime() - now.getTime()) < bufferTime;
    }

    // ============================================================================
    // ENCRYPTION / DECRYPTION
    // ============================================================================

    /**
     * Encripta datos sensibles
     */
    _encrypt(text) {
        if (!text) return null;
        
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(
            this.config.encryptionAlgorithm,
            Buffer.from(this.config.encryptionKey, 'hex'),
            iv
        );
        
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        
        return iv.toString('hex') + ':' + encrypted;
    }

    /**
     * Desencripta datos sensibles
     */
    _decrypt(text) {
        if (!text) return null;
        
        const parts = text.split(':');
        const iv = Buffer.from(parts.shift(), 'hex');
        const encryptedText = parts.join(':');
        
        const decipher = crypto.createDecipheriv(
            this.config.encryptionAlgorithm,
            Buffer.from(this.config.encryptionKey, 'hex'),
            iv
        );
        
        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted;
    }

    // ============================================================================
    // PKCE HELPERS
    // ============================================================================

    /**
     * Genera code verifier para PKCE
     */
    _generateCodeVerifier() {
        return crypto.randomBytes(32).toString('base64url');
    }

    /**
     * Genera code challenge desde verifier
     */
    _generateCodeChallenge(verifier) {
        return crypto
            .createHash('sha256')
            .update(verifier)
            .digest('base64url');
    }

    // ============================================================================
    // STATE MANAGEMENT
    // ============================================================================

    /**
     * Genera estado OAuth único
     */
    _generateState(sucursalId, provider) {
        const randomBytes = crypto.randomBytes(16).toString('hex');
        return `${provider}_${sucursalId}_${randomBytes}`;
    }

    /**
     * Limpia estados expirados del store
     */
    cleanExpiredStates() {
        const now = Date.now();
        let cleaned = 0;
        
        for (const [state, data] of this.stateStore.entries()) {
            if (data.expiresAt < now) {
                this.stateStore.delete(state);
                cleaned++;
            }
        }
        
        if (cleaned > 0) {
            console.log(`🧹 Cleaned ${cleaned} expired OAuth states`);
        }
    }

    // ============================================================================
    // DATABASE OPERATIONS
    // ============================================================================

    async _getERPConfig(sucursalId) {
        const query = `
            SELECT * FROM configuracion_erp_sucursal
            WHERE sucursal_id = $1
        `;
        
        const result = await this.db.query(query, [sucursalId]);
        return result.rows[0];
    }

    async _saveTokens(sucursalId, provider, tokens, credentials) {
        const query = `
            UPDATE configuracion_erp_sucursal
            SET access_token = $2,
                refresh_token = $3,
                token_type = $4,
                expires_at = $5,
                scope = $6,
                realm_id = $7,
                is_connected = true,
                connection_status = 'connected',
                last_test_connection = NOW(),
                updated_at = NOW()
            WHERE sucursal_id = $1
            RETURNING *
        `;
        
        const result = await this.db.query(query, [
            sucursalId,
            tokens.accessToken,
            tokens.refreshToken,
            tokens.tokenType,
            tokens.expiresAt,
            tokens.scope,
            tokens.realmId
        ]);
        
        return result.rows[0];
    }

    async _updateTokens(sucursalId, tokens) {
        const query = `
            UPDATE configuracion_erp_sucursal
            SET access_token = $2,
                refresh_token = COALESCE($3, refresh_token),
                token_type = $4,
                expires_at = $5,
                updated_at = NOW()
            WHERE sucursal_id = $1
        `;
        
        await this.db.query(query, [
            sucursalId,
            tokens.accessToken,
            tokens.refreshToken,
            tokens.tokenType,
            tokens.expiresAt
        ]);
    }

    async _clearTokens(sucursalId) {
        const query = `
            UPDATE configuracion_erp_sucursal
            SET access_token = NULL,
                refresh_token = NULL,
                expires_at = NULL,
                is_connected = false,
                connection_status = 'disconnected',
                updated_at = NOW()
            WHERE sucursal_id = $1
        `;
        
        await this.db.query(query, [sucursalId]);
    }

    /**
     * Lista proveedores OAuth soportados
     */
    getSupportedProviders() {
        return Object.keys(this.providers).map(key => ({
            id: key,
            name: this._formatProviderName(key),
            requiresPKCE: this.providers[key].requiresPKCE,
            supportsRefresh: this.providers[key].supportsRefresh
        }));
    }

    _formatProviderName(key) {
        const names = {
            quickbooks: 'QuickBooks Online',
            xero: 'Xero',
            zoho_books: 'Zoho Books',
            freshbooks: 'FreshBooks'
        };
        return names[key] || key;
    }
}

module.exports = OAuthManager;
