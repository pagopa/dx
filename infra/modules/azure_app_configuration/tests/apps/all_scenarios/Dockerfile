# Dockerfile
FROM public.ecr.aws/docker/library/golang:1.23-alpine3.22 AS build

WORKDIR /src
COPY go.mod .
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o app main.go

# trivy:ignore:AVD-DS-0002
# trivy:ignore:AVD-DS-0026
FROM gcr.io/distroless/base-debian12:nonroot

USER nonroot
EXPOSE 8080
ENTRYPOINT ["/app"]
COPY --from=build /src/app /app
