/**
 * CloudFront CDN Configuration for Spirit Tours
 * ============================================
 * Optimización completa de entrega de contenido con CDN global
 * 
 * Features:
 * - Multi-origin support (S3, ALB, Custom)
 * - Image optimization on-the-fly
 * - Smart caching strategies
 * - Geographic routing
 * - Real-time metrics
 * - Security headers
 * - WebP/AVIF auto-conversion
 * - Lazy loading support
 */

const AWS = require('aws-sdk');
const sharp = require('sharp');
const crypto = require('crypto');
const path = require('path');

// ================== CDN Configuration ==================

class CloudFrontCDNManager {
    constructor(config) {
        this.cloudfront = new AWS.CloudFront({
            apiVersion: '2020-05-31',
            region: config.region || 'us-east-1'
        });
        
        this.s3 = new AWS.S3({
            apiVersion: '2006-03-01',
            region: config.region || 'us-east-1'
        });
        
        this.config = {
            distributionId: config.distributionId,
            s3Bucket: config.s3Bucket,
            customDomain: config.customDomain || 'cdn.spirittours.com',
            certificateArn: config.certificateArn,
            priceClass: 'PriceClass_All', // Global distribution
            ...config
        };
        
        this.imageOptimizer = new ImageOptimizer();
        this.cacheManager = new CacheManager();
        this.metrics = new CDNMetrics();
    }
    
