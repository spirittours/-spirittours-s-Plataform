/**
 * Adapter Factory - Creates appropriate ERP adapter based on configuration
 * Implements Factory Pattern for dynamic adapter creation
 * 
 * @class AdapterFactory
 */

const AccountingAdapter = require('./base-adapter');

// Import USA adapters
const QuickBooksUSAAdapter = require('./adapters/usa/quickbooks-usa.adapter');
const XeroUSAAdapter = require('./adapters/usa/xero-usa.adapter');
const FreshBooksAdapter = require('./adapters/usa/freshbooks.adapter');

// Import Mexico adapters
const CONTPAQiAdapter = require('./adapters/mexico/contpaqi.adapter');
const AspelAdapter = require('./adapters/mexico/aspel.adapter');
const AlegraAdapter = require('./adapters/mexico/alegra.adapter');
const QuickBooksMexicoAdapter = require('./adapters/mexico/quickbooks-mexico.adapter');

// Import UAE adapters
const ZohoBooksUAEAdapter = require('./adapters/uae/zoho-books-uae.adapter');
const XeroUAEAdapter = require('./adapters/uae/xero-uae.adapter');
const TallyPrimeAdapter = require('./adapters/uae/tallyprime.adapter');

// Import Spain adapters
const HoldedAdapter = require('./adapters/spain/holded.adapter');
const AnfixAdapter = require('./adapters/spain/anfix.adapter');
const Sage50SpainAdapter = require('./adapters/spain/sage50-spain.adapter');

// Import Israel adapters
const RivhitAdapter = require('./adapters/israel/rivhit.adapter');
const HashavshevetAdapter = require('./adapters/israel/hashavshevet.adapter');

class AdapterFactory {
    /**
     * Create an adapter instance based on ERP configuration
     * @param {Object} sucursalConfig - Configuration from configuracion_erp_sucursal table
     * @returns {AccountingAdapter} Instance of specific adapter
     */
    static create(sucursalConfig) {
        const { erp_provider, erp_region, credentials, config } = sucursalConfig;
        
        // Normalize provider name
        const provider = erp_provider.toLowerCase();
        const region = (erp_region || 'global').toLowerCase();
        
        // Map of adapters by provider and region
        const adaptersMap = {
            'quickbooks': {
                'us': () => new QuickBooksUSAAdapter(credentials, config),
                'usa': () => new QuickBooksUSAAdapter(credentials, config),
                'mx': () => new QuickBooksMexicoAdapter(credentials, config),
                'mexico': () => new QuickBooksMexicoAdapter(credentials, config),
            },
            'quickbooks_online': {
                'us': () => new QuickBooksUSAAdapter(credentials, config),
                'usa': () => new QuickBooksUSAAdapter(credentials, config),
                'mx': () => new QuickBooksMexicoAdapter(credentials, config),
            },
            'xero': {
                'us': () => new XeroUSAAdapter(credentials, config),
                'usa': () => new XeroUSAAdapter(credentials, config),
                'ae': () => new XeroUAEAdapter(credentials, config),
                'uae': () => new XeroUAEAdapter(credentials, config),
                'global': () => new XeroUSAAdapter(credentials, config),
            },
            'freshbooks': {
                'us': () => new FreshBooksAdapter(credentials, config),
                'usa': () => new FreshBooksAdapter(credentials, config),
                'global': () => new FreshBooksAdapter(credentials, config),
            },
            'contpaqi': {
                'mx': () => new CONTPAQiAdapter(credentials, config),
                'mexico': () => new CONTPAQiAdapter(credentials, config),
            },
            'aspel': {
                'mx': () => new AspelAdapter(credentials, config),
                'mexico': () => new AspelAdapter(credentials, config),
            },
            'alegra': {
                'mx': () => new AlegraAdapter(credentials, config),
                'mexico': () => new AlegraAdapter(credentials, config),
                'co': () => new AlegraAdapter(credentials, config),
                'colombia': () => new AlegraAdapter(credentials, config),
                'global': () => new AlegraAdapter(credentials, config),
            },
            'zoho_books': {
                'ae': () => new ZohoBooksUAEAdapter(credentials, config),
                'uae': () => new ZohoBooksUAEAdapter(credentials, config),
                'global': () => new ZohoBooksUAEAdapter(credentials, config),
            },
            'tallyprime': {
                'ae': () => new TallyPrimeAdapter(credentials, config),
                'uae': () => new TallyPrimeAdapter(credentials, config),
                'in': () => new TallyPrimeAdapter(credentials, config),
                'india': () => new TallyPrimeAdapter(credentials, config),
            },
            'holded': {
                'es': () => new HoldedAdapter(credentials, config),
                'spain': () => new HoldedAdapter(credentials, config),
                'españa': () => new HoldedAdapter(credentials, config),
            },
            'anfix': {
                'es': () => new AnfixAdapter(credentials, config),
                'spain': () => new AnfixAdapter(credentials, config),
            },
            'sage50': {
                'es': () => new Sage50SpainAdapter(credentials, config),
                'spain': () => new Sage50SpainAdapter(credentials, config),
            },
            'rivhit': {
                'il': () => new RivhitAdapter(credentials, config),
                'israel': () => new RivhitAdapter(credentials, config),
            },
            'hashavshevet': {
                'il': () => new HashavshevetAdapter(credentials, config),
                'israel': () => new HashavshevetAdapter(credentials, config),
            }
        };
        
        // Find provider adapters
        const providerAdapters = adaptersMap[provider];
        if (!providerAdapters) {
            throw new Error(
                `ERP provider "${erp_provider}" is not supported. ` +
                `Available providers: ${Object.keys(adaptersMap).join(', ')}`
            );
        }
        
        // Try region-specific adapter, then fall back to 'global'
        const adapterConstructor = providerAdapters[region] || 
                                   providerAdapters['global'];
        
        if (!adapterConstructor) {
            throw new Error(
                `ERP provider "${erp_provider}" is not supported for region "${erp_region}". ` +
                `Available regions for ${erp_provider}: ${Object.keys(providerAdapters).join(', ')}`
            );
        }
        
        // Create and return adapter instance
        const adapter = adapterConstructor();
        
        // Validate that it's an instance of AccountingAdapter
        if (!(adapter instanceof AccountingAdapter)) {
            throw new Error(
                `Adapter for ${erp_provider} does not extend AccountingAdapter`
            );
        }
        
        return adapter;
    }
    
