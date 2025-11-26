# AWS S3 Setup Guide for HireFlux - Issue #53

**Purpose:** Complete setup guide for AWS S3 file storage infrastructure
**Date:** 2025-11-26
**Status:** Production-Ready Configuration

---

## Overview

This guide walks through setting up AWS S3 for secure file storage in HireFlux, including:
- S3 bucket creation with encryption
- IAM roles and policies
- CORS configuration
- Lifecycle policies
- Local testing setup

---

## Prerequisites

- AWS Account with admin access
- AWS CLI installed (`aws --version`)
- Python 3.12+ with boto3
- HireFlux backend environment

---

## Step 1: Install AWS CLI (if not already installed)

### macOS:
```bash
brew install awscli
```

### Linux:
```bash
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
```

### Windows:
Download from: https://awscli.amazonaws.com/AWSCLIV2.msi

---

## Step 2: Configure AWS Credentials

### Option A: AWS CLI Configuration (Recommended)
```bash
aws configure

# Enter when prompted:
AWS Access Key ID: YOUR_ACCESS_KEY
AWS Secret Access Key: YOUR_SECRET_KEY
Default region name: us-east-1
Default output format: json
```

### Option B: Environment Variables
```bash
export AWS_ACCESS_KEY_ID=your_access_key
export AWS_SECRET_ACCESS_KEY=your_secret_key
export AWS_DEFAULT_REGION=us-east-1
```

### Option C: IAM Roles (Production - EC2/ECS)
```bash
# Attach IAM role to EC2 instance with S3 permissions
# No credentials needed in code
```

---

## Step 3: Create S3 Bucket

### Using AWS CLI:
```bash
# Create bucket (bucket names must be globally unique)
aws s3api create-bucket \
  --bucket hireflux-documents-prod \
  --region us-east-1

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket hireflux-documents-prod \
  --versioning-configuration Status=Enabled

# Enable server-side encryption (AES-256)
aws s3api put-bucket-encryption \
  --bucket hireflux-documents-prod \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      },
      "BucketKeyEnabled": true
    }]
  }'

# Block public access (security best practice)
aws s3api put-public-access-block \
  --bucket hireflux-documents-prod \
  --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
```

### Using AWS Console:
1. Go to AWS S3 Console: https://s3.console.aws.amazon.com/
2. Click "Create bucket"
3. Bucket name: `hireflux-documents-prod`
4. Region: `us-east-1`
5. Enable "Bucket Versioning"
6. Enable "Default encryption" (AES-256)
7. Block all public access ✅
8. Create bucket

---

## Step 4: Configure CORS (for direct browser uploads)

```bash
# Save CORS configuration to cors.json
cat > cors.json <<'EOF'
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedOrigins": [
      "http://localhost:3000",
      "http://localhost:3001",
      "https://hireflux.com",
      "https://*.hireflux.com",
      "https://*.vercel.app"
    ],
    "ExposeHeaders": ["ETag", "x-amz-server-side-encryption"],
    "MaxAgeSeconds": 3000
  }
]
EOF

# Apply CORS configuration
aws s3api put-bucket-cors \
  --bucket hireflux-documents-prod \
  --cors-configuration file://cors.json
```

---

## Step 5: Create IAM Policy for Application Access

```bash
# Save policy to s3-policy.json
cat > s3-policy.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowS3ReadWrite",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket",
        "s3:GetObjectVersion",
        "s3:DeleteObjectVersion"
      ],
      "Resource": [
        "arn:aws:s3:::hireflux-documents-prod",
        "arn:aws:s3:::hireflux-documents-prod/*"
      ]
    },
    {
      "Sid": "AllowPresignedURLGeneration",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject"
      ],
      "Resource": "arn:aws:s3:::hireflux-documents-prod/*"
    }
  ]
}
EOF

# Create IAM policy
aws iam create-policy \
  --policy-name HireFlux-S3-Access-Policy \
  --policy-document file://s3-policy.json
```

---

## Step 6: Create IAM User for Application (Development/Staging)

```bash
# Create IAM user
aws iam create-user --user-name hireflux-s3-app

# Attach policy to user
aws iam attach-user-policy \
  --user-name hireflux-s3-app \
  --policy-arn arn:aws:iam::YOUR_ACCOUNT_ID:policy/HireFlux-S3-Access-Policy

# Create access key
aws iam create-access-key --user-name hireflux-s3-app

# Save the output:
# {
#   "AccessKey": {
#     "AccessKeyId": "AKIAIOSFODNN7EXAMPLE",
#     "SecretAccessKey": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
#     ...
#   }
# }
```

---

## Step 7: Configure Lifecycle Policies (Cost Optimization)

