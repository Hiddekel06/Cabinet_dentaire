#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script de nettoyage du CSV dental_acts.csv existant
Génère un fichier Excel structuré avec codes uniques
"""

import pandas as pd
import re
from pathlib import Path

# Chemins
CSV_PATH = Path("database/seeders/data/dental_acts.csv")
OUTPUT_EXCEL = Path("database/seeders/data/dental_acts_final.xlsx")

def clean_csv_data(csv_path):
    """Nettoie et structure les données du CSV"""
    print(f"📄 Lecture du CSV: {csv_path}")
    
    # Lire le CSV avec gestion des erreurs
    df = pd.read_csv(csv_path, on_bad_lines='skip', encoding='utf-8', engine='python')
    print(f"  ✓ {len(df)} lignes chargées")
    
    # Supprimer les lignes vides ou invalides
    df = df.dropna(subset=['name'], how='all')
    df = df[df['name'].notna()]
    df = df[df['name'].str.strip() != '']
    
    # Nettoyer les données
    df['name'] = df['name'].str.strip()
    df['category'] = df['category'].fillna('Non catégorisé').str.strip()
    df['code'] = df['code'].fillna('').str.strip()
    df['tarif'] = df['tarif'].fillna(0)
    df['description'] = df['description'].fillna('').str.strip()
    
    # Convertir tarif en int
    def safe_int(val):
        try:
            return int(float(val))
        except:
            return 0
    
    df['tarif'] = df['tarif'].apply(safe_int)
    
    # Supprimer lignes qui sont juste des codes sans nom
    df = df[~df['name'].str.match(r'^D\d+\s+\d', na=False)]
    df = df[~df['name'].str.match(r'^\d+$', na=False)]
    
    # Supprimer lignes qui contiennent "Tarif des actes"
    df = df[~df['name'].str.contains('Tarif des actes', na=False)]
    
    # Supprimer doublons
    df = df.drop_duplicates(subset=['name', 'tarif'], keep='first')
    
    print(f"  ✓ {len(df)} actes valides après nettoyage")
    
    return df

def add_unique_codes(df):
    """Ajoute des codes uniques auto-incrémentés"""
    print("\n🔢 Génération des codes uniques...")
    
    # Créer codes uniques 001, 002, 003...
    df = df.reset_index(drop=True)
    df.insert(0, 'code_unique', [f"{i+1:03d}" for i in range(len(df))])
    
    # Renommer colonne code en tarif_level
    df = df.rename(columns={'code': 'tarif_level'})
    
    # Réorganiser colonnes
    columns_order = ['code_unique', 'name', 'category', 'tarif_level', 'tarif', 'description']
    df = df[columns_order]
    
    print(f"  ✓ Codes générés de 001 à {len(df):03d}")
    
    return df

def export_to_excel(df, output_path):
    """Exporte vers Excel avec formatage"""
    print(f"\n📊 Création du fichier Excel: {output_path}")
    
    with pd.ExcelWriter(output_path, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Actes Dentaires')
        
        # Accéder à la feuille pour formatage
        worksheet = writer.sheets['Actes Dentaires']
        
        # Style en-tête
        from openpyxl.styles import Font, PatternFill, Alignment
        
        header_fill = PatternFill(start_color="4472C4", end_color="4472C4", fill_type="solid")
        header_font = Font(bold=True, color="FFFFFF")
        
        for cell in worksheet[1]:
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = Alignment(horizontal='center', vertical='center')
        
        # Auto-dimensionner colonnes
        for column in worksheet.columns:
            max_length = 0
            column_letter = column[0].column_letter
            for cell in column:
                try:
                    if len(str(cell.value)) > max_length:
                        max_length = len(str(cell.value))
                except:
                    pass
            adjusted_width = min(max_length + 2, 60)
            worksheet.column_dimensions[column_letter].width = adjusted_width
        
        # Figer première ligne
        worksheet.freeze_panes = 'A2'
    
    print(f"✅ Fichier Excel créé avec succès!")
    print(f"   {len(df)} actes exportés")
    
    return df

def main():
    """Fonction principale"""
    print("=" * 60)
    print("🦷 Nettoyage et Structuration des Actes Dentaires")
    print("=" * 60)
    
    # Vérifier CSV existe
    if not CSV_PATH.exists():
        print(f"❌ Erreur: Le fichier CSV n'existe pas: {CSV_PATH}")
        return
    
    # Nettoyer CSV
    df = clean_csv_data(CSV_PATH)
    
    if df.empty:
        print("⚠️ Aucun acte valide trouvé dans le CSV.")
        return
    
    # Ajouter codes uniques
    df = add_unique_codes(df)
    
    # Exporter vers Excel
    df = export_to_excel(df, OUTPUT_EXCEL)
    
    # Afficher aperçu
    print("\n📋 Aperçu des premiers actes:")
    print(df.head(15).to_string(index=False))
    
    # Statistiques
    print("\n📈 Statistiques:")
    print(f"  • Total actes: {len(df)}")
    print(f"  • Catégories: {df['category'].nunique()}")
    print(f"  • Avec tarif: {len(df[df['tarif'] > 0])}")
    print(f"  • Sur devis: {len(df[df['tarif'] == 0])}")
    
    print("\n" + "=" * 60)
    print(f"✅ Terminé! Fichier disponible: {OUTPUT_EXCEL}")
    print("=" * 60)

if __name__ == "__main__":
    main()
