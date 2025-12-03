# SSM Parameter Store Integration

This utility provides functionality to retrieve secure parameters from AWS Systems Manager (SSM) Parameter Store.

## Usage

### Environment Variables

The GitHub client secret can be configured in two ways:

1. **Direct environment variable** (for local development):

   ```bash
   export GITHUB_CLIENT_SECRET="your-secret-here"
   ```

2. **AWS SSM Parameter Store** (recommended for production):
   ```bash
   export GITHUB_CLIENT_SECRET_SSM_PARAM="/path/to/github/client-secret"
   ```

When `GITHUB_CLIENT_SECRET_SSM_PARAM` is set, the application will automatically retrieve the secret from AWS SSM Parameter Store instead of using the direct environment variable.

### AWS Credentials

The SSM client uses the standard AWS SDK credential chain. Ensure your environment has appropriate AWS credentials configured:

- IAM role (recommended for ECS/EC2)
- Environment variables (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`)
- AWS credentials file (`~/.aws/credentials`)
- ECS task role
- EC2 instance profile

### Required IAM Permissions

The application needs the following IAM permissions to retrieve parameters:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["ssm:GetParameter"],
      "Resource": "arn:aws:ssm:REGION:ACCOUNT_ID:parameter/path/to/github/client-secret"
    },
    {
      "Effect": "Allow",
      "Action": ["kms:Decrypt"],
      "Resource": "arn:aws:kms:REGION:ACCOUNT_ID:key/KMS_KEY_ID"
    }
  ]
}
```

Note: The KMS permission is only required if the parameter is encrypted with a custom KMS key.

## API

### `getSecureParameter(parameterName: string, region?: string): Promise<string>`

Retrieves a secure string parameter from AWS SSM Parameter Store.

**Parameters:**

- `parameterName` - The name of the SSM parameter to retrieve (e.g., `/github/client-secret`)
- `region` - (Optional) AWS region. Defaults to `AWS_REGION` environment variable or `eu-central-1`

**Returns:**

- Promise that resolves to the decrypted parameter value

**Throws:**

- Error if the parameter cannot be retrieved or is not found

**Example:**

```typescript
import { getSecureParameter } from "./utils/ssm.js";

const secret = await getSecureParameter("/github/client-secret");
console.log("Retrieved secret:", secret);
```

## Testing

Run the tests:

```bash
pnpm vitest run src/utils/__tests__/ssm.test.ts
```

## Security Best Practices

1. **Use SecureString parameters**: Always create SSM parameters with type `SecureString` to ensure encryption at rest
2. **Limit IAM permissions**: Grant only the minimum required permissions to retrieve specific parameters
3. **Use KMS encryption**: Consider using custom KMS keys for additional security and audit capabilities
4. **Rotate secrets regularly**: Implement a secret rotation strategy
5. **Monitor access**: Enable CloudTrail logging for SSM parameter access
