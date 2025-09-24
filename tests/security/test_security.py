"""
Security Tests para Spirit Tours Platform
Tests de seguridad para endpoints, autenticación, autorización y vulnerabilidades.
"""
import pytest
import asyncio
import json
import hashlib
import jwt
import time
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
import random
import string

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.config import settings
from backend.core.security import create_access_token, verify_password, get_password_hash
from backend.models.user import User, UserRole
from tests.conftest import get_test_db_session


@dataclass
class SecurityTestResult:
    """Resultado de test de seguridad"""
    test_name: str
    passed: bool
    vulnerability_found: bool
    severity: str  # low, medium, high, critical
    description: str
    recommendation: str


class SecurityTester:
    """Tester para seguridad de la aplicación"""
    
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.client = httpx.AsyncClient(base_url=base_url)
        self.results: List[SecurityTestResult] = []
    
    async def __aenter__(self):
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.client.aclose()
    
    def generate_malicious_payloads(self) -> List[str]:
        """Generar payloads maliciosos para tests"""
        return [
            # SQL Injection payloads
            "' OR '1'='1",
            "'; DROP TABLE users; --",
            "' UNION SELECT * FROM users --",
            "1' AND (SELECT COUNT(*) FROM users) > 0 --",
            
            # XSS payloads
            "<script>alert('xss')</script>",
            "<img src=x onerror=alert('xss')>",
            "javascript:alert('xss')",
            "<svg onload=alert('xss')>",
            
            # Command Injection payloads
            "; ls -la",
            "| cat /etc/passwd",
            "&& whoami",
            "`id`",
            
            # Path Traversal payloads
            "../../../etc/passwd",
            "..\\..\\..\\windows\\system32\\config\\sam",
            "/etc/passwd%00.jpg",
            
            # LDAP Injection payloads
            "*)(uid=*))(|(uid=*",
            "*)(objectClass=*",
            
            # NoSQL Injection payloads
            "{'$ne': null}",
            "{'$gt': ''}",
            "{'$regex': '.*'}",
            
            # XXE payloads
            '<!DOCTYPE foo [<!ELEMENT foo ANY ><!ENTITY xxe SYSTEM "file:///etc/passwd" >]><foo>&xxe;</foo>',
            
            # SSTI payloads
            "{{7*7}}",
            "${7*7}",
            "<%=7*7%>",
            
            # Buffer overflow attempts
            "A" * 1000,
            "A" * 10000,
            
            # Format string attacks
            "%n%n%n%n",
            "%s%s%s%s",
            
            # Null byte injection
            "test\x00.php",
            "file.txt\0.exe"
        ]
    
    async def test_sql_injection_vulnerabilities(self) -> List[SecurityTestResult]:
        """Test de vulnerabilidades de SQL Injection"""
        results = []
        sql_payloads = [
            "' OR '1'='1",
            "'; DROP TABLE users; --",
            "' UNION SELECT * FROM users --",
            "1' AND SLEEP(5) --",
            "' OR 1=1#"
        ]
        
        # Endpoints susceptibles a SQL injection
        test_endpoints = [
            ("/api/tours/search", "GET", {"location": ""}),
            ("/api/customers/search", "GET", {"email": ""}),
            ("/api/reservations/search", "GET", {"customer_id": ""}),
            ("/api/analytics/reports/query", "POST", {"query_type": ""})
        ]
        
        for endpoint, method, params in test_endpoints:
            for payload in sql_payloads:
                try:
                    # Probar payload en cada parámetro
                    for param_name in params.keys():
                        test_params = params.copy()
                        test_params[param_name] = payload
                        
                        if method == "GET":
                            response = await self.client.get(endpoint, params=test_params)
                        else:
                            response = await self.client.post(endpoint, json=test_params)
                        
                        # Buscar indicadores de SQL injection
                        response_text = response.text.lower()
                        sql_errors = [
                            "sql syntax", "mysql error", "postgresql error",
                            "ora-", "microsoft odbc", "sqlite error",
                            "syntax error", "database error"
                        ]
                        
                        vulnerability_found = any(error in response_text for error in sql_errors)
                        
                        if vulnerability_found or response.status_code == 500:
                            results.append(SecurityTestResult(
                                test_name=f"SQL Injection - {endpoint} - {param_name}",
                                passed=False,
                                vulnerability_found=True,
                                severity="high",
                                description=f"Possible SQL injection vulnerability in {param_name} parameter",
                                recommendation="Use parameterized queries and input validation"
                            ))
                        else:
                            results.append(SecurityTestResult(
                                test_name=f"SQL Injection - {endpoint} - {param_name}",
                                passed=True,
                                vulnerability_found=False,
                                severity="info",
                                description=f"No SQL injection vulnerability detected in {param_name}",
                                recommendation="Continue monitoring for SQL injection attempts"
                            ))
                            
                except Exception as e:
                    results.append(SecurityTestResult(
                        test_name=f"SQL Injection - {endpoint} - Error",
                        passed=False,
                        vulnerability_found=False,
                        severity="medium",
                        description=f"Error testing SQL injection: {e}",
                        recommendation="Review error handling and logging"
                    ))
        
        return results
    
    async def test_xss_vulnerabilities(self) -> List[SecurityTestResult]:
        """Test de vulnerabilidades XSS"""
        results = []
        xss_payloads = [
            "<script>alert('xss')</script>",
            "<img src=x onerror=alert('xss')>",
            "javascript:alert('xss')",
            "<svg onload=alert('xss')>",
            "<iframe src=javascript:alert('xss')></iframe>"
        ]
        
        # Endpoints que devuelven contenido HTML o JSON con datos de usuario
        test_endpoints = [
            ("/api/tours", "POST", {"title": "", "description": ""}),
            ("/api/customers", "POST", {"first_name": "", "last_name": ""}),
            ("/api/reservations", "POST", {"special_requests": ""})
        ]
        
        for endpoint, method, data in test_endpoints:
            for payload in xss_payloads:
                try:
                    # Probar payload en cada campo
                    for field_name in data.keys():
                        test_data = data.copy()
                        test_data[field_name] = payload
                        
                        response = await self.client.post(endpoint, json=test_data)
                        
                        # Verificar si el payload se refleja sin escape
                        response_text = response.text
                        if payload in response_text and "<script>" in payload:
                            results.append(SecurityTestResult(
                                test_name=f"XSS - {endpoint} - {field_name}",
                                passed=False,
                                vulnerability_found=True,
                                severity="high",
                                description=f"Reflected XSS vulnerability in {field_name} field",
                                recommendation="Implement proper input sanitization and output encoding"
                            ))
                        else:
                            results.append(SecurityTestResult(
                                test_name=f"XSS - {endpoint} - {field_name}",
                                passed=True,
                                vulnerability_found=False,
                                severity="info",
                                description=f"No XSS vulnerability detected in {field_name}",
                                recommendation="Continue monitoring for XSS attempts"
                            ))
                            
                except Exception as e:
                    results.append(SecurityTestResult(
                        test_name=f"XSS - {endpoint} - Error",
                        passed=False,
                        vulnerability_found=False,
                        severity="medium",
                        description=f"Error testing XSS: {e}",
                        recommendation="Review error handling"
                    ))
        
        return results
    
    async def test_authentication_security(self) -> List[SecurityTestResult]:
        """Test de seguridad en autenticación"""
        results = []
        
        # Test 1: Brute force protection
        login_attempts = []
        for i in range(10):  # 10 intentos rápidos
            try:
                response = await self.client.post("/api/auth/login", json={
                    "username": "admin",
                    "password": "wrongpassword123"
                })
                login_attempts.append(response.status_code)
                await asyncio.sleep(0.1)  # 100ms between attempts
            except:
                pass
        
        # Verificar si hay protección contra brute force
        if len([status for status in login_attempts if status == 429]) == 0:
            results.append(SecurityTestResult(
                test_name="Brute Force Protection",
                passed=False,
                vulnerability_found=True,
                severity="medium",
                description="No rate limiting detected for login attempts",
                recommendation="Implement rate limiting and account lockout mechanisms"
            ))
        else:
            results.append(SecurityTestResult(
                test_name="Brute Force Protection",
                passed=True,
                vulnerability_found=False,
                severity="info",
                description="Rate limiting protection detected",
                recommendation="Continue monitoring login attempts"
            ))
        
        # Test 2: Password strength requirements
        weak_passwords = ["123", "password", "admin", "test", "123456"]
        for weak_password in weak_passwords:
            try:
                response = await self.client.post("/api/auth/register", json={
                    "username": f"testuser_{random.randint(1000, 9999)}",
                    "email": f"test_{random.randint(1000, 9999)}@test.com",
                    "password": weak_password
                })
                
                if response.status_code == 201:
                    results.append(SecurityTestResult(
                        test_name=f"Password Strength - {weak_password}",
                        passed=False,
                        vulnerability_found=True,
                        severity="medium",
                        description=f"Weak password '{weak_password}' was accepted",
                        recommendation="Implement strong password requirements"
                    ))
                else:
                    results.append(SecurityTestResult(
                        test_name=f"Password Strength - {weak_password}",
                        passed=True,
                        vulnerability_found=False,
                        severity="info",
                        description=f"Weak password '{weak_password}' was rejected",
                        recommendation="Continue enforcing strong passwords"
                    ))
                    
            except Exception as e:
                pass
        
        # Test 3: JWT Token Security
        try:
            # Intentar usar token expirado
            expired_token = jwt.encode({
                'sub': 'test_user',
                'exp': int(time.time()) - 3600  # Expirado hace 1 hora
            }, 'fake_secret', algorithm='HS256')
            
            response = await self.client.get(
                "/api/auth/me",
                headers={"Authorization": f"Bearer {expired_token}"}
            )
            
            if response.status_code == 200:
                results.append(SecurityTestResult(
                    test_name="JWT Token Expiration",
                    passed=False,
                    vulnerability_found=True,
                    severity="high",
                    description="Expired JWT token was accepted",
                    recommendation="Verify token expiration on all protected endpoints"
                ))
            else:
                results.append(SecurityTestResult(
                    test_name="JWT Token Expiration",
                    passed=True,
                    vulnerability_found=False,
                    severity="info",
                    description="Expired JWT token was properly rejected",
                    recommendation="Continue validating token expiration"
                ))
                
        except Exception as e:
            pass
        
        return results
    
    async def test_authorization_security(self) -> List[SecurityTestResult]:
        """Test de seguridad en autorización"""
        results = []
        
        # Crear tokens de prueba para diferentes roles
        admin_token = create_access_token(data={"sub": "admin", "role": "admin"})
        user_token = create_access_token(data={"sub": "user", "role": "user"})
        
        # Endpoints que requieren autorización específica
        admin_only_endpoints = [
            ("/api/admin/users", "GET"),
            ("/api/admin/analytics", "GET"),
            ("/api/admin/system/health", "GET")
        ]
        
        # Test: Usuario normal intentando acceder a endpoints de admin
        for endpoint, method in admin_only_endpoints:
            try:
                headers = {"Authorization": f"Bearer {user_token}"}
                
                if method == "GET":
                    response = await self.client.get(endpoint, headers=headers)
                else:
                    response = await self.client.post(endpoint, headers=headers)
                
                if response.status_code == 200:
                    results.append(SecurityTestResult(
                        test_name=f"Authorization - {endpoint}",
                        passed=False,
                        vulnerability_found=True,
                        severity="high",
                        description=f"Regular user can access admin endpoint: {endpoint}",
                        recommendation="Implement proper role-based access control"
                    ))
                elif response.status_code == 403:
                    results.append(SecurityTestResult(
                        test_name=f"Authorization - {endpoint}",
                        passed=True,
                        vulnerability_found=False,
                        severity="info",
                        description=f"Access properly denied for admin endpoint: {endpoint}",
                        recommendation="Continue enforcing role-based access"
                    ))
                    
            except Exception as e:
                pass
        
        # Test: Acceso sin token
        for endpoint, method in admin_only_endpoints:
            try:
                if method == "GET":
                    response = await self.client.get(endpoint)
                else:
                    response = await self.client.post(endpoint)
                
                if response.status_code == 200:
                    results.append(SecurityTestResult(
                        test_name=f"No Auth - {endpoint}",
                        passed=False,
                        vulnerability_found=True,
                        severity="critical",
                        description=f"Endpoint accessible without authentication: {endpoint}",
                        recommendation="Require authentication for all protected endpoints"
                    ))
                else:
                    results.append(SecurityTestResult(
                        test_name=f"No Auth - {endpoint}",
                        passed=True,
                        vulnerability_found=False,
                        severity="info",
                        description=f"Authentication properly required for: {endpoint}",
                        recommendation="Continue requiring authentication"
                    ))
                    
            except Exception as e:
                pass
        
        return results
    
    async def test_input_validation_security(self) -> List[SecurityTestResult]:
        """Test de validación de entrada"""
        results = []
        
        # Test de límites de entrada
        oversized_data = {
            "title": "A" * 10000,  # String muy largo
            "description": "B" * 100000,
            "email": "C" * 1000 + "@test.com"
        }
        
        test_endpoints = [
            ("/api/tours", "POST", {"title": oversized_data["title"]}),
            ("/api/customers", "POST", {"email": oversized_data["email"]}),
        ]
        
        for endpoint, method, data in test_endpoints:
            try:
                response = await self.client.post(endpoint, json=data)
                
                # Verificar si acepta datos oversized
                if response.status_code == 201:
                    results.append(SecurityTestResult(
                        test_name=f"Input Size Validation - {endpoint}",
                        passed=False,
                        vulnerability_found=True,
                        severity="medium",
                        description="Oversized input was accepted",
                        recommendation="Implement input size limits"
                    ))
                elif response.status_code == 422:
                    results.append(SecurityTestResult(
                        test_name=f"Input Size Validation - {endpoint}",
                        passed=True,
                        vulnerability_found=False,
                        severity="info",
                        description="Oversized input was properly rejected",
                        recommendation="Continue validating input sizes"
                    ))
                    
            except Exception as e:
                pass
        
        # Test de tipos de datos inválidos
        invalid_data_types = [
            {"participants": "not_a_number"},
            {"price_per_person": "invalid_decimal"},
            {"date_of_birth": "invalid_date"},
            {"phone": 123456},  # Should be string
        ]
        
        for invalid_data in invalid_data_types:
            try:
                response = await self.client.post("/api/customers", json=invalid_data)
                
                if response.status_code == 201:
                    results.append(SecurityTestResult(
                        test_name=f"Data Type Validation",
                        passed=False,
                        vulnerability_found=True,
                        severity="medium",
                        description="Invalid data types were accepted",
                        recommendation="Implement strict data type validation"
                    ))
                    
            except Exception as e:
                pass
        
        return results
    
    async def test_data_exposure_security(self) -> List[SecurityTestResult]:
        """Test de exposición de datos sensibles"""
        results = []
        
        # Test: Información sensible en respuestas de error
        try:
            response = await self.client.get("/api/nonexistent")
            error_text = response.text.lower()
            
            sensitive_info = [
                "password", "secret", "key", "token",
                "database", "internal", "debug", "traceback"
            ]
            
            exposed_info = [info for info in sensitive_info if info in error_text]
            
            if exposed_info:
                results.append(SecurityTestResult(
                    test_name="Information Disclosure in Errors",
                    passed=False,
                    vulnerability_found=True,
                    severity="medium",
                    description=f"Sensitive information exposed in error: {exposed_info}",
                    recommendation="Sanitize error messages for production"
                ))
            else:
                results.append(SecurityTestResult(
                    test_name="Information Disclosure in Errors",
                    passed=True,
                    vulnerability_found=False,
                    severity="info",
                    description="No sensitive information in error messages",
                    recommendation="Continue monitoring error message content"
                ))
                
        except Exception as e:
            pass
        
        # Test: Endpoints que no deberían exponer datos sensibles
        try:
            response = await self.client.get("/api/customers/1")
            if response.status_code == 200:
                customer_data = response.json()
                
                # Verificar que no se expongan campos sensibles
                sensitive_fields = ['password', 'ssn', 'credit_card', 'internal_id']
                exposed_fields = [field for field in sensitive_fields if field in customer_data]
                
                if exposed_fields:
                    results.append(SecurityTestResult(
                        test_name="Sensitive Data Exposure",
                        passed=False,
                        vulnerability_found=True,
                        severity="high",
                        description=f"Sensitive fields exposed: {exposed_fields}",
                        recommendation="Remove sensitive fields from API responses"
                    ))
                    
        except Exception as e:
            pass
        
        return results
    
    def generate_security_report(self) -> Dict[str, Any]:
        """Generar reporte de seguridad consolidado"""
        total_tests = len(self.results)
        vulnerabilities_found = len([r for r in self.results if r.vulnerability_found])
        
        severity_counts = {
            "critical": len([r for r in self.results if r.severity == "critical"]),
            "high": len([r for r in self.results if r.severity == "high"]),
            "medium": len([r for r in self.results if r.severity == "medium"]),
            "low": len([r for r in self.results if r.severity == "low"])
        }
        
        # Calculate security score
        score = 100
        score -= severity_counts["critical"] * 25
        score -= severity_counts["high"] * 15
        score -= severity_counts["medium"] * 10
        score -= severity_counts["low"] * 5
        score = max(0, score)
        
        return {
            "timestamp": datetime.now().isoformat(),
            "summary": {
                "total_tests": total_tests,
                "vulnerabilities_found": vulnerabilities_found,
                "security_score": score,
                "grade": self._get_security_grade(score)
            },
            "severity_breakdown": severity_counts,
            "vulnerabilities": [
                {
                    "test_name": r.test_name,
                    "severity": r.severity,
                    "description": r.description,
                    "recommendation": r.recommendation
                }
                for r in self.results if r.vulnerability_found
            ],
            "recommendations": self._get_top_recommendations()
        }
    
    def _get_security_grade(self, score: int) -> str:
        """Calcular grade de seguridad"""
        if score >= 90:
            return "A"
        elif score >= 80:
            return "B"
        elif score >= 70:
            return "C"
        elif score >= 60:
            return "D"
        else:
            return "F"
    
    def _get_top_recommendations(self) -> List[str]:
        """Obtener las recomendaciones principales"""
        recommendations = []
        
        critical_vulns = [r for r in self.results if r.severity == "critical"]
        high_vulns = [r for r in self.results if r.severity == "high"]
        
        if critical_vulns:
            recommendations.append("CRITICAL: Address critical vulnerabilities immediately")
        
        if high_vulns:
            recommendations.append("HIGH: Implement proper input validation and authentication")
        
        recommendations.extend([
            "Implement comprehensive logging and monitoring",
            "Regular security testing and code review",
            "Keep all dependencies updated",
            "Implement proper error handling",
            "Use HTTPS for all communications"
        ])
        
        return recommendations[:5]


