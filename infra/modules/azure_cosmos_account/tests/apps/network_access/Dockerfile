# Dockerfile
FROM public.ecr.aws/docker/library/golang:tip-alpine3.22 AS build

WORKDIR /src
COPY go.mod .
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o app main.go

FROM gcr.io/distroless/base-debian12:nonroot

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD ["/app", "--health"] || exit 1

ENTRYPOINT ["/app"]
COPY --from=build /src/app /app

USER nonroot
