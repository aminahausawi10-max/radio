import os
import zipfile

desktop = os.path.join(os.environ.get('USERPROFILE', r'C:\Users\Ameeynerh'), 'Desktop')
zip_path = os.path.join(desktop, 'arab-hausa-website.zip')
root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

items = ['index.php', '.htaccess', 'public', 'api-php', 'data']

if os.path.exists(zip_path):
    try:
        os.remove(zip_path)
    except Exception:
        pass

with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as z:
    for item in items:
        full_path = os.path.join(root_dir, item)
        if os.path.isfile(full_path):
            z.write(full_path, item)
        elif os.path.isdir(full_path):
            for root, dirs, files in os.walk(full_path):
                for f in files:
                    file_full = os.path.join(root, f)
                    rel_path = os.path.relpath(file_full, root_dir)
                    # Crucial for Linux / DirectAdmin / cPanel: Must use forward slashes!
                    norm_path = rel_path.replace('\\', '/')
                    z.write(file_full, norm_path)

size_mb = os.path.getsize(zip_path) / (1024 * 1024)
print(f"READY: {zip_path} ({size_mb:.2f} MB)")
