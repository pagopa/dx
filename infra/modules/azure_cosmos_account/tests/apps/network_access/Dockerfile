# Dockerfile
FROM public.ecr.aws/docker/library/golang:tip-alpine3.22@sha256:4c8df991d0fa849da9083c45de566a9e25019d713a33bc0b055c88e3f54a4c03 AS build

WORKDIR /src
COPY src/go.mod .
COPY src/go.sum .
RUN go mod download
COPY src/. .
RUN CGO_ENABLED=0 go build -o app main.go

FROM gcr.io/distroless/base-debian12:nonroot@sha256:7f0c72cd138b442ae0deeb69c08b1acf5525439ba251a49ad93c320a061567e5

EXPOSE 8080
ENTRYPOINT ["/app"]
COPY --from=build /src/app /app