class TestSecuritySuite:
    """Suite completa de tests de seguridad"""
    
    @pytest.mark.asyncio
    @pytest.mark.security
    async def test_comprehensive_security_assessment(self):
        """
        Evaluación completa de seguridad de la aplicación
        """
        async with SecurityTester() as tester:
            
            print("🔐 Starting comprehensive security assessment...")
            
            # Ejecutar todos los tests de seguridad
            all_results = []
            
            # Test 1: SQL Injection
            print("  Testing SQL Injection vulnerabilities...")
            sql_results = await tester.test_sql_injection_vulnerabilities()
            all_results.extend(sql_results)
            tester.results.extend(sql_results)
            
            # Test 2: XSS
            print("  Testing XSS vulnerabilities...")
            xss_results = await tester.test_xss_vulnerabilities()
            all_results.extend(xss_results)
            tester.results.extend(xss_results)
            
            # Test 3: Authentication
            print("  Testing authentication security...")
            auth_results = await tester.test_authentication_security()
            all_results.extend(auth_results)
            tester.results.extend(auth_results)
            
            # Test 4: Authorization
            print("  Testing authorization security...")
            authz_results = await tester.test_authorization_security()
            all_results.extend(authz_results)
            tester.results.extend(authz_results)
            
            # Test 5: Input Validation
            print("  Testing input validation...")
            input_results = await tester.test_input_validation_security()
            all_results.extend(input_results)
            tester.results.extend(input_results)
            
            # Test 6: Data Exposure
            print("  Testing data exposure...")
            exposure_results = await tester.test_data_exposure_security()
            all_results.extend(exposure_results)
            tester.results.extend(exposure_results)
            
            # Generar reporte final
            security_report = tester.generate_security_report()
            
            print(f"\n🔐 Security Assessment Results:")
            print(f"   Total Tests: {security_report['summary']['total_tests']}")
            print(f"   Vulnerabilities Found: {security_report['summary']['vulnerabilities_found']}")
            print(f"   Security Score: {security_report['summary']['security_score']}/100")
            print(f"   Security Grade: {security_report['summary']['grade']}")
            
            print(f"\n📊 Severity Breakdown:")
            for severity, count in security_report['severity_breakdown'].items():
                if count > 0:
                    print(f"   {severity.upper()}: {count}")
            
            if security_report['vulnerabilities']:
                print(f"\n⚠️  Critical Issues Found:")
                for vuln in security_report['vulnerabilities']:
                    if vuln['severity'] in ['critical', 'high']:
                        print(f"   - {vuln['test_name']}: {vuln['description']}")
            
            print(f"\n💡 Top Recommendations:")
            for rec in security_report['recommendations']:
                print(f"   - {rec}")
            
            # Assertions de seguridad
            critical_vulns = security_report['summary']['vulnerabilities_found']
            security_score = security_report['summary']['security_score']
            
            # No debe haber vulnerabilidades críticas
            critical_count = security_report['severity_breakdown']['critical']
            assert critical_count == 0, \
                f"CRITICAL SECURITY ISSUE: {critical_count} critical vulnerabilities found"
            
            # Score de seguridad debe ser al menos 70
            assert security_score >= 70, \
                f"Security score too low: {security_score}/100. Must be at least 70."
            
            # No más de 3 vulnerabilidades de alta severidad
            high_count = security_report['severity_breakdown']['high']
            assert high_count <= 3, \
                f"Too many high-severity vulnerabilities: {high_count}. Maximum allowed: 3."
            
            print(f"\n✅ Security assessment completed successfully!")


if __name__ == "__main__":
    # Ejecutar security tests
    pytest.main([__file__, "-v", "-m", "security"])