    /**
     * Create CloudFront Distribution
     */
    async createDistribution() {
        const params = {
            DistributionConfig: {
                CallerReference: Date.now().toString(),
                Comment: 'Spirit Tours CDN Distribution',
                Enabled: true,
                
                // Origins configuration
                Origins: {
                    Quantity: 3,
                    Items: [
                        {
                            // S3 Origin for static assets
                            Id: 's3-static',
                            DomainName: `${this.config.s3Bucket}.s3.amazonaws.com`,
                            S3OriginConfig: {
                                OriginAccessIdentity: `origin-access-identity/cloudfront/${this.config.oaiId}`
                            },
                            ConnectionAttempts: 3,
                            ConnectionTimeout: 10,
                            OriginShield: {
                                Enabled: true,
                                OriginShieldRegion: 'us-east-1'
                            }
                        },
                        {
                            // ALB Origin for dynamic content
                            Id: 'alb-dynamic',
                            DomainName: this.config.albDomain,
                            CustomOriginConfig: {
                                HTTPPort: 80,
                                HTTPSPort: 443,
                                OriginProtocolPolicy: 'https-only',
                                OriginSslProtocols: {
                                    Quantity: 3,
                                    Items: ['TLSv1.2', 'TLSv1.3']
                                }
                            }
                        },
                        {
                            // Lambda@Edge for image processing
                            Id: 'lambda-images',
                            DomainName: 'images-api.spirittours.com',
                            CustomOriginConfig: {
                                HTTPPort: 80,
                                HTTPSPort: 443,
                                OriginProtocolPolicy: 'https-only'
                            }
                        }
                    ]
                },
                
                // Origin Groups for failover
                OriginGroups: {
                    Quantity: 1,
                    Items: [{
                        Id: 'primary-failover-group',
                        FailoverCriteria: {
                            StatusCodes: {
                                Quantity: 3,
                                Items: [500, 502, 503, 504]
                            }
                        },
                        Members: {
                            Quantity: 2,
                            Items: [
                                { OriginId: 's3-static' },
                                { OriginId: 'alb-dynamic' }
                            ]
                        }
                    }]
                },
                
                // Cache Behaviors
                DefaultCacheBehavior: {
                    TargetOriginId: 's3-static',
                    ViewerProtocolPolicy: 'redirect-to-https',
                    
                    AllowedMethods: {
                        Quantity: 7,
                        Items: ['GET', 'HEAD', 'OPTIONS', 'PUT', 'POST', 'PATCH', 'DELETE'],
                        CachedMethods: {
                            Quantity: 2,
                            Items: ['GET', 'HEAD']
                        }
                    },
                    
                    Compress: true,
                    
                    CachePolicyId: this.createCachePolicy(),
                    OriginRequestPolicyId: this.createOriginRequestPolicy(),
                    ResponseHeadersPolicyId: this.createResponseHeadersPolicy(),
                    
                    // Lambda@Edge associations
                    LambdaFunctionAssociations: {
                        Quantity: 2,
                        Items: [
                            {
                                LambdaFunctionARN: this.config.lambdaEdgeArn,
                                EventType: 'viewer-request',
                                IncludeBody: false
                            },
                            {
                                LambdaFunctionARN: this.config.lambdaEdgeResponseArn,
                                EventType: 'origin-response',
                                IncludeBody: false
                            }
                        ]
                    },
                    
                    // Real-time logs
                    RealtimeLogConfigArn: this.config.realtimeLogArn,
                    
                    TrustedKeyGroups: {
                        Enabled: true,
                        Quantity: 1,
                        Items: [this.config.trustedKeyGroupId]
                    }
                },
                
                // Additional Cache Behaviors
                CacheBehaviors: {
                    Quantity: 4,
                    Items: [
                        {
                            PathPattern: '/images/*',
                            TargetOriginId: 'lambda-images',
                            ViewerProtocolPolicy: 'https-only',
                            CachePolicyId: this.createImageCachePolicy(),
                            Compress: true,
                            // Image optimization Lambda@Edge
                            LambdaFunctionAssociations: {
                                Quantity: 1,
                                Items: [{
                                    LambdaFunctionARN: this.config.imageOptimizerArn,
                                    EventType: 'origin-response'
                                }]
                            }
                        },
                        {
                            PathPattern: '/api/*',
                            TargetOriginId: 'alb-dynamic',
                            ViewerProtocolPolicy: 'https-only',
                            CachePolicyId: this.createAPICachePolicy(),
                            AllowedMethods: {
                                Quantity: 7,
                                Items: ['GET', 'HEAD', 'OPTIONS', 'PUT', 'POST', 'PATCH', 'DELETE']
                            }
                        },
                        {
                            PathPattern: '/static/*',
                            TargetOriginId: 's3-static',
                            ViewerProtocolPolicy: 'https-only',
                            CachePolicyId: this.createStaticCachePolicy(),
                            Compress: true
                        },
                        {
                            PathPattern: '/ws/*',
                            TargetOriginId: 'alb-dynamic',
                            ViewerProtocolPolicy: 'https-only',
                            // WebSocket support
                            AllowedMethods: {
                                Quantity: 2,
                                Items: ['GET', 'HEAD']
                            },
                            CachePolicyId: 'disabled'
                        }
                    ]
                },
                
                // Custom error pages
                CustomErrorResponses: {
                    Quantity: 3,
                    Items: [
                        {
                            ErrorCode: 404,
                            ResponseCode: 404,
                            ResponsePagePath: '/404.html',
                            ErrorCachingMinTTL: 300
                        },
                        {
                            ErrorCode: 500,
                            ResponseCode: 500,
                            ResponsePagePath: '/500.html',
                            ErrorCachingMinTTL: 60
                        },
                        {
                            ErrorCode: 503,
                            ResponseCode: 503,
                            ResponsePagePath: '/maintenance.html',
                            ErrorCachingMinTTL: 0
                        }
                    ]
                },
                
                // Geo restrictions
                Restrictions: {
                    GeoRestriction: {
                        RestrictionType: 'none'
                        // Or use 'whitelist' with Items: ['US', 'CA', 'GB', ...]
                    }
                },
                
                // SSL/TLS configuration
                ViewerCertificate: {
                    ACMCertificateArn: this.config.certificateArn,
                    SSLSupportMethod: 'sni-only',
                    MinimumProtocolVersion: 'TLSv1.2_2021'
                },
                
                // Logging
                Logging: {
                    Enabled: true,
                    IncludeCookies: true,
                    Bucket: `${this.config.logBucket}.s3.amazonaws.com`,
                    Prefix: 'cloudfront-logs/'
                },
                
                // Web ACL for AWS WAF
                WebACLId: this.config.webAclArn,
                
                // HTTP versions
                HttpVersion: 'http2and3',
                IsIPV6Enabled: true,
                
                // Price class
                PriceClass: this.config.priceClass,
                
                // Aliases
                Aliases: {
                    Quantity: 2,
                    Items: [
                        'cdn.spirittours.com',
                        'images.spirittours.com'
                    ]
                }
            }
        };
        
        try {
            const result = await this.cloudfront.createDistribution(params).promise();
            console.log('Distribution created:', result.Distribution.Id);
            return result.Distribution;
        } catch (error) {
            console.error('Error creating distribution:', error);
            throw error;
        }
    }
    
