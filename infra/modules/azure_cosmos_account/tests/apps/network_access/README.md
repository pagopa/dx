# 'Network Access' scenario

This application exposes a simple HTTP endpoint at `/probe` on port `8080`, and pings the Azure Cosmos DB account passed as query string parameters. It is useful for end-to-end testing against the Cosmos DB Account Terraform module.

## HTTP Endpoint

- **Path**: `/probe`
- **Port**: `8080`
- **Method**: `GET`
- **Query Parameters**:
  - `endpoint` (required): Cosmos DB account name
  - `db` (required): Database name
  - `container` (required): Container name
- **Success Response**: `{"status":"ok"}` with HTTP 200
- **Failure Response**: `{"status":"fail","error":"<error message>"}` with HTTP 400

## Ping Operation

The ping operation includes:

- authentication to the Account using Managed Identity
- creation of a database
- creation of a container
- upsert of a sample item

If the underlying infrastructure has been properly set up, the application should respond with HTTP 200 OK.
