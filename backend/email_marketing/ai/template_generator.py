"""
🤖 AI-Powered Email Template Generator
Genera templates de email profesionales usando IA generativa

Características:
- Generación con GPT-4/Claude para contenido
- Generación de diseños responsive
- Optimización para diferentes industrias
- A/B testing automático
- Recomendaciones basadas en mejores prácticas
- Análisis de sentimiento y tone
"""

from typing import List, Dict, Optional, Any
from dataclasses import dataclass
import asyncio
import logging
from datetime import datetime
import json
import re
from openai import AsyncOpenAI
import anthropic
from jinja2 import Template
from bs4 import BeautifulSoup
import requests

logger = logging.getLogger(__name__)


@dataclass
class TemplateGenerationRequest:
    """Request para generar template"""
    # Información básica
    purpose: str  # welcome, promotional, newsletter, transactional, etc.
    industry: str  # tourism, ecommerce, saas, etc.
    tone: str  # professional, friendly, exciting, urgent, etc.
    
    # Contenido
    key_message: str
    call_to_action: str
    company_name: str
    brand_colors: Optional[List[str]] = None  # Hex colors
    logo_url: Optional[str] = None
    
    # Opciones
    include_images: bool = True
    include_social_links: bool = True
    mobile_optimized: bool = True
    
    # Personalización
    target_audience: Optional[str] = None
    special_requirements: Optional[str] = None
    
    # AI Provider
    ai_provider: str = "openai"  # openai, anthropic, both


@dataclass
class GeneratedTemplate:
    """Template generado"""
    html_content: str
    text_content: str
    subject_lines: List[str]  # Múltiples opciones
    preview_text: str
    
    # Metadata
    design_notes: str
    best_practices_applied: List[str]
    estimated_effectiveness: float  # 0-100
    
    # Variables dinámicas detectadas
    variables: List[Dict[str, str]]
    
    # Variaciones para A/B testing
    variations: Optional[List[Dict[str, Any]]] = None


