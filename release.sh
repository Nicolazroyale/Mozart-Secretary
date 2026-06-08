#!/bin/bash

# Colores para la consola
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar que estamos en un repositorio git
if [ ! -d .git ]; then
    echo -e "${RED}Error: No estás en un repositorio git!${NC}"
    exit 1
fi

# Pedir versión al usuario
echo -e "${YELLOW}Ingrese la versión del release (ej: v1.0.0):${NC}"
read -r VERSION

# Verificar que la versión no está vacía
if [ -z "$VERSION" ]; then
    echo -e "${RED}Error: La versión no puede estar vacía!${NC}"
    exit 1
fi

# Verificar que el tag no exista ya
if git rev-parse "$VERSION" >/dev/null 2>&1; then
    echo -e "${RED}Error: El tag $VERSION ya existe!${NC}"
    exit 1
fi

# Pedir mensaje del tag
echo -e "${YELLOW}Ingrese un mensaje para el release:${NC}"
read -r MESSAGE

# Si el mensaje está vacío, usar uno por defecto
if [ -z "$MESSAGE" ]; then
    MESSAGE="Release $VERSION"
fi

# Crear el tag
echo -e "${GREEN}Creando tag $VERSION...${NC}"
git tag -a "$VERSION" -m "$MESSAGE"

# Push del tag a GitHub
echo -e "${GREEN}Subiendo tag $VERSION a GitHub...${NC}"
git push origin "$VERSION"

echo -e "${GREEN}✅ Release $VERSION creado y subido con éxito!${NC}"
echo -e "${YELLOW}Ahora puedes crear el release en GitHub visitando: https://github.com/Nicolazroyale/Mozart-V1/releases/new?tag=$VERSION${NC}"
