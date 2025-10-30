#!/usr/bin/env python3
"""
Historical Data Import Script
Script para importar datos históricos al sistema de operaciones
"""

import sys
import os
import pandas as pd
from pathlib import Path
from datetime import datetime
import logging

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.models.operations_models import (
    Provider, TourGroup, ProviderReservation,
    ServiceType, OperationalStatus, ClosureStatus,
    ReservationStatus, PaymentStatus
)
from backend.database import get_database_url

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class HistoricalDataImporter:
    """Import historical data from various sources"""
    
    def __init__(self):
        self.engine = create_engine(get_database_url())
        Session = sessionmaker(bind=self.engine)
        self.session = Session()
    
    def import_from_excel(self, file_path: str):
        """Import data from Excel file"""
        logger.info(f"Importing from Excel: {file_path}")
        
        try:
            # Read Excel file
            df = pd.read_excel(file_path, sheet_name='Reservas')
            
            logger.info(f"Found {len(df)} rows to import")
            
            imported = 0
            errors = 0
            
            for idx, row in df.iterrows():
                try:
                    # Import provider
                    provider = self._get_or_create_provider(row)
                    
                    # Import group
                    group = self._get_or_create_group(row)
                    
                    # Import reservation
                    reservation = self._create_reservation(row, provider.id, group.id)
                    
                    imported += 1
                    
                    if imported % 10 == 0:
                        logger.info(f"Imported {imported} records...")
                        
                except Exception as e:
                    logger.error(f"Error importing row {idx}: {str(e)}")
                    errors += 1
                    continue
            
            self.session.commit()
            logger.info(f"✓ Import complete: {imported} success, {errors} errors")
            
        except Exception as e:
            logger.error(f"Import failed: {str(e)}")
            self.session.rollback()
    
    def import_from_csv(self, file_path: str):
        """Import data from CSV file"""
        logger.info(f"Importing from CSV: {file_path}")
        # Similar to Excel import
        pass
    
    def _get_or_create_provider(self, row):
        """Get existing provider or create new one"""
        provider_name = row.get('proveedor', row.get('provider'))
        
        provider = self.session.query(Provider).filter(
            Provider.name == provider_name
        ).first()
        
        if not provider:
            provider = Provider(
                name=provider_name,
                provider_type=self._map_service_type(row.get('tipo_servicio')),
                email=row.get('email_proveedor', ''),
                phone=row.get('telefono_proveedor', ''),
                active=True
            )
            self.session.add(provider)
            self.session.flush()
        
        return provider
    
    def _get_or_create_group(self, row):
        """Get existing group or create new one"""
        group_code = row.get('codigo_grupo', row.get('group_code'))
        
        group = self.session.query(TourGroup).filter(
            TourGroup.code == group_code
        ).first()
        
        if not group:
            group = TourGroup(
                code=group_code,
                name=row.get('nombre_grupo', group_code),
                client_type='B2B',
                client_name=row.get('cliente', 'Desconocido'),
                start_date=pd.to_datetime(row.get('fecha_inicio')),
                end_date=pd.to_datetime(row.get('fecha_fin')),
                total_participants=int(row.get('participantes', 0)),
                operational_status=OperationalStatus.COMPLETED,
                closure_status=ClosureStatus.OPEN
            )
            self.session.add(group)
            self.session.flush()
        
        return group
    
    def _create_reservation(self, row, provider_id, group_id):
        """Create reservation from row data"""
        reservation = ProviderReservation(
            provider_id=provider_id,
            group_id=group_id,
            service_type=self._map_service_type(row.get('tipo_servicio')),
            confirmation_number=row.get('confirmacion'),
            service_date_start=pd.to_datetime(row.get('fecha_servicio_inicio')),
            service_date_end=pd.to_datetime(row.get('fecha_servicio_fin')),
            quantity=int(row.get('cantidad', 1)),
            unit_price=float(row.get('precio_unitario', 0)),
            total_price=float(row.get('precio_total', 0)),
            status=ReservationStatus.COMPLETED,
            payment_status=PaymentStatus.PAID
        )
        self.session.add(reservation)
        return reservation
    
    def _map_service_type(self, service_type_str):
        """Map string to ServiceType enum"""
        mapping = {
            'hotel': ServiceType.HOTEL,
            'transporte': ServiceType.TRANSPORT,
            'entrada': ServiceType.ENTRANCE,
            'guia': ServiceType.GUIDE,
            'restaurante': ServiceType.RESTAURANT,
        }
        return mapping.get(str(service_type_str).lower(), ServiceType.OTHER)

def main():
    """Main execution"""
    logger.info("=" * 60)
    logger.info("  HISTORICAL DATA IMPORT")
    logger.info("=" * 60)
    
    importer = HistoricalDataImporter()
    
    # Check for data files
    data_dir = Path("data/historical")
    
    if not data_dir.exists():
        logger.warning("No historical data directory found")
        logger.info("Create 'data/historical' directory and add your files")
        return
    
    # Import Excel files
    excel_files = list(data_dir.glob("*.xlsx"))
    for file in excel_files:
        importer.import_from_excel(str(file))
    
    # Import CSV files
    csv_files = list(data_dir.glob("*.csv"))
    for file in csv_files:
        importer.import_from_csv(str(file))
    
    logger.info("✓ Import process completed")

if __name__ == "__main__":
    main()