# ---------------------------------------------------------------------------
# ShopStack 后端服务通用 Dockerfile
# 通过构建参数 SERVICE 指定要构建的服务：
#   docker build --build-arg SERVICE=user-service -f backend/Dockerfile .
# ---------------------------------------------------------------------------

FROM golang:1.25-alpine AS builder

ARG SERVICE
ENV GOFLAGS=-mod=mod \
    GOPROXY=https://goproxy.cn,direct \
    CGO_ENABLED=0 \
    GOOS=linux

WORKDIR /build

# 先拷贝依赖清单，利用 Docker 层缓存
COPY go.mod go.sum ./
RUN go mod download

COPY gen/ ./gen/
COPY backend/ ./backend/

RUN test -n "${SERVICE}" || (echo "必须指定 SERVICE 构建参数" && exit 1) \
    && CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" \
       -o /build/bin/service ./backend/cmd/${SERVICE}

# ---------------------------------------------------------------------------

FROM alpine:3.20

ARG SERVICE

# 默认 Alpine CDN 在部分网络下不可达，这里做一次镜像回退：
# 先用官方源，失败则切到阿里云镜像再装。
RUN set -eux; \
    if ! apk add --no-cache ca-certificates tzdata wget; then \
        sed -i 's|https://dl-cdn.alpinelinux.org|https://mirrors.aliyun.com|g' /etc/apk/repositories; \
        apk add --no-cache ca-certificates tzdata wget; \
    fi; \
    cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime; \
    echo "Asia/Shanghai" > /etc/timezone

WORKDIR /app

RUN addgroup -S shopstack && adduser -S shopstack -G shopstack \
    && mkdir -p /app/configs && chown -R shopstack:shopstack /app

COPY --from=builder /build/bin/service /app/service
COPY --from=builder /build/backend/configs/ /app/configs/

USER shopstack

EXPOSE 9000

ENV SHOP_CONFIG=/app/configs/${SERVICE}.yaml

ENTRYPOINT ["/app/service"]