    /**
     * Create optimized cache policies
     */
    createCachePolicy() {
        return {
            Name: 'spirit-tours-default-cache',
            DefaultTTL: 86400,      // 1 day
            MaxTTL: 31536000,       // 1 year
            MinTTL: 1,
            ParametersInCacheKeyAndForwardedToOrigin: {
                EnableAcceptEncodingGzip: true,
                EnableAcceptEncodingBrotli: true,
                QueryStringsConfig: {
                    QueryStringBehavior: 'whitelist',
                    QueryStrings: {
                        Quantity: 3,
                        Items: ['v', 'lang', 'currency']
                    }
                },
                HeadersConfig: {
                    HeaderBehavior: 'whitelist',
                    Headers: {
                        Quantity: 4,
                        Items: [
                            'CloudFront-Viewer-Country',
                            'CloudFront-Is-Mobile-Viewer',
                            'CloudFront-Is-Desktop-Viewer',
                            'Accept-Language'
                        ]
                    }
                },
                CookiesConfig: {
                    CookieBehavior: 'whitelist',
                    Cookies: {
                        Quantity: 2,
                        Items: ['session', 'user_preferences']
                    }
                }
            }
        };
    }
    
    createImageCachePolicy() {
        return {
            Name: 'spirit-tours-image-cache',
            DefaultTTL: 2592000,    // 30 days
            MaxTTL: 31536000,       // 1 year
            MinTTL: 86400,          // 1 day
            ParametersInCacheKeyAndForwardedToOrigin: {
                QueryStringsConfig: {
                    QueryStringBehavior: 'whitelist',
                    QueryStrings: {
                        Quantity: 5,
                        Items: ['w', 'h', 'q', 'format', 'fit']
                    }
                },
                HeadersConfig: {
                    HeaderBehavior: 'whitelist',
                    Headers: {
                        Quantity: 2,
                        Items: ['Accept', 'Accept-Encoding']
                    }
                }
            }
        };
    }
    
    createStaticCachePolicy() {
        return {
            Name: 'spirit-tours-static-cache',
            DefaultTTL: 604800,     // 7 days
            MaxTTL: 31536000,       // 1 year
            MinTTL: 86400,          // 1 day
        };
    }
    
    createAPICachePolicy() {
        return {
            Name: 'spirit-tours-api-cache',
            DefaultTTL: 0,
            MaxTTL: 3600,          // 1 hour max
            MinTTL: 0,
            ParametersInCacheKeyAndForwardedToOrigin: {
                QueryStringsConfig: {
                    QueryStringBehavior: 'all'
                },
                HeadersConfig: {
                    HeaderBehavior: 'whitelist',
                    Headers: {
                        Quantity: 3,
                        Items: ['Authorization', 'Content-Type', 'X-API-Key']
                    }
                }
            }
        };
    }
    
    createResponseHeadersPolicy() {
        return {
            Name: 'spirit-tours-security-headers',
            SecurityHeadersConfig: {
                XSSProtection: {
                    Override: true,
                    Protection: true,
                    ModeBlock: true
                },
                XFrameOptions: {
                    Override: true,
                    FrameOption: 'SAMEORIGIN'
                },
                ReferrerPolicy: {
                    Override: true,
                    ReferrerPolicy: 'strict-origin-when-cross-origin'
                },
                ContentTypeOptions: {
                    Override: true
                },
                StrictTransportSecurity: {
                    Override: true,
                    IncludeSubdomains: true,
                    Preload: true,
                    AccessControlMaxAgeSec: 63072000
                },
                ContentSecurityPolicy: {
                    Override: true,
                    ContentSecurityPolicy: "default-src 'self'; img-src 'self' data: https:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"
                }
            },
            CustomHeadersConfig: {
                Quantity: 2,
                Items: [
                    {
                        Header: 'Cache-Control',
                        Value: 'public, max-age=86400',
                        Override: false
                    },
                    {
                        Header: 'X-CDN',
                        Value: 'Spirit-Tours-CloudFront',
                        Override: true
                    }
                ]
            },
            CORSConfig: {
                AccessControlAllowOrigins: {
                    Quantity: 3,
                    Items: [
                        'https://spirittours.com',
                        'https://www.spirittours.com',
                        'https://app.spirittours.com'
                    ]
                },
                AccessControlAllowHeaders: {
                    Quantity: 5,
                    Items: ['*']
                },
                AccessControlAllowMethods: {
                    Quantity: 7,
                    Items: ['GET', 'HEAD', 'OPTIONS', 'PUT', 'POST', 'PATCH', 'DELETE']
                },
                AccessControlAllowCredentials: true,
                AccessControlMaxAgeSec: 86400,
                OriginOverride: false
            }
        };
    }
    
