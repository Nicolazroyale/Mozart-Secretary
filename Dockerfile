# ---- Stage de compilación (con CGO + OpenSSL para SQLCipher) ----
FROM golang:1.27-bookworm AS build
WORKDIR /src
RUN apt-get update \
    && apt-get install -y --no-install-recommends gcc libssl-dev \
    && rm -rf /var/lib/apt/lists/*
COPY go.mod go.sum ./
RUN go mod download
COPY . .
ENV CGO_ENABLED=1
RUN go build -trimpath -ldflags="-s -w" -o /out/mozart .

# ---- Imagen final (glibc + libcrypto para SQLCipher) ----
FROM debian:bookworm-slim
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates libssl3 \
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
ENTRYPOINT ["/usr/local/bin/mozart"]