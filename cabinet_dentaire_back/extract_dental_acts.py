#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script d'extraction des actes dentaires depuis le PDF
Génère un fichier Excel structuré avec codes uniques
"""

import pdfplumber
import pandas as pd
import re
from pathlib import Path

# Chemin du PDF source
PDF_PATH = Path("database/seeders/data/Tarif des actes professionnels dentaires 1999.pdf")
OUTPUT_EXCEL = Path("database/seeders/data/dental_acts_final.xlsx")

def extract_text_from_pdf(pdf_path):
    """Extrait tout le texte du PDF"""
    print(f"📄 Lecture du PDF: {pdf_path}")
    
    all_text = []
    with pdfplumber.open(pdf_path) as pdf:
        for i, page in enumerate(pdf.pages, 1):
            text = page.extract_text()
            if text:
                all_text.append(text)
                print(f"  ✓ Page {i} extraite")
    
    return "\n".join(all_text)

def parse_dental_acts(text):
    """Parse le texte pour extraire les actes dentaires"""
    print("\n🔍 Analyse et extraction des actes...")
    
    acts = []
    current_section = ""
    current_category = ""
    code_counter = 1
    
    lines = text.split('\n')
    
    # Patterns de reconnaissance
    section_pattern = re.compile(r'^([IVX]+)\s*-\s*(.+)$')
    tarif_pattern = re.compile(r'(D\d+|Forfait|Sur devis)\s+(\d+\s*\d*)')
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
        
        # Détecter les sections (I -, II -, III -, etc.)
        section_match = section_pattern.match(line)
        if section_match:
            current_section = section_match.group(1)
            current_category = section_match.group(2).strip()
            print(f"  📂 Section détectée: {current_section} - {current_category}")
            continue
        
        # Détecter les actes avec tarifs
        # Format: "Nom de l'acte D5 6 000" ou "Nom D10 12000"
        tarif_match = tarif_pattern.search(line)
        if tarif_match:
            tarif_code = tarif_match.group(1)
            tarif_amount = tarif_match.group(2).replace(' ', '')
            
            # Extraire le nom de l'acte (tout avant le code tarif)
            name = line[:tarif_match.start()].strip()
            
            if name:
                acts.append({
                    'code': f"{code_counter:03d}",
                    'name': name,
                    'section': current_section,
                    'category': current_category,
                    'tarif_level': tarif_code,
                    'tarif': int(tarif_amount) if tarif_amount.isdigit() else 0,
                    'description': f"{current_category} - {name}"
                })
                code_counter += 1
        
        # Détecter "Sur devis"
        elif 'Sur devis' in line or 'sur devis' in line.lower():
            name = line.replace('Sur devis', '').replace('sur devis', '').strip()
            if name and len(name) > 3:
                acts.append({
                    'code': f"{code_counter:03d}",
                    'name': name,
                    'section': current_section,
                    'category': current_category,
                    'tarif_level': 'Sur devis',
                    'tarif': 0,
                    'description': f"{current_category} - {name} (Sur devis)"
                })
                code_counter += 1
    
    print(f"\n✅ {len(acts)} actes extraits")
    return acts

def clean_and_export(acts, output_path):
    """Nettoie les données et exporte vers Excel"""
    print(f"\n📊 Création du fichier Excel: {output_path}")
    
    df = pd.DataFrame(acts)
    
    # Nettoyer les données
    df['name'] = df['name'].str.strip()
    df['category'] = df['category'].str.strip()
    df['tarif'] = df['tarif'].fillna(0).astype(int)
    
    # Supprimer les doublons
    df = df.drop_duplicates(subset=['name', 'tarif'], keep='first')
    
    # Trier par section et code
    df = df.sort_values(['section', 'code']).reset_index(drop=True)
    
    # Re-numéroter les codes
    df['code'] = [f"{i+1:03d}" for i in range(len(df))]
    
    # Exporter vers Excel avec formatage
    with pd.ExcelWriter(output_path, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Actes Dentaires')
        
        # Accéder à la feuille pour formatage
        worksheet = writer.sheets['Actes Dentaires']
        
        # Auto-dimensionner les colonnes
        for column in worksheet.columns:
            max_length = 0
            column_letter = column[0].column_letter
            for cell in column:
                try:
                    if len(str(cell.value)) > max_length:
                        max_length = len(str(cell.value))
                except:
                    pass
            adjusted_width = min(max_length + 2, 50)
            worksheet.column_dimensions[column_letter].width = adjusted_width
    
    print(f"✅ Fichier Excel créé avec succès!")
    print(f"   {len(df)} actes exportés")
    print(f"   Colonnes: {', '.join(df.columns.tolist())}")
    
    return df

def main():
    """Fonction principale"""
    print("=" * 60)
    print("🦷 Extraction des Actes Dentaires depuis PDF")
    print("=" * 60)
    
    # Vérifier que le PDF existe
    if not PDF_PATH.exists():
        print(f"❌ Erreur: Le fichier PDF n'existe pas: {PDF_PATH}")
        return
    
    # Extraire le texte
    text = extract_text_from_pdf(PDF_PATH)
    
    # Parser les actes
    acts = parse_dental_acts(text)
    
    if not acts:
        print("⚠️ Aucun acte n'a été extrait. Vérifiez le format du PDF.")
        return
    
    # Exporter vers Excel
    df = clean_and_export(acts, OUTPUT_EXCEL)
    
    # Afficher quelques exemples
    print("\n📋 Aperçu des premiers actes:")
    print(df.head(10).to_string(index=False))
    
    print("\n" + "=" * 60)
    print(f"✅ Terminé! Fichier disponible: {OUTPUT_EXCEL}")
    print("=" * 60)

if __name__ == "__main__":
    main()