    /**
     * Get list of available adapters for a specific country/region
     * @param {string} countryCode - ISO country code (US, MX, AE, ES, IL)
     * @returns {Array} List of available ERP systems with details
     */
    static getAvailableAdapters(countryCode) {
        const recommendations = {
            'US': [
                {
                    id: 'quickbooks',
                    name: 'QuickBooks Online',
                    provider: 'Intuit',
                    priority: 'high',
                    cost_range: '$30-$200/month',
                    description: 'Industry leader in USA, 7M+ businesses',
                    features: ['Excellent API', 'IRS compliant', 'Huge ecosystem'],
                    auth_type: 'oauth2',
                    supported: true,
                    region: 'us'
                },
                {
                    id: 'xero',
                    name: 'Xero',
                    provider: 'Xero Limited',
                    priority: 'medium',
                    cost_range: '$13-$70/month',
                    description: 'Modern alternative, global reach',
                    features: ['Modern UI', 'Great API', 'Multi-country'],
                    auth_type: 'oauth2',
                    supported: true,
                    region: 'us'
                },
                {
                    id: 'freshbooks',
                    name: 'FreshBooks',
                    provider: 'FreshBooks',
                    priority: 'low',
                    cost_range: '$17-$55/month',
                    description: 'Best for freelancers and agencies',
                    features: ['Easy to use', 'Time tracking', 'Invoicing focus'],
                    auth_type: 'oauth2',
                    supported: true,
                    region: 'us'
                },
            ],
            'MX': [
                {
                    id: 'contpaqi',
                    name: 'CONTPAQi',
                    provider: 'CONTPAQi',
                    priority: 'high',
                    cost_range: '$50-$300/month',
                    description: 'Market leader in Mexico, SAT compliant',
                    features: ['CFDI 4.0', 'SAT integration', 'PAC included'],
                    auth_type: 'api_key',
                    supported: true,
                    region: 'mx'
                },
                {
                    id: 'alegra',
                    name: 'Alegra',
                    provider: 'Alegra',
                    priority: 'medium',
                    cost_range: '$20-$80/month',
                    description: 'Modern cloud solution, CFDI compliant',
                    features: ['100% cloud', 'Easy to use', 'CFDI 4.0'],
                    auth_type: 'basic',
                    supported: true,
                    region: 'mx'
                },
                {
                    id: 'aspel',
                    name: 'Aspel',
                    provider: 'Aspel',
                    priority: 'medium',
                    cost_range: '$60-$250/month',
                    description: 'Traditional leader, SAT compliant',
                    features: ['Robust', 'SAT integration', 'Local support'],
                    auth_type: 'api_key',
                    supported: true,
                    region: 'mx'
                },
                {
                    id: 'quickbooks',
                    name: 'QuickBooks México',
                    provider: 'Intuit',
                    priority: 'low',
                    cost_range: '$30-$150/month',
                    description: 'QuickBooks localized for Mexico',
                    features: ['CFDI 4.0', 'Familiar UI', 'Good API'],
                    auth_type: 'oauth2',
                    supported: true,
                    region: 'mx'
                },
            ],
            'AE': [
                {
                    id: 'zoho_books',
                    name: 'Zoho Books',
                    provider: 'Zoho',
                    priority: 'high',
                    cost_range: '$15-$60/month',
                    description: 'FTA approved, VAT 5% ready',
                    features: ['FTA approved', 'VAT 5%', 'Arabic/English', 'Excellent API'],
                    auth_type: 'oauth2',
                    supported: true,
                    region: 'ae'
                },
                {
                    id: 'xero',
                    name: 'Xero',
                    provider: 'Xero Limited',
                    priority: 'medium',
                    cost_range: '$13-$70/month',
                    description: 'Modern cloud accounting, VAT compliant',
                    features: ['VAT compliant', 'Modern UI', 'Great API'],
                    auth_type: 'oauth2',
                    supported: true,
                    region: 'ae'
                },
                {
                    id: 'tallyprime',
                    name: 'TallyPrime',
                    provider: 'Tally Solutions',
                    priority: 'low',
                    cost_range: '$30-$100/month',
                    description: 'Popular in Middle East, strong inventory',
                    features: ['Popular in ME', 'Inventory mgmt', 'VAT ready'],
                    auth_type: 'api_key',
                    supported: true,
                    region: 'ae'
                },
            ],
            'ES': [
                {
                    id: 'holded',
                    name: 'Holded',
                    provider: 'Holded',
                    priority: 'high',
                    cost_range: '$30-$150/month',
                    description: 'Modern ERP, Plan General Contable compliant',
                    features: ['ERP all-in-one', 'IVA 21%', 'SII ready', 'Great API'],
                    auth_type: 'api_key',
                    supported: true,
                    region: 'es'
                },
                {
                    id: 'anfix',
                    name: 'Anfix',
                    provider: 'Anfix',
                    priority: 'medium',
                    cost_range: '$25-$80/month',
                    description: 'Easy for freelancers, bank connection',
                    features: ['Easy to use', 'Bank sync', 'Gestoría connect'],
                    auth_type: 'api_key',
                    supported: true,
                    region: 'es'
                },
                {
                    id: 'sage50',
                    name: 'Sage 50',
                    provider: 'Sage',
                    priority: 'low',
                    cost_range: '$40-$200/month',
                    description: 'Traditional robust accounting',
                    features: ['Very robust', 'Traditional', 'Accountant preferred'],
                    auth_type: 'api_key',
                    supported: true,
                    region: 'es'
                },
            ],
            'IL': [
                {
                    id: 'rivhit',
                    name: 'Rivhit (ריווחית)',
                    provider: 'Rivhit',
                    priority: 'high',
                    cost_range: '$25-$100/month',
                    description: 'Modern cloud leader in Israel',
                    features: ['Cloud-based', 'Hebrew/English', 'Mas Hachnasá compliant'],
                    auth_type: 'api_key',
                    supported: true,
                    region: 'il'
                },
                {
                    id: 'hashavshevet',
                    name: 'Hashavshevet (חשבשבת)',
                    provider: 'Hashavshevet',
                    priority: 'medium',
                    cost_range: '$30-$150/month',
                    description: 'Traditional market leader',
                    features: ['Market leader', 'Very robust', 'Traditional'],
                    auth_type: 'api_key',
                    supported: true,
                    region: 'il'
                },
            ]
        };
        
        return recommendations[countryCode] || [];
    }
    
    /**
     * Get all supported providers
     * @returns {Array} List of all supported provider IDs
     */
    static getSupportedProviders() {
        return [
            'quickbooks', 'quickbooks_online',
            'xero',
            'freshbooks',
            'contpaqi',
            'aspel',
            'alegra',
            'zoho_books',
            'tallyprime',
            'holded',
            'anfix',
            'sage50',
            'rivhit',
            'hashavshevet'
        ];
    }
    
    /**
     * Check if a provider is supported
     * @param {string} provider
     * @returns {boolean}
     */
    static isProviderSupported(provider) {
        return this.getSupportedProviders().includes(provider.toLowerCase());
    }
    
    /**
     * Get provider info
     * @param {string} provider
     * @param {string} countryCode
     * @returns {Object|null}
     */
    static getProviderInfo(provider, countryCode) {
        const adapters = this.getAvailableAdapters(countryCode);
        return adapters.find(a => a.id === provider.toLowerCase()) || null;
    }
}

module.exports = AdapterFactory;
