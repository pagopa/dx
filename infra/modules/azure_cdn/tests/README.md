# Azure CDN Module Tests

This directory contains test files for the Azure CDN module using the Terraform test framework.

## Running Tests

To run all tests:

```bash
cd ../
terraform test
```

## Test Files

- `basic.tftest.hcl` - Tests the basic functionality of the CDN module with a single origin
- `complete.tftest.hcl` - Tests more advanced features including multiple origins and delivery rules