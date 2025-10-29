# Dockerfile
FROM golang:tip-alpine3.22 AS build
WORKDIR /src
COPY go.mod .
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o app main.go

FROM gcr.io/distroless/base-debian12

EXPOSE 8080
USER nonroot:nonroot
ENTRYPOINT ["/app"]
COPY --from=build /src/app /app
