#!/usr/bin/env python3
"""
Herramienta completa de migración de datos para el sistema de contactos
Spirit Tours - Data Migration Tool v2.0
"""

import os
import sys
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import asyncio
import argparse
import logging
from typing import List, Dict, Optional, Tuple
import json
import hashlib
from pathlib import Path
import phonenumbers
from email_validator import validate_email, EmailNotValidError
from fuzzywuzzy import fuzz, process
import progressbar
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import colorama
from colorama import Fore, Back, Style
import warnings
warnings.filterwarnings('ignore')

# Agregar el path del proyecto
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.models.contacts_models import (
    Contact, ContactType, ContactSource, ContactVisibility,
    ContactDuplicateCandidate, ContactImport
)
from backend.services.contacts_service import ContactsService
from backend.database import Base, get_db

# Inicializar colorama
colorama.init(autoreset=True)

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(f'migration_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class DataMigrationTool:
    """
    Herramienta principal de migración de datos
    """
    
    def __init__(self, database_url: str = None):
        self.database_url = database_url or os.getenv('DATABASE_URL')
        self.engine = create_engine(self.database_url)
        self.Session = sessionmaker(bind=self.engine)
        self.stats = {
            'total_processed': 0,
            'imported': 0,
            'updated': 0,
            'duplicates': 0,
            'errors': 0,
            'quality_improved': 0
        }
        
    def print_header(self):
        """Imprimir header del programa"""
        print(Fore.CYAN + "="*80)
        print(Fore.CYAN + " "*20 + "SPIRIT TOURS - DATA MIGRATION TOOL v2.0")
        print(Fore.CYAN + " "*25 + "Sistema de Migración de Contactos")
        print(Fore.CYAN + "="*80)
        print()
        
    def analyze_source_data(self, file_path: str) -> Dict:
        """
        Analizar archivo fuente antes de migración
        """
        print(Fore.YELLOW + f"\n📊 Analizando archivo: {file_path}")
        
        # Detectar tipo de archivo
        file_ext = Path(file_path).suffix.lower()
        
        if file_ext == '.csv':
            df = pd.read_csv(file_path, encoding='utf-8-sig', error_bad_lines=False)
        elif file_ext in ['.xlsx', '.xls']:
            df = pd.read_excel(file_path)
        elif file_ext == '.json':
            df = pd.read_json(file_path)
        else:
            raise ValueError(f"Formato no soportado: {file_ext}")
        
        analysis = {
            'total_records': len(df),
            'columns': list(df.columns),
            'data_types': df.dtypes.to_dict(),
            'null_counts': df.isnull().sum().to_dict(),
            'duplicates': df.duplicated().sum(),
            'sample_data': df.head(5).to_dict('records')
        }
        
        # Análisis de calidad
        quality_score = self._calculate_data_quality(df)
        analysis['quality_score'] = quality_score
        
        # Detectar campos automáticamente
        analysis['detected_mapping'] = self._auto_detect_fields(df)
        
        # Mostrar resumen
        print(Fore.GREEN + f"✅ Total de registros: {analysis['total_records']}")
        print(Fore.GREEN + f"✅ Columnas detectadas: {len(analysis['columns'])}")
        print(Fore.YELLOW + f"⚠️  Duplicados encontrados: {analysis['duplicates']}")
        print(Fore.CYAN + f"📈 Calidad de datos: {quality_score:.1f}/100")
        
        return analysis
    
    def _calculate_data_quality(self, df: pd.DataFrame) -> float:
        """
        Calcular score de calidad de los datos
        """
        score = 100.0
        total_cells = len(df) * len(df.columns)
        
        # Penalizar por valores nulos
        null_cells = df.isnull().sum().sum()
        null_penalty = (null_cells / total_cells) * 30
        score -= null_penalty
        
        # Penalizar por duplicados
        duplicate_penalty = (df.duplicated().sum() / len(df)) * 20
        score -= duplicate_penalty
        
        # Verificar emails válidos si existe columna email
        email_cols = [col for col in df.columns if 'email' in col.lower()]
        if email_cols:
            invalid_emails = 0
            for col in email_cols:
                for email in df[col].dropna():
                    try:
                        validate_email(str(email))
                    except:
                        invalid_emails += 1
            email_penalty = (invalid_emails / len(df)) * 20
            score -= email_penalty
        
        # Verificar teléfonos válidos
        phone_cols = [col for col in df.columns if any(p in col.lower() for p in ['phone', 'tel', 'mobile', 'cel'])]
        if phone_cols:
            invalid_phones = 0
            for col in phone_cols:
                for phone in df[col].dropna():
                    try:
                        phonenumbers.parse(str(phone), 'PE')
                    except:
                        invalid_phones += 1
            phone_penalty = (invalid_phones / len(df)) * 10
            score -= phone_penalty
        
        return max(0, score)
    
    def _auto_detect_fields(self, df: pd.DataFrame) -> Dict[str, str]:
        """
        Auto-detectar mapeo de campos
        """
        mapping = {}
        
        # Patrones de detección
        patterns = {
            'first_name': ['first_name', 'nombre', 'fname', 'given_name', 'nombres', 'primer_nombre'],
            'last_name': ['last_name', 'apellido', 'lname', 'surname', 'apellidos', 'primer_apellido'],
            'email': ['email', 'correo', 'e-mail', 'mail', 'correo_electronico'],
            'phone': ['phone', 'telefono', 'tel', 'telephone', 'phone_number'],
            'mobile': ['mobile', 'celular', 'movil', 'cell', 'cel'],
            'company': ['company', 'empresa', 'organization', 'compania', 'organizacion'],
            'address': ['address', 'direccion', 'street', 'calle', 'domicilio'],
            'city': ['city', 'ciudad', 'town', 'localidad'],
            'country': ['country', 'pais', 'nation', 'país'],
            'birthdate': ['birthdate', 'birthday', 'fecha_nacimiento', 'cumpleanos'],
            'notes': ['notes', 'notas', 'comments', 'comentarios', 'observaciones']
        }
        
        for col in df.columns:
            col_lower = col.lower().strip()
            for field, patterns_list in patterns.items():
                if any(pattern in col_lower for pattern in patterns_list):
                    mapping[col] = field
                    break
        
        return mapping
    
    def migrate_from_file(
        self,
        file_path: str,
        mapping: Optional[Dict[str, str]] = None,
        check_duplicates: bool = True,
        auto_fix: bool = True,
        dry_run: bool = False
    ) -> Dict:
        """
        Migrar datos desde archivo
        """
        self.print_header()
        
        # Analizar datos fuente
        analysis = self.analyze_source_data(file_path)
        
        # Usar mapeo automático si no se proporciona
        if not mapping:
            mapping = analysis['detected_mapping']
            print(Fore.CYAN + "\n📝 Usando mapeo automático de campos:")
            for source, target in mapping.items():
                print(f"  {source} → {target}")
        
        # Confirmar migración
        if not dry_run:
            response = input(Fore.YELLOW + "\n¿Proceder con la migración? (s/n): ")
            if response.lower() != 's':
                print(Fore.RED + "Migración cancelada")
                return self.stats
        
        # Leer datos
        file_ext = Path(file_path).suffix.lower()
        if file_ext == '.csv':
            df = pd.read_csv(file_path, encoding='utf-8-sig', error_bad_lines=False)
        elif file_ext in ['.xlsx', '.xls']:
            df = pd.read_excel(file_path)
        else:
            df = pd.read_json(file_path)
        
        # Limpiar y normalizar datos si está habilitado
        if auto_fix:
            print(Fore.YELLOW + "\n🔧 Aplicando limpieza y normalización de datos...")
            df = self._clean_and_normalize_data(df, mapping)
        
        # Detectar y manejar duplicados
        if check_duplicates:
            print(Fore.YELLOW + "\n🔍 Detectando duplicados...")
            df = self._handle_duplicates(df, mapping)
        
        # Migrar datos
        print(Fore.CYAN + f"\n📤 Iniciando migración de {len(df)} registros...")
        
        if not dry_run:
            self._perform_migration(df, mapping)
        else:
            print(Fore.YELLOW + "🔍 Modo DRY RUN - No se realizarán cambios en la base de datos")
            self._simulate_migration(df, mapping)
        
        # Mostrar resumen
        self._print_summary()
        
        return self.stats
    
    def _clean_and_normalize_data(self, df: pd.DataFrame, mapping: Dict[str, str]) -> pd.DataFrame:
        """
        Limpiar y normalizar datos
        """
        # Barra de progreso
        widgets = [
            'Limpiando: ', progressbar.Percentage(), ' ',
            progressbar.Bar(), ' ', progressbar.ETA()
        ]
        pbar = progressbar.ProgressBar(widgets=widgets, maxval=len(df))
        pbar.start()
        
        for idx, row in df.iterrows():
            # Normalizar nombres
            for col, field in mapping.items():
                if field in ['first_name', 'last_name'] and col in row:
                    if pd.notna(row[col]):
                        # Capitalizar correctamente
                        df.at[idx, col] = str(row[col]).strip().title()
            
            # Limpiar emails
            for col, field in mapping.items():
                if field == 'email' and col in row:
                    if pd.notna(row[col]):
                        try:
                            valid = validate_email(str(row[col]).strip().lower())
                            df.at[idx, col] = valid.email
                        except:
                            df.at[idx, col] = None
                            self.stats['quality_improved'] += 1
            
            # Formatear teléfonos
            for col, field in mapping.items():
                if field in ['phone', 'mobile'] and col in row:
                    if pd.notna(row[col]):
                        try:
                            parsed = phonenumbers.parse(str(row[col]), 'PE')
                            if phonenumbers.is_valid_number(parsed):
                                df.at[idx, col] = phonenumbers.format_number(
                                    parsed, 
                                    phonenumbers.PhoneNumberFormat.E164
                                )
                            else:
                                df.at[idx, col] = None
                                self.stats['quality_improved'] += 1
                        except:
                            df.at[idx, col] = None
                            self.stats['quality_improved'] += 1
            
            # Limpiar espacios en blanco extras
            for col in df.columns:
                if df[col].dtype == 'object' and pd.notna(row[col]):
                    df.at[idx, col] = ' '.join(str(row[col]).split())
            
            pbar.update(idx + 1)
        
        pbar.finish()
        
        print(Fore.GREEN + f"✅ Datos limpiados. {self.stats['quality_improved']} correcciones aplicadas")
        
        return df
    
    def _handle_duplicates(self, df: pd.DataFrame, mapping: Dict[str, str]) -> pd.DataFrame:
        """
        Detectar y manejar duplicados
        """
        duplicates_found = []
        
        # Detectar por email
        email_cols = [col for col, field in mapping.items() if field == 'email']
        if email_cols:
            email_col = email_cols[0]
            email_duplicates = df[df.duplicated(subset=[email_col], keep=False)]
            if not email_duplicates.empty:
                duplicates_found.append(('email', len(email_duplicates)))
                print(Fore.YELLOW + f"  📧 {len(email_duplicates)} duplicados por email")
        
        # Detectar por teléfono
        phone_cols = [col for col, field in mapping.items() if field in ['phone', 'mobile']]
        if phone_cols:
            phone_col = phone_cols[0]
            phone_duplicates = df[df.duplicated(subset=[phone_col], keep=False)]
            if not phone_duplicates.empty:
                duplicates_found.append(('phone', len(phone_duplicates)))
                print(Fore.YELLOW + f"  📱 {len(phone_duplicates)} duplicados por teléfono")
        
        # Detectar por nombre similar
        name_cols = [col for col, field in mapping.items() if field in ['first_name', 'last_name']]
        if len(name_cols) >= 2:
            df['_temp_full_name'] = df[name_cols[0]].astype(str) + ' ' + df[name_cols[1]].astype(str)
            
            # Usar fuzzy matching para nombres similares
            names = df['_temp_full_name'].unique()
            similar_pairs = []
            
            for i, name1 in enumerate(names):
                for name2 in names[i+1:]:
                    if fuzz.ratio(name1.lower(), name2.lower()) > 85:
                        similar_pairs.append((name1, name2))
            
            if similar_pairs:
                print(Fore.YELLOW + f"  👥 {len(similar_pairs)} pares de nombres similares detectados")
            
            df.drop('_temp_full_name', axis=1, inplace=True)
        
        # Estrategia de manejo
        if duplicates_found:
            print(Fore.CYAN + "\nEstrategias de manejo de duplicados:")
            print("1. Mantener el primero")
            print("2. Mantener el último")
            print("3. Fusionar información (recomendado)")
            print("4. Mantener todos (marcar como candidatos)")
            
            strategy = input("Seleccione estrategia (1-4): ") or "3"
            
            if strategy == "1":
                df = df.drop_duplicates(keep='first')
            elif strategy == "2":
                df = df.drop_duplicates(keep='last')
            elif strategy == "3":
                # Fusionar información de duplicados
                df = self._merge_duplicate_records(df, mapping)
            # Si es 4, mantenemos todos
            
            self.stats['duplicates'] = sum(count for _, count in duplicates_found)
        
        return df
    
    def _merge_duplicate_records(self, df: pd.DataFrame, mapping: Dict[str, str]) -> pd.DataFrame:
        """
        Fusionar registros duplicados inteligentemente
        """
        print(Fore.CYAN + "🔀 Fusionando registros duplicados...")
        
        # Identificar columna clave (email preferentemente)
        key_cols = [col for col, field in mapping.items() if field == 'email']
        if not key_cols:
            key_cols = [col for col, field in mapping.items() if field in ['phone', 'mobile']]
        
        if key_cols:
            key_col = key_cols[0]
            
            # Agrupar por clave y fusionar
            def merge_group(group):
                if len(group) == 1:
                    return group.iloc[0]
                
                # Tomar el registro más completo
                merged = group.iloc[0].copy()
                
                for col in group.columns:
                    # Para cada columna, tomar el valor no nulo más reciente
                    non_null_values = group[col].dropna()
                    if not non_null_values.empty:
                        merged[col] = non_null_values.iloc[-1]
                
                return merged
            
            df = df.groupby(key_col, as_index=False).apply(merge_group)
        
        return df
    
    def _perform_migration(self, df: pd.DataFrame, mapping: Dict[str, str]):
        """
        Realizar migración real a la base de datos
        """
        session = self.Session()
        
        # Crear registro de importación
        import_record = ContactImport(
            source=ContactSource.CSV_IMPORT,
            imported_by='migration_tool',  # Usuario del sistema
            status='syncing',
            total_contacts=len(df),
            source_details={'file': 'migration', 'mapping': mapping}
        )
        session.add(import_record)
        session.commit()
        
        # Barra de progreso
        widgets = [
            'Migrando: ', progressbar.Percentage(), ' ',
            progressbar.Bar(), ' ', progressbar.ETA()
        ]
        pbar = progressbar.ProgressBar(widgets=widgets, maxval=len(df))
        pbar.start()
        
        for idx, row in df.iterrows():
            try:
                # Preparar datos del contacto
                contact_data = {}
                for source_col, target_field in mapping.items():
                    if source_col in row and pd.notna(row[source_col]):
                        contact_data[target_field] = row[source_col]
                
                # Agregar campos por defecto
                contact_data['type'] = ContactType.CUSTOMER
                contact_data['source'] = ContactSource.CSV_IMPORT
                contact_data['visibility'] = ContactVisibility.COMPANY
                
                # Verificar si ya existe
                existing = None
                if 'email' in contact_data:
                    existing = session.query(Contact).filter(
                        Contact.email == contact_data['email']
                    ).first()
                
                if existing:
                    # Actualizar existente
                    for key, value in contact_data.items():
                        if hasattr(existing, key) and value:
                            setattr(existing, key, value)
                    self.stats['updated'] += 1
                else:
                    # Crear nuevo
                    new_contact = Contact(**contact_data)
                    session.add(new_contact)
                    self.stats['imported'] += 1
                
                self.stats['total_processed'] += 1
                
                # Commit cada 100 registros
                if self.stats['total_processed'] % 100 == 0:
                    session.commit()
                
            except Exception as e:
                logger.error(f"Error en fila {idx}: {str(e)}")
                self.stats['errors'] += 1
                session.rollback()
            
            pbar.update(idx + 1)
        
        # Commit final
        session.commit()
        
        # Actualizar registro de importación
        import_record.status = 'completed'
        import_record.imported_contacts = self.stats['imported']
        import_record.updated_contacts = self.stats['updated']
        import_record.failed_contacts = self.stats['errors']
        import_record.duplicate_contacts = self.stats['duplicates']
        import_record.completed_at = datetime.utcnow()
        session.add(import_record)
        session.commit()
        
        session.close()
        pbar.finish()
    
    def _simulate_migration(self, df: pd.DataFrame, mapping: Dict[str, str]):
        """
        Simular migración sin cambios en BD (dry run)
        """
        print(Fore.CYAN + "\n🔍 Simulación de migración (DRY RUN)")
        
        for idx, row in df.iterrows():
            # Simular procesamiento
            contact_data = {}
            for source_col, target_field in mapping.items():
                if source_col in row and pd.notna(row[source_col]):
                    contact_data[target_field] = row[source_col]
            
            # Simular verificación de duplicados
            if 'email' in contact_data:
                # Simulamos que algunos ya existen
                if idx % 5 == 0:  # 20% ya existen
                    self.stats['updated'] += 1
                else:
                    self.stats['imported'] += 1
            else:
                self.stats['imported'] += 1
            
            self.stats['total_processed'] += 1
            
            # Mostrar muestra
            if idx < 5:
                print(f"  Muestra {idx+1}: {contact_data.get('first_name', '')} {contact_data.get('last_name', '')} - {contact_data.get('email', 'sin email')}")
    
    def _print_summary(self):
        """
        Imprimir resumen de la migración
        """
        print(Fore.CYAN + "\n" + "="*60)
        print(Fore.CYAN + " "*20 + "RESUMEN DE MIGRACIÓN")
        print(Fore.CYAN + "="*60)
        
        print(Fore.GREEN + f"✅ Total procesados: {self.stats['total_processed']}")
        print(Fore.GREEN + f"✅ Nuevos importados: {self.stats['imported']}")
        print(Fore.BLUE + f"🔄 Actualizados: {self.stats['updated']}")
        print(Fore.YELLOW + f"⚠️  Duplicados: {self.stats['duplicates']}")
        print(Fore.YELLOW + f"🔧 Datos corregidos: {self.stats['quality_improved']}")
        
        if self.stats['errors'] > 0:
            print(Fore.RED + f"❌ Errores: {self.stats['errors']}")
        
        # Tasa de éxito
        if self.stats['total_processed'] > 0:
            success_rate = ((self.stats['imported'] + self.stats['updated']) / self.stats['total_processed']) * 100
            print(Fore.CYAN + f"\n📈 Tasa de éxito: {success_rate:.1f}%")
    
    def verify_migration(self):
        """
        Verificar integridad de la migración
        """
        print(Fore.CYAN + "\n🔍 Verificando integridad de la migración...")
        
        session = self.Session()
        
        # Verificaciones
        checks = {
            'total_contacts': session.query(Contact).count(),
            'contacts_with_email': session.query(Contact).filter(Contact.email.isnot(None)).count(),
            'contacts_with_phone': session.query(Contact).filter(
                (Contact.phone.isnot(None)) | (Contact.mobile.isnot(None))
            ).count(),
            'verified_contacts': session.query(Contact).filter(Contact.is_verified == True).count(),
            'quality_score_avg': session.query(func.avg(Contact.quality_score)).scalar() or 0
        }
        
        # Mostrar resultados
        print(Fore.GREEN + f"✅ Total de contactos: {checks['total_contacts']}")
        print(Fore.GREEN + f"✅ Con email: {checks['contacts_with_email']} ({checks['contacts_with_email']/max(checks['total_contacts'],1)*100:.1f}%)")
        print(Fore.GREEN + f"✅ Con teléfono: {checks['contacts_with_phone']} ({checks['contacts_with_phone']/max(checks['total_contacts'],1)*100:.1f}%)")
        print(Fore.CYAN + f"📊 Score de calidad promedio: {checks['quality_score_avg']:.1f}/100")
        
        session.close()
        
        return checks
    
    def export_migration_report(self, output_path: str = None):
        """
        Exportar reporte detallado de la migración
        """
        if not output_path:
            output_path = f"migration_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.html"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Reporte de Migración - Spirit Tours</title>
            <style>
                body {{ font-family: Arial, sans-serif; margin: 20px; }}
                .header {{ background: #2196F3; color: white; padding: 20px; }}
                .stats {{ display: flex; justify-content: space-around; margin: 20px 0; }}
                .stat-box {{ border: 1px solid #ddd; padding: 15px; text-align: center; }}
                .success {{ color: #4CAF50; }}
                .warning {{ color: #FF9800; }}
                .error {{ color: #F44336; }}
                table {{ width: 100%; border-collapse: collapse; }}
                th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
                th {{ background-color: #f2f2f2; }}
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Reporte de Migración de Contactos</h1>
                <p>Fecha: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
            </div>
            
            <div class="stats">
                <div class="stat-box">
                    <h3>Total Procesados</h3>
                    <p class="success" style="font-size: 24px;">{self.stats['total_processed']}</p>
                </div>
                <div class="stat-box">
                    <h3>Importados</h3>
                    <p class="success" style="font-size: 24px;">{self.stats['imported']}</p>
                </div>
                <div class="stat-box">
                    <h3>Actualizados</h3>
                    <p style="font-size: 24px;">{self.stats['updated']}</p>
                </div>
                <div class="stat-box">
                    <h3>Errores</h3>
                    <p class="error" style="font-size: 24px;">{self.stats['errors']}</p>
                </div>
            </div>
            
            <h2>Detalles de la Migración</h2>
            <table>
                <tr>
                    <th>Métrica</th>
                    <th>Valor</th>
                    <th>Estado</th>
                </tr>
                <tr>
                    <td>Registros procesados</td>
                    <td>{self.stats['total_processed']}</td>
                    <td class="success">✅</td>
                </tr>
                <tr>
                    <td>Nuevos contactos</td>
                    <td>{self.stats['imported']}</td>
                    <td class="success">✅</td>
                </tr>
                <tr>
                    <td>Contactos actualizados</td>
                    <td>{self.stats['updated']}</td>
                    <td class="success">✅</td>
                </tr>
                <tr>
                    <td>Duplicados detectados</td>
                    <td>{self.stats['duplicates']}</td>
                    <td class="warning">⚠️</td>
                </tr>
                <tr>
                    <td>Datos corregidos</td>
                    <td>{self.stats['quality_improved']}</td>
                    <td class="success">✅</td>
                </tr>
                <tr>
                    <td>Errores</td>
                    <td>{self.stats['errors']}</td>
                    <td class="{'error' if self.stats['errors'] > 0 else 'success'}">
                        {'❌' if self.stats['errors'] > 0 else '✅'}
                    </td>
                </tr>
            </table>
            
            <h2>Verificación de Integridad</h2>
            <p>Ejecute verify_migration() para obtener estadísticas detalladas</p>
            
            <hr>
            <p><small>Spirit Tours - Sistema de Gestión de Contactos v2.0</small></p>
        </body>
        </html>
        """
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(html_content)
        
        print(Fore.GREEN + f"✅ Reporte exportado: {output_path}")
        
        return output_path


def main():
    """
    Función principal con CLI
    """
    parser = argparse.ArgumentParser(
        description='Spirit Tours - Herramienta de Migración de Contactos',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Ejemplos de uso:
  python data_migration_tool.py --analyze contacts.csv
  python data_migration_tool.py --migrate contacts.xlsx --auto-fix
  python data_migration_tool.py --migrate contacts.csv --dry-run
  python data_migration_tool.py --verify
        """
    )
    
    parser.add_argument('--analyze', metavar='FILE', help='Analizar archivo antes de migrar')
    parser.add_argument('--migrate', metavar='FILE', help='Migrar datos desde archivo')
    parser.add_argument('--verify', action='store_true', help='Verificar integridad de la migración')
    parser.add_argument('--auto-fix', action='store_true', help='Limpiar y normalizar datos automáticamente')
    parser.add_argument('--no-duplicates', action='store_true', help='No verificar duplicados')
    parser.add_argument('--dry-run', action='store_true', help='Simular migración sin cambios en BD')
    parser.add_argument('--mapping', metavar='JSON', help='Archivo JSON con mapeo de campos personalizado')
    parser.add_argument('--export-report', action='store_true', help='Exportar reporte HTML')
    parser.add_argument('--database-url', metavar='URL', help='URL de base de datos personalizada')
    
    args = parser.parse_args()
    
    # Inicializar herramienta
    tool = DataMigrationTool(database_url=args.database_url)
    
    # Ejecutar acción solicitada
    if args.analyze:
        analysis = tool.analyze_source_data(args.analyze)
        print(Fore.CYAN + "\n📋 Mapeo sugerido:")
        for source, target in analysis['detected_mapping'].items():
            print(f"  {source} → {target}")
    
    elif args.migrate:
        # Cargar mapeo personalizado si existe
        mapping = None
        if args.mapping:
            with open(args.mapping, 'r') as f:
                mapping = json.load(f)
        
        # Ejecutar migración
        stats = tool.migrate_from_file(
            args.migrate,
            mapping=mapping,
            check_duplicates=not args.no_duplicates,
            auto_fix=args.auto_fix,
            dry_run=args.dry_run
        )
        
        # Exportar reporte si se solicita
        if args.export_report:
            tool.export_migration_report()
    
    elif args.verify:
        tool.verify_migration()
    
    else:
        parser.print_help()


if __name__ == "__main__":
    main()