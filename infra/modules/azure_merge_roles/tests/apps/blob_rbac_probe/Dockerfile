# Dockerfile
FROM public.ecr.aws/docker/library/golang:1.26-alpine3.23@sha256:f85330846cde1e57ca9ec309382da3b8e6ae3ab943d2739500e08c86393a21b1 AS build

WORKDIR /src
COPY src/go.mod .
COPY src/go.sum .
RUN go mod download
COPY src/. .
RUN CGO_ENABLED=0 go build -o app main.go

FROM gcr.io/distroless/base-debian12:nonroot@sha256:956eee19d77039968b05209dce21e43c84fb2bae7644a2b0546b36996c96e305

USER nonroot
EXPOSE 8080
ENTRYPOINT ["/app"]
COPY --from=build /src/app /app