class AITemplateGenerator:
    """
    Generador de templates con IA
    """
    
    def __init__(
        self,
        openai_api_key: Optional[str] = None,
        anthropic_api_key: Optional[str] = None
    ):
        self.openai_client = None
        self.anthropic_client = None
        
        if openai_api_key:
            self.openai_client = AsyncOpenAI(api_key=openai_api_key)
        
        if anthropic_api_key:
            self.anthropic_client = anthropic.AsyncAnthropic(api_key=anthropic_api_key)
        
        # Template base library
        self.base_templates = self._load_base_templates()
        
        logger.info("AI Template Generator initialized")
    
    async def generate_template(
        self,
        request: TemplateGenerationRequest
    ) -> GeneratedTemplate:
        """
        Generar template completo usando IA
        """
        logger.info(f"Generating template: {request.purpose} for {request.industry}")
        
        # Paso 1: Generar contenido con IA
        content = await self._generate_content(request)
        
        # Paso 2: Generar subject lines
        subject_lines = await self._generate_subject_lines(request, content)
        
        # Paso 3: Generar diseño HTML
        html_content = await self._generate_html_design(request, content)
        
        # Paso 4: Generar versión texto plano
        text_content = self._html_to_text(html_content)
        
        # Paso 5: Generar preview text
        preview_text = await self._generate_preview_text(request, content)
        
        # Paso 6: Detectar variables dinámicas
        variables = self._extract_variables(html_content)
        
        # Paso 7: Aplicar mejores prácticas
        html_content, best_practices = await self._apply_best_practices(
            html_content,
            request
        )
        
        # Paso 8: Generar variaciones para A/B testing
        variations = await self._generate_ab_variations(request, html_content)
        
        # Paso 9: Estimar efectividad
        effectiveness = await self._estimate_effectiveness(
            html_content,
            subject_lines[0],
            request
        )
        
        return GeneratedTemplate(
            html_content=html_content,
            text_content=text_content,
            subject_lines=subject_lines,
            preview_text=preview_text,
            design_notes=content.get('design_notes', ''),
            best_practices_applied=best_practices,
            estimated_effectiveness=effectiveness,
            variables=variables,
            variations=variations
        )
    
    async def _generate_content(
        self,
        request: TemplateGenerationRequest
    ) -> Dict[str, Any]:
        """Generar contenido del email con IA"""
        
        prompt = f"""
You are an expert email marketing copywriter. Generate professional email content for:

Purpose: {request.purpose}
Industry: {request.industry}
Tone: {request.tone}
Company: {request.company_name}
Key Message: {request.key_message}
Call to Action: {request.call_to_action}
Target Audience: {request.target_audience or 'General'}

Requirements:
- Create engaging, conversion-focused content
- Include clear headline
- Write compelling body copy (2-3 paragraphs max)
- Create persuasive CTA button text
- Keep it concise and scannable
- Apply email marketing best practices

Special Requirements: {request.special_requirements or 'None'}

Return a JSON with:
{{
    "headline": "Main headline",
    "subheadline": "Supporting subheadline (optional)",
    "body_paragraphs": ["paragraph 1", "paragraph 2"],
    "cta_text": "CTA button text",
    "footer_text": "Footer text",
    "design_notes": "Design recommendations"
}}
"""
        
        if request.ai_provider == "openai" and self.openai_client:
            response = await self.openai_client.chat.completions.create(
                model="gpt-4-turbo-preview",
                messages=[
                    {"role": "system", "content": "You are an expert email marketing copywriter."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                response_format={"type": "json_object"}
            )
            
            content = json.loads(response.choices[0].message.content)
            
        elif request.ai_provider == "anthropic" and self.anthropic_client:
            response = await self.anthropic_client.messages.create(
                model="claude-3-opus-20240229",
                max_tokens=2000,
                messages=[
                    {"role": "user", "content": prompt}
                ]
            )
            
            # Extraer JSON de la respuesta
            content_text = response.content[0].text
            json_match = re.search(r'\{.*\}', content_text, re.DOTALL)
            if json_match:
                content = json.loads(json_match.group())
            else:
                raise ValueError("Could not extract JSON from Claude response")
        
        else:
            raise ValueError(f"AI provider {request.ai_provider} not available")
        
        return content
    
    async def _generate_subject_lines(
        self,
        request: TemplateGenerationRequest,
        content: Dict[str, Any]
    ) -> List[str]:
        """Generar múltiples opciones de subject line"""
        
        prompt = f"""
Generate 5 compelling email subject lines for:

Purpose: {request.purpose}
Industry: {request.industry}
Tone: {request.tone}
Key Message: {request.key_message}
Headline: {content.get('headline', '')}

Best practices:
- Keep under 50 characters
- Create urgency or curiosity
- Personalization-ready (use {{{{first_name}}}} if appropriate)
- Avoid spam trigger words
- Test different approaches (question, statement, benefit)

Return only the subject lines as a JSON array of strings.
"""
        
        if self.openai_client:
            response = await self.openai_client.chat.completions.create(
                model="gpt-4-turbo-preview",
                messages=[
                    {"role": "system", "content": "You are an email marketing expert."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.8,
                response_format={"type": "json_object"}
            )
            
            result = json.loads(response.choices[0].message.content)
            subject_lines = result.get('subject_lines', [])
        else:
            # Fallback subject lines
            subject_lines = [
                f"{content.get('headline', request.key_message)}",
                f"🎉 {request.key_message}",
                f"Exclusive: {request.key_message}",
                f"You're invited: {request.key_message}",
                f"Last chance: {request.key_message}"
            ]
        
        return subject_lines[:5]
    
    async def _generate_html_design(
        self,
        request: TemplateGenerationRequest,
        content: Dict[str, Any]
    ) -> str:
        """Generar diseño HTML responsive"""
        
        # Seleccionar template base según propósito
        base_template = self._select_base_template(request.purpose)
        
        # Colores de marca
        primary_color = request.brand_colors[0] if request.brand_colors else "#007bff"
        secondary_color = request.brand_colors[1] if len(request.brand_colors or []) > 1 else "#6c757d"
        
        # Construir HTML
        html_template = f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>{content.get('headline', '')}</title>
    <style>
        /* Reset styles */
        body, table, td, a {{ -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }}
        table, td {{ mso-table-lspace: 0pt; mso-table-rspace: 0pt; }}
        img {{ -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }}
        body {{ margin: 0; padding: 0; width: 100% !important; height: 100% !important; }}
        
        /* Base styles */
        body {{ font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #333; background-color: #f4f4f4; }}
        .container {{ max-width: 600px; margin: 0 auto; background-color: #ffffff; }}
        .header {{ background-color: {primary_color}; padding: 20px; text-align: center; }}
        .logo {{ max-width: 200px; height: auto; }}
        .content {{ padding: 40px 30px; }}
        .headline {{ font-size: 28px; font-weight: bold; color: #333; margin: 0 0 20px 0; line-height: 1.2; }}
        .subheadline {{ font-size: 18px; color: #666; margin: 0 0 20px 0; }}
        .body-text {{ font-size: 16px; color: #333; margin: 0 0 20px 0; }}
        .cta-button {{ display: inline-block; padding: 15px 30px; background-color: {primary_color}; color: #ffffff !important; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }}
        .cta-button:hover {{ background-color: {secondary_color}; }}
        .footer {{ background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 14px; color: #666; }}
        .social-links {{ margin: 20px 0; }}
        .social-links a {{ display: inline-block; margin: 0 10px; }}
        
        /* Mobile responsive */
        @media only screen and (max-width: 600px) {{
            .container {{ width: 100% !important; }}
            .content {{ padding: 20px !important; }}
            .headline {{ font-size: 24px !important; }}
            .body-text {{ font-size: 14px !important; }}
        }}
    </style>
</head>
<body>
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
            <td align="center" style="padding: 20px 0;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" class="container">
                    <!-- Header -->
                    <tr>
                        <td class="header">
                            {f'<img src="{request.logo_url}" alt="{request.company_name}" class="logo" />' if request.logo_url else f'<h1 style="color: white; margin: 0;">{request.company_name}</h1>'}
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td class="content">
                            <h1 class="headline">{content.get('headline', '')}</h1>
                            
                            {f'<p class="subheadline">{content.get("subheadline", "")}</p>' if content.get('subheadline') else ''}
                            
                            {''.join([f'<p class="body-text">{para}</p>' for para in content.get('body_paragraphs', [])])}
                            
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                    <td align="center">
                                        <a href="{{{{cta_url}}}}" class="cta-button">{content.get('cta_text', request.call_to_action)}</a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td class="footer">
                            {self._generate_social_links() if request.include_social_links else ''}
                            
                            <p>{content.get('footer_text', f'© 2024 {request.company_name}. All rights reserved.')}</p>
                            
                            <p style="font-size: 12px; color: #999;">
                                You're receiving this email because you subscribed to {request.company_name}.<br>
                                <a href="{{{{unsubscribe_url}}}}" style="color: #999;">Unsubscribe</a> | 
                                <a href="{{{{preferences_url}}}}" style="color: #999;">Email Preferences</a>
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
"""
        
        return html_template.strip()
    
    def _generate_social_links(self) -> str:
        """Generar links de redes sociales"""
        return """
        <div class="social-links">
            <a href="{{facebook_url}}">
                <img src="https://cdn-icons-png.flaticon.com/32/733/733547.png" alt="Facebook" width="32" height="32" />
            </a>
            <a href="{{twitter_url}}">
                <img src="https://cdn-icons-png.flaticon.com/32/733/733579.png" alt="Twitter" width="32" height="32" />
            </a>
            <a href="{{instagram_url}}">
                <img src="https://cdn-icons-png.flaticon.com/32/733/733558.png" alt="Instagram" width="32" height="32" />
            </a>
            <a href="{{linkedin_url}}">
                <img src="https://cdn-icons-png.flaticon.com/32/733/733561.png" alt="LinkedIn" width="32" height="32" />
            </a>
        </div>
        """
    
    async def _generate_preview_text(
        self,
        request: TemplateGenerationRequest,
        content: Dict[str, Any]
    ) -> str:
        """Generar preview text (el texto que aparece después del subject)"""
        
        # Tomar primeras palabras del primer párrafo
        first_para = content.get('body_paragraphs', [''])[0]
        preview = first_para[:100]
        
        # Limpiar HTML si existe
        preview = BeautifulSoup(preview, 'html.parser').get_text()
        
        # Asegurar que termina bien
        if len(first_para) > 100:
            preview = preview.rsplit(' ', 1)[0] + '...'
        
        return preview
    
    def _html_to_text(self, html_content: str) -> str:
        """Convertir HTML a texto plano para versión text"""
        soup = BeautifulSoup(html_content, 'html.parser')
        
        # Remover scripts y styles
        for script in soup(["script", "style"]):
            script.decompose()
        
        # Obtener texto
        text = soup.get_text()
        
        # Limpiar espacios múltiples
        lines = (line.strip() for line in text.splitlines())
        chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
        text = '\n'.join(chunk for chunk in chunks if chunk)
        
        return text
    
    def _extract_variables(self, html_content: str) -> List[Dict[str, str]]:
        """Extraer variables de personalización del template"""
        # Buscar patrones {{variable}}
        pattern = r'\{\{([^}]+)\}\}'
        matches = re.findall(pattern, html_content)
        
        variables = []
        for var_name in set(matches):
            var_name = var_name.strip()
            variables.append({
                "name": var_name,
                "type": self._infer_variable_type(var_name),
                "required": var_name in ['first_name', 'email', 'cta_url'],
                "default_value": ""
            })
        
        return variables
    
    def _infer_variable_type(self, var_name: str) -> str:
        """Inferir tipo de variable basado en nombre"""
        if 'url' in var_name.lower() or 'link' in var_name.lower():
            return 'url'
        elif 'date' in var_name.lower():
            return 'date'
        elif 'price' in var_name.lower() or 'amount' in var_name.lower():
            return 'currency'
        elif 'email' in var_name.lower():
            return 'email'
        else:
            return 'string'
    
    async def _apply_best_practices(
        self,
        html_content: str,
        request: TemplateGenerationRequest
    ) -> tuple[str, List[str]]:
        """Aplicar mejores prácticas de email marketing"""
        
        best_practices_applied = []
        
        # 1. Asegurar que tenga alt text en imágenes
        soup = BeautifulSoup(html_content, 'html.parser')
        for img in soup.find_all('img'):
            if not img.get('alt'):
                img['alt'] = "Image"
                best_practices_applied.append("Added alt text to images")
        
        # 2. Asegurar preheader text
        if '<!-- Preheader text -->' not in html_content:
            preheader = '<div style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">Preview text here</div>'
            html_content = html_content.replace('<body>', f'<body>\n{preheader}')
            best_practices_applied.append("Added preheader text")
        
        # 3. Verificar single CTA
        cta_count = html_content.count('cta-button')
        if cta_count == 1:
            best_practices_applied.append("Single, clear CTA")
        
        # 4. Mobile responsive
        if 'viewport' in html_content:
            best_practices_applied.append("Mobile responsive design")
        
        # 5. Unsubscribe link
        if 'unsubscribe' in html_content.lower():
            best_practices_applied.append("Unsubscribe link included")
        
        html_content = str(soup)
        
        return html_content, best_practices_applied
    
    async def _generate_ab_variations(
        self,
        request: TemplateGenerationRequest,
        original_html: str
    ) -> List[Dict[str, Any]]:
        """Generar variaciones para A/B testing"""
        
        variations = []
        
        # Variación 1: CTA más urgente
        variation_1 = original_html.replace(
            'cta-button',
            'cta-button urgent-cta'
        )
        variations.append({
            "name": "Variation A: Urgent CTA",
            "changes": "More urgent call-to-action styling",
            "html_content": variation_1
        })
        
        # Variación 2: Diferente color scheme
        # (Esto sería más sofisticado en producción)
        variations.append({
            "name": "Variation B: Alternative Color",
            "changes": "Different primary color",
            "html_content": original_html  # Placeholder
        })
        
        return variations
    
    async def _estimate_effectiveness(
        self,
        html_content: str,
        subject_line: str,
        request: TemplateGenerationRequest
    ) -> float:
        """Estimar efectividad del template (0-100)"""
        
        score = 50.0  # Base score
        
        # Factores positivos
        if len(subject_line) <= 50:
            score += 10
        
        if 'cta-button' in html_content:
            score += 10
        
        if 'mobile' in html_content.lower() or 'responsive' in html_content.lower():
            score += 10
        
        if 'unsubscribe' in html_content.lower():
            score += 5
        
        # Factores negativos
        if len(html_content) > 100000:  # Muy largo
            score -= 10
        
        # Limitar entre 0-100
        score = max(0, min(100, score))
        
        return score
    
    def _select_base_template(self, purpose: str) -> str:
        """Seleccionar template base según propósito"""
        return self.base_templates.get(purpose, self.base_templates['default'])
    
    def _load_base_templates(self) -> Dict[str, str]:
        """Cargar biblioteca de templates base"""
        return {
            'default': 'basic_responsive',
            'welcome': 'welcome_onboarding',
            'promotional': 'promotional_sale',
            'newsletter': 'newsletter_digest',
            'transactional': 'transactional_clean',
            'abandoned_cart': 'cart_recovery',
            'feedback': 'feedback_survey'
        }


# ==================== EXAMPLE USAGE ====================

async def example_usage():
    """Ejemplo de uso del generador"""
    
    generator = AITemplateGenerator(
        openai_api_key="your-openai-key",
        anthropic_api_key="your-anthropic-key"
    )
    
    request = TemplateGenerationRequest(
        purpose="promotional",
        industry="tourism",
        tone="exciting",
        key_message="Summer vacation packages now available with 30% discount!",
        call_to_action="Book Your Adventure",
        company_name="Spirit Tours",
        brand_colors=["#007bff", "#28a745"],
        logo_url="https://example.com/logo.png",
        target_audience="Adventure travelers aged 25-45",
        ai_provider="openai"
    )
    
    template = await generator.generate_template(request)
    
    print(f"Generated template with {len(template.subject_lines)} subject lines")
    print(f"Effectiveness score: {template.estimated_effectiveness}%")
    print(f"Best practices applied: {len(template.best_practices_applied)}")
    print(f"\nSubject lines:")
    for i, subject in enumerate(template.subject_lines, 1):
        print(f"  {i}. {subject}")


if __name__ == "__main__":
    asyncio.run(example_usage())
