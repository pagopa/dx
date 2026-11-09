# Dockerfile
FROM public.ecr.aws/docker/library/golang:1.27-alpine3.23@sha256:5d5113301ffcac84e2bfb20c42648803fecaea6789c89bb9b66884e18cbb30a7 AS build

WORKDIR /src
COPY src/go.mod .
COPY src/go.sum .
RUN go mod download
COPY src/. .
RUN CGO_ENABLED=0 go build -o app main.go

FROM gcr.io/distroless/base-debian12:nonroot@sha256:7f0c72cd138b442ae0deeb69c08b1acf5525439ba251a49ad93c320a061567e5

USER nonroot
EXPOSE 8080
ENTRYPOINT ["/app"]
COPY --from=build /src/app /app
