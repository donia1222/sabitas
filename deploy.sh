#\!/bin/bash

# Script de despliegue automático para archivos PHP
# Cargar variables del archivo .env
source .env

HOST="$SFTP_HOST"
USER="$SFTP_USER"
REMOTE_PATH="$SFTP_REMOTE_PATH"
LOCAL_PATH="./api"

echo "🚀 Iniciando despliegue de archivos PHP..."

# Verificar que la carpeta api existe
if [ \! -d "$LOCAL_PATH" ]; then
    echo "❌ Error: La carpeta $LOCAL_PATH no existe"
    exit 1
fi

# Subir archivos PHP via SFTP (excluyendo config.php)
echo "📤 Subiendo archivos PHP a $HOST... (excluyendo config.php)"

# Crear lista temporal de archivos a subir
cd api
for file in *.php; do
    if [ "$file" \!= "config.php" ]; then
        sftp -o StrictHostKeyChecking=no "$USER@$HOST" << SFTP_EOF
cd $REMOTE_PATH
put $file
bye
SFTP_EOF
    fi
done
cd ..

# Subir carpeta uploads si existe
if [ -d "api/uploads" ]; then
    sftp -o StrictHostKeyChecking=no "$USER@$HOST" << 'SFTP_EOF'
cd $REMOTE_PATH
put -r api/uploads
bye
SFTP_EOF
fi

echo "✅ Despliegue completado exitosamente\!"
echo "🌐 Archivos disponibles en: $NEXT_PUBLIC_API_BASE_URL"
echo "⚠️  config.php NO se actualizó (excluido)"
EOF < /dev/null