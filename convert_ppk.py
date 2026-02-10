#!/usr/bin/env python3
"""Convert PuTTY PPK key to OpenSSH format"""
import os

ppk_path = r"C:\Users\markus.zubenko\OneDrive - WTG.com\Privat\ubuntu Server\SSH_Key.ppk"
output_path = r"C:\Users\markus.zubenko\.ssh\id_rsa"

try:
    from cryptography.hazmat.primitives import serialization
    from cryptography.hazmat.backends import default_backend
    import paramiko
    
    # Load PPK key using paramiko
    key = paramiko.RSAKey.from_private_key_file(ppk_path)
    
    # Export to OpenSSH format
    key_pem = key.key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.OpenSSH,
        encryption_algorithm=serialization.NoEncryption()
    )
    
    # Write to file
    with open(output_path, 'wb') as f:
        f.write(key_pem)
    
    # Set correct permissions (read/write for owner only)
    os.chmod(output_path, 0o600)
    
    print("✓ Key erfolgreich konvertiert!")
    print(f"Gespeichert unter: {output_path}")
    
except ImportError as e:
    print(f"× Fehlende Python-Bibliothek: {e}")
    print("\nInstalliere mit: pip install paramiko cryptography")
except Exception as e:
    print(f"× Fehler: {e}")
    print("\nAlternativ nutze PuTTYgen GUI:")
    print("Conversions → Export OpenSSH key")