    /**
     * Invalidate cache for specific paths
     */
    async invalidateCache(paths = ['/*']) {
        const params = {
            DistributionId: this.config.distributionId,
            InvalidationBatch: {
                CallerReference: Date.now().toString(),
                Paths: {
                    Quantity: paths.length,
                    Items: paths
                }
            }
        };
        
        try {
            const result = await this.cloudfront.createInvalidation(params).promise();
            console.log('Cache invalidation created:', result.Invalidation.Id);
            return result.Invalidation;
        } catch (error) {
            console.error('Error creating invalidation:', error);
            throw error;
        }
    }
    
    /**
     * Get real-time CDN metrics
     */
    async getMetrics(startTime, endTime) {
        const cloudwatch = new AWS.CloudWatch();
        
        const metrics = [
            { name: 'Requests', stat: 'Sum' },
            { name: 'BytesDownloaded', stat: 'Sum' },
            { name: 'BytesUploaded', stat: 'Sum' },
            { name: '4xxErrorRate', stat: 'Average' },
            { name: '5xxErrorRate', stat: 'Average' },
            { name: 'OriginLatency', stat: 'Average' }
        ];
        
        const results = {};
        
        for (const metric of metrics) {
            const params = {
                MetricName: metric.name,
                Namespace: 'AWS/CloudFront',
                Statistics: [metric.stat],
                StartTime: startTime,
                EndTime: endTime,
                Period: 300, // 5 minutes
                Dimensions: [
                    {
                        Name: 'DistributionId',
                        Value: this.config.distributionId
                    }
                ]
            };
            
            try {
                const data = await cloudwatch.getMetricStatistics(params).promise();
                results[metric.name] = data.Datapoints;
            } catch (error) {
                console.error(`Error getting metric ${metric.name}:`, error);
            }
        }
        
        return results;
    }
}

// ================== Image Optimizer ==================

class ImageOptimizer {
    constructor() {
        this.supportedFormats = ['jpeg', 'jpg', 'png', 'webp', 'avif'];
        this.cache = new Map();
    }
    
    /**
     * Optimize image on-the-fly
     */
    async optimizeImage(inputBuffer, options = {}) {
        const {
            width,
            height,
            quality = 85,
            format = 'auto',
            fit = 'cover',
            progressive = true
        } = options;
        
        // Generate cache key
        const cacheKey = this.generateCacheKey(inputBuffer, options);
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }
        
        try {
            let pipeline = sharp(inputBuffer);
            
            // Resize if dimensions provided
            if (width || height) {
                pipeline = pipeline.resize(width, height, { fit });
            }
            
            // Auto-format detection
            let outputFormat = format;
            if (format === 'auto') {
                // Detect best format based on browser support
                outputFormat = this.detectBestFormat(options.acceptHeader);
            }
            
            // Apply format-specific optimizations
            switch (outputFormat) {
                case 'webp':
                    pipeline = pipeline.webp({ quality, effort: 4 });
                    break;
                case 'avif':
                    pipeline = pipeline.avif({ quality, effort: 4 });
                    break;
                case 'jpeg':
                case 'jpg':
                    pipeline = pipeline.jpeg({ 
                        quality, 
                        progressive,
                        mozjpeg: true 
                    });
                    break;
                case 'png':
                    pipeline = pipeline.png({ 
                        quality, 
                        compressionLevel: 9,
                        progressive 
                    });
                    break;
            }
            
            // Additional optimizations
            pipeline = pipeline
                .rotate() // Auto-rotate based on EXIF
                .withMetadata({ orientation: undefined }) // Strip orientation
                .toColorspace('srgb'); // Normalize color space
            
            const optimizedBuffer = await pipeline.toBuffer();
            
            // Cache the result
            this.cache.set(cacheKey, optimizedBuffer);
            
            // Cleanup old cache entries
            if (this.cache.size > 1000) {
                const firstKey = this.cache.keys().next().value;
                this.cache.delete(firstKey);
            }
            
            return optimizedBuffer;
            
        } catch (error) {
            console.error('Image optimization error:', error);
            return inputBuffer; // Return original on error
        }
    }
    
    detectBestFormat(acceptHeader = '') {
        if (acceptHeader.includes('image/avif')) return 'avif';
        if (acceptHeader.includes('image/webp')) return 'webp';
        return 'jpeg';
    }
    
    generateCacheKey(buffer, options) {
        const hash = crypto.createHash('md5');
        hash.update(buffer);
        hash.update(JSON.stringify(options));
        return hash.digest('hex');
    }
}

