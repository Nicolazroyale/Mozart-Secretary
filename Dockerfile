# ---- Stage de compilación (Go + CGO para SQLCipher) ----
FROM golang:1.27-trixie AS build
WORKDIR /src
RUN apt-get update \
    && apt-get install -y --no-install-recommends gcc libssl-dev \
    && rm -rf /var/lib/apt/lists/*
COPY go.mod go.sum ./
RUN go mod download
COPY . .
ENV CGO_ENABLED=1
RUN go build -trimpath -ldflags="-s -w" -o /out/mozart .

# ---- Imagen final (Debian trixie + libcrypto para SQLCipher + OCR) ----
FROM debian:trixie-slim
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       ca-certificates libssl3t64 \
       tesseract-ocr tesseract-ocr-spa poppler-utils wget \
    && tesseract --list-langs 2>/dev/null | grep -q spa \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /srv
COPY --from=build /out/mozart /usr/local/bin/mozart
COPY web /srv/web
COPY web/templates /srv/templates
ENV WEB_ROOT=/srv/web \
    TEMPLATES_DIR=/srv/templates \
    DATA_DIR=/data \
    PORT=443
EXPOSE 443
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- --no-check-certificate https://127.0.0.1:443/healthz >/dev/null 2>&1 || exit 1
ENTRYPOINT ["/usr/local/bin/mozart"]