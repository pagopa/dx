# Dockerfile
FROM public.ecr.aws/docker/library/golang:1.24.3-alpine3.22 AS build

WORKDIR /src
COPY src/go.mod .
COPY src/go.sum .
RUN go mod download
COPY src/. .
RUN CGO_ENABLED=0 go build -o app main.go

FROM gcr.io/distroless/base-debian12:nonroot

USER nonroot
EXPOSE 8080
ENTRYPOINT ["/app"]
COPY --from=build /src/app /app