// ================== Lambda@Edge Functions ==================

/**
 * Viewer Request - Modify requests before cache
 */
exports.viewerRequest = async (event) => {
    const request = event.Records[0].cf.request;
    const headers = request.headers;
    
    // 1. Normalize URL
    request.uri = request.uri.toLowerCase();
    
    // 2. Add security headers
    headers['x-forwarded-proto'] = [{ key: 'X-Forwarded-Proto', value: 'https' }];
    
    // 3. Device detection for responsive images
    const userAgent = headers['user-agent'][0].value;
    const isMobile = /Mobile|Android|iPhone/i.test(userAgent);
    const isTablet = /iPad|Tablet/i.test(userAgent);
    
    if (request.uri.match(/\.(jpg|jpeg|png|webp)$/i)) {
        if (isMobile) {
            request.querystring = `${request.querystring}&w=480&q=75`;
        } else if (isTablet) {
            request.querystring = `${request.querystring}&w=768&q=80`;
        }
    }
    
    // 4. A/B Testing cookie
    if (!headers.cookie || !headers.cookie[0].value.includes('ab_test')) {
        const variant = Math.random() < 0.5 ? 'A' : 'B';
        headers.cookie = headers.cookie || [];
        headers.cookie.push({
            key: 'Cookie',
            value: `ab_test=${variant}`
        });
    }
    
    // 5. Geo-routing
    const country = headers['cloudfront-viewer-country'] 
        ? headers['cloudfront-viewer-country'][0].value 
        : 'US';
    
    // Route to nearest origin based on country
    if (['BR', 'AR', 'CL'].includes(country)) {
        request.origin = {
            custom: {
                domainName: 'sa-east-1.spirittours.com',
                port: 443,
                protocol: 'https'
            }
        };
    }
    
    return request;
};

/**
 * Origin Response - Modify responses before caching
 */
exports.originResponse = async (event) => {
    const response = event.Records[0].cf.response;
    const request = event.Records[0].cf.request;
    
    // 1. Add performance headers
    response.headers['x-cache-status'] = [{
        key: 'X-Cache-Status',
        value: response.status === '304' ? 'HIT' : 'MISS'
    }];
    
    response.headers['x-response-time'] = [{
        key: 'X-Response-Time',
        value: `${Date.now() - request.time}ms`
    }];
    
    // 2. Optimize images
    if (request.uri.match(/\.(jpg|jpeg|png)$/i) && response.status === '200') {
        const optimizer = new ImageOptimizer();
        const optimizedBody = await optimizer.optimizeImage(
            response.body,
            {
                width: request.querystring.w,
                height: request.querystring.h,
                quality: request.querystring.q || 85,
                format: request.headers.accept?.[0]?.value
            }
        );
        
        response.body = optimizedBody.toString('base64');
        response.bodyEncoding = 'base64';
        response.headers['content-type'] = [{
            key: 'Content-Type',
            value: 'image/webp'
        }];
    }
    
    // 3. Compression
    if (!response.headers['content-encoding']) {
        response.headers['content-encoding'] = [{
            key: 'Content-Encoding',
            value: 'br' // Brotli compression
        }];
    }
    
    // 4. Cache control based on content type
    const contentType = response.headers['content-type']?.[0]?.value || '';
    
    if (contentType.includes('image/')) {
        response.headers['cache-control'] = [{
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
        }];
    } else if (contentType.includes('text/css') || contentType.includes('javascript')) {
        response.headers['cache-control'] = [{
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=604800'
        }];
    } else if (contentType.includes('text/html')) {
        response.headers['cache-control'] = [{
            key: 'Cache-Control',
            value: 'public, max-age=3600, stale-while-revalidate=86400'
        }];
    }
    
    // 5. Add timing headers for monitoring
    response.headers['server-timing'] = [{
        key: 'Server-Timing',
        value: `cdn;dur=${Date.now() - request.time}`
    }];
    
    return response;
};

