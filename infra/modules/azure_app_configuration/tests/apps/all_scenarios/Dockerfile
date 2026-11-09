# Dockerfile
FROM public.ecr.aws/docker/library/golang:1.27-alpine3.23@sha256:5d5113301ffcac84e2bfb20c42648803fecaea6789c89bb9b66884e18cbb30a7 AS build

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