```bash
# Save lifecycle policy to lifecycle.json
cat > lifecycle.json <<'EOF'
{
  "Rules": [
    {
      "Id": "ArchiveOldDocuments",
      "Status": "Enabled",
      "Filter": {
        "Prefix": ""
      },
      "Transitions": [
        {
          "Days": 90,
          "StorageClass": "GLACIER"
        }
      ],
      "NoncurrentVersionTransitions": [
        {
          "NoncurrentDays": 30,
          "StorageClass": "GLACIER"
        }
      ]
    },
    {
      "Id": "DeleteExpiredDocuments",
      "Status": "Enabled",
      "Filter": {
        "Prefix": ""
      },
      "Expiration": {
        "Days": 730
      },
      "NoncurrentVersionExpiration": {
        "NoncurrentDays": 90
      }
    },
    {
      "Id": "DeleteIncompleteMultipartUploads",
      "Status": "Enabled",
      "Filter": {
        "Prefix": ""
      },
      "AbortIncompleteMultipartUpload": {
        "DaysAfterInitiation": 7
      }
    }
  ]
}
EOF

# Apply lifecycle policy
aws s3api put-bucket-lifecycle-configuration \
  --bucket hireflux-documents-prod \
  --lifecycle-configuration file://lifecycle.json
```

---

## Step 8: Enable S3 Access Logging (Audit Trail)

```bash
# Create logging bucket
aws s3api create-bucket \
  --bucket hireflux-s3-logs \
  --region us-east-1

# Enable logging on main bucket
aws s3api put-bucket-logging \
  --bucket hireflux-documents-prod \
  --bucket-logging-status '{
    "LoggingEnabled": {
      "TargetBucket": "hireflux-s3-logs",
      "TargetPrefix": "access-logs/"
    }
  }'
```

---

## Step 9: Update Backend Environment Variables

### Development (.env):
```bash
# Add to backend/.env
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_REGION=us-east-1
S3_BUCKET_NAME=hireflux-documents-prod
```

### Production (Vercel):
```bash
# Add via Vercel dashboard or CLI
vercel env add AWS_ACCESS_KEY_ID
vercel env add AWS_SECRET_ACCESS_KEY
vercel env add AWS_REGION
vercel env add S3_BUCKET_NAME

# Or use Vercel CLI:
echo "AKIAIOSFODNN7EXAMPLE" | vercel env add AWS_ACCESS_KEY_ID production
echo "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY" | vercel env add AWS_SECRET_ACCESS_KEY production
echo "us-east-1" | vercel env add AWS_REGION production
echo "hireflux-documents-prod" | vercel env add S3_BUCKET_NAME production
```

---

## Step 10: Test S3 Connectivity

### Python Script (test_s3.py):
```python
import boto3
from botocore.exceptions import ClientError

# Initialize S3 client
s3_client = boto3.client(
    's3',
    aws_access_key_id='YOUR_ACCESS_KEY',
    aws_secret_access_key='YOUR_SECRET_KEY',
    region_name='us-east-1'
)

bucket_name = 'hireflux-documents-prod'

# Test 1: List buckets
print("Test 1: Listing buckets...")
response = s3_client.list_buckets()
print(f"✅ Found {len(response['Buckets'])} buckets")

# Test 2: Upload test file
print("\nTest 2: Uploading test file...")
test_content = b"Hello from HireFlux!"
s3_client.put_object(
    Bucket=bucket_name,
    Key='test/hello.txt',
    Body=test_content,
    ServerSideEncryption='AES256'
)
print("✅ File uploaded successfully")

# Test 3: Generate pre-signed URL
print("\nTest 3: Generating pre-signed URL...")
url = s3_client.generate_presigned_url(
    'get_object',
    Params={'Bucket': bucket_name, 'Key': 'test/hello.txt'},
    ExpiresIn=3600
)
print(f"✅ Pre-signed URL: {url[:50]}...")

# Test 4: Download file
print("\nTest 4: Downloading file...")
response = s3_client.get_object(Bucket=bucket_name, Key='test/hello.txt')
content = response['Body'].read()
assert content == test_content
print("✅ File downloaded successfully")

# Test 5: Delete file
print("\nTest 5: Deleting file...")
s3_client.delete_object(Bucket=bucket_name, Key='test/hello.txt')
print("✅ File deleted successfully")

print("\n🎉 All S3 tests passed!")
```

### Run Test:
```bash
cd backend
python test_s3.py
```

---

## Step 11: Run Backend Unit Tests

```bash
cd backend

# Run S3 service tests
pytest tests/unit/test_s3_service.py -v

# Run integration tests
TESTING=False pytest tests/integration/test_file_storage_endpoints.py -v

# Run all file storage tests
pytest -k "s3 or file_storage" -v --cov=app/services/s3_service
```

---

## Step 12: CloudFront CDN Setup (Optional - Phase 3)

### For Public Assets (Company Logos):

```bash
# Create CloudFront distribution
aws cloudfront create-distribution \
  --distribution-config '{
    "CallerReference": "hireflux-cdn-'$(date +%s)'",
    "Comment": "HireFlux CDN for public assets",
    "Enabled": true,
    "Origins": {
      "Quantity": 1,
      "Items": [{
        "Id": "S3-hireflux-documents-prod",
        "DomainName": "hireflux-documents-prod.s3.amazonaws.com",
        "S3OriginConfig": {
          "OriginAccessIdentity": ""
        }
      }]
    },
    "DefaultCacheBehavior": {
      "TargetOriginId": "S3-hireflux-documents-prod",
      "ViewerProtocolPolicy": "redirect-to-https",
      "AllowedMethods": {
        "Quantity": 2,
        "Items": ["GET", "HEAD"]
      },
      "CachedMethods": {
        "Quantity": 2,
        "Items": ["GET", "HEAD"]
      },
      "ForwardedValues": {
        "QueryString": false,
        "Cookies": {"Forward": "none"}
      },
      "MinTTL": 0,
      "DefaultTTL": 86400,
      "MaxTTL": 31536000
    }
  }'
```