// ================== CDN Metrics & Monitoring ==================

class CDNMetrics {
    constructor() {
        this.cloudwatch = new AWS.CloudWatch();
        this.namespace = 'SpiritTours/CDN';
    }
    
    async trackPerformance(metrics) {
        const params = {
            Namespace: this.namespace,
            MetricData: [
                {
                    MetricName: 'CacheHitRate',
                    Value: metrics.hitRate,
                    Unit: 'Percent',
                    Timestamp: new Date()
                },
                {
                    MetricName: 'ResponseTime',
                    Value: metrics.responseTime,
                    Unit: 'Milliseconds',
                    Timestamp: new Date()
                },
                {
                    MetricName: 'BandwidthSaved',
                    Value: metrics.bandwidthSaved,
                    Unit: 'Bytes',
                    Timestamp: new Date()
                },
                {
                    MetricName: 'ImageOptimizationRatio',
                    Value: metrics.compressionRatio,
                    Unit: 'Percent',
                    Timestamp: new Date()
                }
            ]
        };
        
        try {
            await this.cloudwatch.putMetricData(params).promise();
        } catch (error) {
            console.error('Error sending metrics:', error);
        }
    }
    
    async createDashboard() {
        const dashboardBody = {
            widgets: [
                {
                    type: 'metric',
                    properties: {
                        metrics: [
                            ['AWS/CloudFront', 'Requests', { stat: 'Sum' }],
                            ['.', 'BytesDownloaded', { stat: 'Sum', yAxis: 'right' }]
                        ],
                        period: 300,
                        stat: 'Average',
                        region: 'us-east-1',
                        title: 'CDN Traffic'
                    }
                },
                {
                    type: 'metric',
                    properties: {
                        metrics: [
                            ['SpiritTours/CDN', 'CacheHitRate'],
                            ['.', 'ResponseTime', { yAxis: 'right' }]
                        ],
                        period: 300,
                        stat: 'Average',
                        region: 'us-east-1',
                        title: 'Performance Metrics'
                    }
                }
            ]
        };
        
        const params = {
            DashboardName: 'SpiritTours-CDN-Performance',
            DashboardBody: JSON.stringify(dashboardBody)
        };
        
        try {
            await this.cloudwatch.putDashboard(params).promise();
            console.log('CDN dashboard created');
        } catch (error) {
            console.error('Error creating dashboard:', error);
        }
    }
}

// ================== Cache Manager ==================

class CacheManager {
    constructor() {
        this.strategies = {
            'static': {
                ttl: 31536000, // 1 year
                staleWhileRevalidate: 604800 // 1 week
            },
            'dynamic': {
                ttl: 300, // 5 minutes
                staleWhileRevalidate: 60 // 1 minute
            },
            'api': {
                ttl: 60, // 1 minute
                staleWhileRevalidate: 10 // 10 seconds
            },
            'personalized': {
                ttl: 0, // No cache
                staleWhileRevalidate: 0
            }
        };
    }
    
    getCacheHeaders(contentType, path) {
        let strategy = 'dynamic';
        
        // Determine strategy based on content
        if (path.match(/\.(css|js|woff2?|ttf|eot)$/)) {
            strategy = 'static';
        } else if (path.startsWith('/api/')) {
            strategy = 'api';
        } else if (path.includes('/user/') || path.includes('/checkout/')) {
            strategy = 'personalized';
        }
        
        const config = this.strategies[strategy];
        
        return {
            'Cache-Control': `public, max-age=${config.ttl}, stale-while-revalidate=${config.staleWhileRevalidate}`,
            'CDN-Cache-Control': `max-age=${config.ttl}`,
            'Cloudflare-CDN-Cache-Control': `max-age=${config.ttl}`,
            'Surrogate-Control': `max-age=${config.ttl}`,
            'X-Cache-Strategy': strategy
        };
    }
}

// ================== Exports ==================

module.exports = {
    CloudFrontCDNManager,
    ImageOptimizer,
    CDNMetrics,
    CacheManager,
    viewerRequest: exports.viewerRequest,
    originResponse: exports.originResponse
};