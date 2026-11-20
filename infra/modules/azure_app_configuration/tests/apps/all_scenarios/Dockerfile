# Dockerfile
FROM public.ecr.aws/docker/library/golang:1.27-alpine3.23@sha256:f70850ef6ce341e8b6427f677049145d63c0b7ce002d4d7e3d464828b1b96dcd AS build

WORKDIR /src
COPY src/go.mod .
COPY src/go.sum .
RUN go mod download
COPY src/. .
RUN CGO_ENABLED=0 go build -o app main.go

# trivy:ignore:AVD-DS-0002
# trivy:ignore:AVD-DS-0026
FROM gcr.io/distroless/static-debian12:nonroot@sha256:afa5c872c891853ca7fcf1f12c3edb23f7eeef36189728842dd51042ff57f7ab

USER nonroot
EXPOSE 8080
ENTRYPOINT ["/app"]
COPY --from=build /src/app /app