---

## Security Best Practices

### ✅ Implemented:
1. **Encryption at Rest:** AES-256 server-side encryption
2. **Encryption in Transit:** HTTPS only (pre-signed URLs)
3. **Access Control:** IAM policies with least privilege
4. **Public Access Blocked:** No public bucket access
5. **Versioning:** Enabled for recovery
6. **Logging:** Access logs for audit trail

### 🔐 Additional Recommendations:
1. **Rotate Access Keys:** Every 90 days
2. **Use IAM Roles:** In production (EC2/ECS/Lambda)
3. **Enable MFA Delete:** For critical buckets
4. **Monitor Access:** CloudWatch + AWS CloudTrail
5. **Implement Bucket Policies:** Additional access restrictions

---

## Cost Optimization

### Lifecycle Policy Benefits:
- **Day 0-90:** Standard storage ($0.023/GB/month)
- **Day 91-730:** Glacier ($0.004/GB/month) - 83% savings
- **Day 731+:** Deleted automatically

### Estimated Monthly Costs:
```
Assumptions:
- 10,000 users
- 5 files/user average (resumes, cover letters)
- 500KB average file size

Storage: 10,000 × 5 × 0.5MB = 25GB
Cost: 25GB × $0.023 = $0.58/month (first 90 days)

After lifecycle transition to Glacier:
Cost: 25GB × $0.004 = $0.10/month

Annual cost: ~$7.20 (very affordable!)
```

---

## Monitoring & Alerts

### CloudWatch Metrics:
```bash
# Monitor bucket size
aws cloudwatch get-metric-statistics \
  --namespace AWS/S3 \
  --metric-name BucketSizeBytes \
  --dimensions Name=BucketName,Value=hireflux-documents-prod \
  --start-time 2025-11-01T00:00:00Z \
  --end-time 2025-11-26T00:00:00Z \
  --period 86400 \
  --statistics Average
```

### CloudWatch Alarms:
```bash
# Alert if bucket size exceeds 100GB
aws cloudwatch put-metric-alarm \
  --alarm-name hireflux-s3-size-alert \
  --alarm-description "Alert when S3 bucket exceeds 100GB" \
  --metric-name BucketSizeBytes \
  --namespace AWS/S3 \
  --statistic Average \
  --period 86400 \
  --threshold 107374182400 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1
```

---

## Troubleshooting

### Issue: "Access Denied" errors

**Solution:**
```bash
# Check IAM policy
aws iam get-user-policy \
  --user-name hireflux-s3-app \
  --policy-name HireFlux-S3-Access-Policy

# Verify bucket permissions
aws s3api get-bucket-policy --bucket hireflux-documents-prod
```

### Issue: CORS errors in browser

**Solution:**
```bash
# Verify CORS configuration
aws s3api get-bucket-cors --bucket hireflux-documents-prod

# Update CORS if needed
aws s3api put-bucket-cors \
  --bucket hireflux-documents-prod \
  --cors-configuration file://cors.json
```

### Issue: Pre-signed URLs not working

**Solution:**
```python
# Check URL expiration
# Ensure system clock is accurate
# Verify IAM permissions for s3:GetObject and s3:PutObject
```

---

## Production Deployment Checklist

- [ ] S3 bucket created with encryption
- [ ] Versioning enabled
- [ ] CORS configured
- [ ] Lifecycle policies applied
- [ ] IAM user/role created with minimal permissions
- [ ] Access keys securely stored (AWS Secrets Manager or Vercel Env)
- [ ] Access logging enabled
- [ ] CloudWatch monitoring configured
- [ ] Backend .env updated
- [ ] Unit tests passing
- [ ] Integration tests passing
- [ ] E2E tests passing
- [ ] Staging deployment successful
- [ ] Production deployment planned

---

## Next Steps

1. Complete this setup guide
2. Run local tests with real S3 bucket
3. Deploy to Vercel staging
4. Run E2E tests against staging
5. Monitor for 24 hours
6. Production deployment

---

## References

- **AWS S3 Docs:** https://docs.aws.amazon.com/s3/
- **Boto3 Docs:** https://boto3.amazonaws.com/v1/documentation/api/latest/index.html
- **Pre-signed URLs:** https://docs.aws.amazon.com/AmazonS3/latest/userguide/PresignedUrlUploadObject.html
- **CORS Configuration:** https://docs.aws.amazon.com/AmazonS3/latest/userguide/cors.html

---

**Document Version:** 1.0
**Last Updated:** 2025-11-26
**Status:** Production-Ready

---

*Follow this guide step-by-step to complete Issue #53 S3 infrastructure setup*
