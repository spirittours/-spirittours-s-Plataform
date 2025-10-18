# Guía de Configuración de Canales

## WhatsApp Business API

### Requisitos
- Cuenta de Facebook Business
- Número de teléfono verificado
- WhatsApp Business API access

### Configuración
```python
whatsapp_config = {
    "phone_number_id": "YOUR_PHONE_NUMBER_ID",
    "access_token": "YOUR_PAGE_ACCESS_TOKEN",
    "business_account_id": "YOUR_BUSINESS_ACCOUNT_ID",
    "webhook_verify_token": "YOUR_WEBHOOK_VERIFY_TOKEN",
    "api_version": "v18.0",
}

whatsapp = WhatsAppConnector(whatsapp_config)
gateway.register_connector(Channel.WHATSAPP, whatsapp)
```

### Webhook Setup
1. Go to Facebook App Dashboard → WhatsApp → Configuration
2. Set Webhook URL: `https://yoursite.com/api/intelligent-communication/webhook/whatsapp`
3. Set Verify Token: Same as `webhook_verify_token`
4. Subscribe to `messages` events

## Telegram Bot API

### Requisitos
- Telegram account
- Bot Token from @BotFather

### Configuración
```python
telegram_config = {
    "bot_token": "YOUR_BOT_TOKEN",
    "webhook_secret": "YOUR_SECRET_TOKEN",
}

telegram = TelegramConnector(telegram_config)
gateway.register_connector(Channel.TELEGRAM, telegram)

# Set webhook
await telegram.set_webhook("https://yoursite.com/api/intelligent-communication/webhook/telegram")
```

### Crear Bot
1. Chat with @BotFather on Telegram
2. Send `/newbot`
3. Follow instructions
4. Copy token

## Facebook Messenger

### Requisitos
- Facebook Page
- Facebook App
- Page Access Token

### Configuración
```python
facebook_config = {
    "page_access_token": "YOUR_PAGE_ACCESS_TOKEN",
    "app_secret": "YOUR_APP_SECRET",
    "verify_token": "YOUR_WEBHOOK_VERIFY_TOKEN",
    "api_version": "v18.0",
}

facebook = FacebookMessengerConnector(facebook_config)
gateway.register_connector(Channel.FACEBOOK, facebook)
```

### Webhook Setup
1. App Dashboard → Messenger → Settings
2. Webhook URL: `https://yoursite.com/api/intelligent-communication/webhook/facebook`
3. Verify Token: Same as config
4. Subscribe to `messages`, `messaging_postbacks`

## Instagram Direct Messages

### Requisitos
- Instagram Business Account
- Connected to Facebook Page
- Instagram Graph API access

### Configuración
```python
instagram_config = {
    "page_access_token": "YOUR_PAGE_ACCESS_TOKEN",
    "instagram_account_id": "YOUR_IG_ACCOUNT_ID",
    "verify_token": "YOUR_WEBHOOK_VERIFY_TOKEN",
    "api_version": "v18.0",
}

instagram = InstagramConnector(instagram_config)
gateway.register_connector(Channel.INSTAGRAM, instagram)
```

## Testing

```bash
# Test WhatsApp
curl -X POST http://localhost:8000/api/intelligent-communication/test/route-message \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hola, quiero información",
    "user_id": "test_001",
    "channel": "whatsapp"
  }'

# Test Telegram
curl -X POST http://localhost:8000/api/intelligent-communication/test/route-message \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hola, quiero información",
    "user_id": "test_002",
    "channel": "telegram"
  }'
```
